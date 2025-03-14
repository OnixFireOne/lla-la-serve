import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PoolMonitoring } from '../entitys/pool-monitoring.entity';
import { PoolData } from '../intefaces/pool-data.interface';
import { DlmmApiService } from '../dlmm-api/dlmm-api.service';
import { SetService } from '../set-service/set-service.service';
import { TelegramService } from '../../telegram/telegram.service';
import { SolPriceService } from './sol-Price.service';
import { PoolState } from '../entitys/pool-state.entity';


@Injectable()
export class PoolAnalyzerService {
  private readonly logger = new Logger(PoolAnalyzerService.name);

  constructor(
    @InjectRepository(PoolMonitoring)
    private poolRepo: Repository<PoolMonitoring>,
    @InjectRepository(PoolState)
    private poolStateRepo: Repository<PoolState>,
    private readonly _dlmmApiService: DlmmApiService,
    private readonly _setService: SetService,
    private readonly _telegramService: TelegramService,
    private readonly _solPriceService: SolPriceService
  ) {}

  async selectPoolToMonitor(pools: PoolData[]): Promise<PoolData | null> {
    const now = new Date();

    if (pools.length === 0) {
      this.logger.warn('Нет пулов с данными за последние 60 secant.');
      return null;
    }

    pools = await this.removeExistingFromArrayAsync(pools, this.poolRepo, 'pool_address', 'address');
    //console.log('poolsf:', pools);
    if (pools.length === 0) {
      this.logger.warn('Нет новых пулов за последние 60 secant.');
      return null;
    }

    const bestPool = pools.reduce((max, pool) =>
      pool.fee_tvl_ratio.min_30 > max.fee_tvl_ratio.min_30 ? pool : max,
    );

    const currentPositionUSD = await this._solPriceService.convertSolToUSD(
      bestPool.current_price,
    );

    await this._telegramService.sendMessage(`📌 Pool IN: ${bestPool.name}\nPrice: $${currentPositionUSD}`);
    this.logger.log(`Выбран пул для мониторинга: ${bestPool.name}, ${bestPool.address}`);

    const monitoringEntry = new PoolMonitoring();

    monitoringEntry.name = bestPool.name;
    monitoringEntry.pool_address = bestPool.address;
    monitoringEntry.initial_liquidity = +bestPool.liquidity;
    monitoringEntry.initial_fee_ratio = bestPool.fee_tvl_ratio.min_30;
    monitoringEntry.initial_volume = bestPool.volume.hour_24;
    monitoringEntry.initial_position_usd = currentPositionUSD;
    monitoringEntry.initial_cumulative_fee = +bestPool.cumulative_fee_volume;
    monitoringEntry.pool_data = bestPool;
    monitoringEntry.entry_time = now;
    monitoringEntry.active = true;

    await this.poolRepo.save(monitoringEntry);

    return bestPool;
  }

  //@Cron('*/20 * * * * *') // запуск каждые 10 секунд
  async monitorActivePools() {
    const activePools = await this.poolRepo.find({ where: { active: true } });

    for (const monitoringEntry of activePools) {
      const currentPoolData = await this._dlmmApiService.getPoolInfo(
        monitoringEntry.pool_address,
      );
      currentPoolData.current_price = await this._solPriceService.convertSolToUSD(
        currentPoolData.current_price,
      );

      // Расчет динамической комиссии
      // const feesEarnedUSD =
      //   (+currentPoolData.cumulative_fee_volume -
      //     monitoringEntry.initial_cumulative_fee) *
      //   currentPoolData.current_price;

      // Проверка изменения позиции
      const solPrice = await this._solPriceService.convertSolToUSD(1);
      const results = this.calculateProfit(
        this._setService.getSolAmount(),
        solPrice,
        solPrice,
        monitoringEntry.initial_position_usd,
        currentPoolData.current_price,
        currentPoolData.trade_volume_24h,
        +currentPoolData.liquidity,
        { sol: 0.8, token: 0.2 },
        +currentPoolData.base_fee_percentage,
      );

      // 🔹 Сохранение нового состояния мониторинга в `PoolState`
      const poolState = new PoolState();
      poolState.pool = monitoringEntry;
      poolState.liquidity = +currentPoolData.liquidity;
      poolState.cumulative_fee_volume = currentPoolData.volume.hour_24;
      poolState.positionUSD = currentPoolData.current_price;
      poolState.feesEarnedUSD = results.feesEarnedUSD;
      poolState.recorded_at = new Date();
      await this.poolStateRepo.save(poolState);

      if (
        this.exitExpression(
          results,
          monitoringEntry,
          currentPoolData,
        )
      ) {
        monitoringEntry.active = false;
        monitoringEntry.exit_time = new Date();
        monitoringEntry.final_position_usd = currentPoolData.current_price;
        monitoringEntry.final_pool_data = currentPoolData;
        monitoringEntry.profit_or_loss_usd = results.profitOrLossUSD;
        monitoringEntry.total_fees_usd = results.feesEarnedUSD;

        await this.poolRepo.save(monitoringEntry);
        const emoji = results.profitOrLossUSD? '💰': '💨';
        await this._telegramService.sendMessage(`${emoji} Выход из пула ${monitoringEntry.name} с результатом:\n\t ${monitoringEntry.profit_or_loss_usd} USD\n\t PNL: ${results.pnlPercentage}`)
        this.logger.warn(
          `Вышли из пула ${monitoringEntry.name} с результатом ${monitoringEntry.profit_or_loss_usd} USD, PNL: ${results.pnlPercentage} .`,
        );
      } else {
        monitoringEntry.final_pool_data = currentPoolData;
        monitoringEntry.final_position_usd = currentPoolData.current_price;
        await this.poolRepo.save(monitoringEntry);
        this.logger.log(
          `Мониторинг пула ${monitoringEntry.name} ${monitoringEntry.pool_address} продолжается.`,
        );
      }
    }
  }

  calculateProfit(
    initialSolAmount: number,
    initialSolPrice: number,
    finalTSolPrice: number,
    initialTokenPrice: number,
    finalTokenPrice: number,
    tradingVolumeUSD: number,
    liquidityPoolUSD: number,
    allocation: { sol: number; token: number },
    feeRate: number,
  ): { profitOrLossUSD: number; pnlPercentage: number, feesEarnedUSD: number, impermanentLoss: number } {

    // Учитываем распределение ликвидности (80/20, 70/30 и т.д.)
    const initialSolPart = initialSolAmount * allocation.sol;
    const initialTokenPart = (initialSolAmount * allocation.token * initialSolPrice) / initialTokenPrice;

    const finalSolAmount = initialSolPart;
    const finalTokenAmount = initialTokenPart;

    // Входная стоимость LP
    const entryFee = 0.001;
    const solAfterFee = initialSolPart * (1 - entryFee);
    const tokenAfterFee = initialTokenPart * (1 - entryFee);
    const initialLPValueUSD = solAfterFee * initialSolPrice + tokenAfterFee * initialTokenPrice;


    const finalLPValueUSD = (finalSolAmount * finalTSolPrice) + (finalTokenAmount * finalTokenPrice);

    // Накопленные комиссии
    feeRate = feeRate / 100;
    const feesEarnedUSD = (tradingVolumeUSD / liquidityPoolUSD) * initialLPValueUSD * feeRate;

    // Итоговая прибыль или убыток
    const profitOrLossUSD = (finalLPValueUSD - initialLPValueUSD) + feesEarnedUSD;

    const impermanentLoss =
      Math.abs(finalTokenPrice - initialTokenPrice) / initialTokenPrice * finalLPValueUSD;

    // PnL в процентах
    const pnlPercentage = (profitOrLossUSD / initialLPValueUSD) * 100;

    this.logger.log(`Прибыль/убыток: ${profitOrLossUSD.toFixed(2)} USD (${pnlPercentage.toFixed(2)}%)`);
    return { profitOrLossUSD, pnlPercentage, feesEarnedUSD, impermanentLoss };
  }

  private exitExpression(
    results: {
      profitOrLossUSD: number;
      pnlPercentage: number;
      feesEarnedUSD: number;
  }, monitoringEntry: PoolMonitoring, currentPool: PoolData) {

    const positionDropped = currentPool.current_price * 1.1 < monitoringEntry.initial_position_usd;

    const priceRange = this.calculateBinStepRange(monitoringEntry.initial_position_usd, currentPool.bin_step, 34, 1 );
    const profitWithoutFees = (results.profitOrLossUSD - results.feesEarnedUSD) * 1.1;

    let priceUpperToRange = 0;
    let profitLessFees = 0;

    if (priceRange.upperBound < currentPool.current_price) {
      priceUpperToRange = 1;
      this.logger.warn(`Price ${currentPool.current_price} upper to Range ${priceRange.upperBound}`);
    }

    if (profitWithoutFees > results.feesEarnedUSD) {
      profitLessFees = 1;
      this.logger.warn(`Profit ${profitWithoutFees} less Fees earned ${results.feesEarnedUSD}`);
    }

    return (priceUpperToRange || (positionDropped && profitLessFees)
    );
  }

  calculateBinStepRange(
    price: number,
    binStep: number,
    bins: number,
    activeBin: number,
  ): { lowerBound: number; upperBound: number } {
    // Смещение диапазона в зависимости от активного бина
    const binOffset = activeBin * binStep / 10000;
    const lowerBound = price * Math.pow(2, -(bins * binStep) / 10000) ;
    const upperBound = price * Math.pow(2, (bins * binStep) / 10000) ;

    return { lowerBound, upperBound };
  }
  async removeExistingFromArrayAsync<T>(
    dataArray: T[],
    repository: Repository<any>,
    entityField: string,     // Название поля в базе
    objectField: keyof T      // Название ключа объекта в массиве
  ): Promise<T[]> {
    const valuesToCheck = dataArray.map(item => item[objectField]);
    //console.log('Values:',valuesToCheck);
    // const dbRecords = await repository.find({
    //   where: {
    //     [entityField]: valuesToCheck
    //   }
    // });
    const dbRecords = await repository.find({select: [entityField]});
    //console.log('bd:',dbRecords);

    return dataArray.filter(item =>
      !dbRecords.some(dbItem => dbItem[entityField] === item[objectField])
    );
  }
}
