import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../../telegram/telegram.service';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DlmmDataDto } from '../dto/dlmm-data.dto';
import { SetService } from '../set-service/set-service.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Pool } from '../entitys/pool.entity';
import { Repository } from 'typeorm';
import { PoolData } from '../intefaces/pool-data.interface';
import { PoolAnalyzerService } from './pool-analyzer.service';
import { CalculateService, DLMMParams } from './calculate.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly _apiUrl: string;
  private tradeHistory = new Map<string, number | undefined>();
  constructor(
    @InjectRepository(Pool)
    private readonly _poolRep: Repository<Pool>,
    private readonly _telegramService: TelegramService,
    private readonly _configService: ConfigService,
    private readonly _setService: SetService,
    private readonly _poolAnalyzer: PoolAnalyzerService,
    private readonly _calculateService: CalculateService,
  ) {
    this._apiUrl = this._configService.get<string>('DLMM_API_URL') || 'null';
  }
  @Cron('*/60 * * * * *') // Запускаем каждые 60 секунд
  async checkNewPairs() {
    this.logger.log('🔍 Проверка новых торговых пар...');
    const formatter = new Intl.NumberFormat('en-EN', {
      style: 'decimal',
      maximumFractionDigits: 2,
      useGrouping: true,
    });
    const percentCh = this._setService.getPercentFeesUp();
    const bestpools: PoolData[] = [];
    try {
      const params = {
        sort_key: 'feetvlratio30m',
        hide_low_tvl: 500,
        limit: 20,
        hide_low_apr: true,
        include_token_mints: 'So11111111111111111111111111111111111111112',
      };
      const response = await axios.get<DlmmDataDto>(
        `${this._apiUrl}/pair/all_by_groups`,
        { params },
      ); // Получаем данные о торгах
      const trades = response.data.groups;
      let message = '';
      for (const trade of trades) {
        const { pairs, name } = trade;
        const maxFeeInPair = findObjectWithMaxValueByNestedKey(
          pairs,
          'fee_tvl_ratio.min_30',
        );

        if (maxFeeInPair === null) continue;
        const fees30m = maxFeeInPair?.fees.min_30;
        const liquidity = +maxFeeInPair.liquidity || 0;
        const volume = maxFeeInPair.volume;
        const fees = maxFeeInPair.fees;
        const fee_tvl_ratio = maxFeeInPair.fee_tvl_ratio;
        //const feeRatio30m = maxFeeInPair.fee_tvl_ratio.min_30;
        if (bestpools.length <= 3) {
          bestpools.push(maxFeeInPair);
        }

        // const lastEntry = await this._poolRep.findOne({
        //   where: { pool_address: maxFeeInPair.address },
        //   order: { timestamp: 'DESC' },
        // });
        //
        // if (!lastEntry && feeRatio30m > this._setService.getFeesRatioMin()) {
        //   const newPool = this._poolRep.create({
        //     pool_address: maxFeeInPair.address,
        //     pool_data: maxFeeInPair,
        //     fee_ratio: feeRatio30m,
        //   });
        // }

        if (!this.tradeHistory.has(name)) {
          this.tradeHistory.set(name, fees30m);
          //message += getTextMessage(name,percentCh,maxFeeInPair.address, formatter.format(liquidity),formatter.format(volume.min_30), formatter.format(fees.min_30),formatter.format(fee_tvl_ratio.min_30)) + '*new* \n\n';
          continue;
        }

        const previousFees = this.tradeHistory.get(name);
        this.tradeHistory.set(name, fees30m);

        if (fee_tvl_ratio.min_30 < this._setService.getFeesRatioMin()) continue;
        // Проверяем рост объёма (например, больше 50%) (feeTvlRatio30m / previousFee - 1) * 100 > 5)
        if (previousFees && (fees30m / previousFees - 1) * 100 > percentCh) {
          //const messageP = `🚀 *Новый тренд* 🚀\n\nПара: *${name}*\nВкусное fee+${this._percentCh}%\nAddress:\n${maxFeeInPair.address}\nTVL: ${formatter.format(liquidity)}\nVolume-30m: ${formatter.format(volume.min_30)}\nFees-30m: ${formatter.format(fees.min_30)}\nFee-ratio: ${formatter.format(fee_tvl_ratio.min_30)}\n`;
          const messageP = getTextMessage(
            name,
            percentCh,
            maxFeeInPair.address,
            formatter.format(liquidity),
            formatter.format(volume.min_30),
            formatter.format(fees.min_30),
            formatter.format(fee_tvl_ratio.min_30),
          );
          this.logger.warn(
            `🚀 Новый тренд: ${name} (Вкусные Фисы+${percentCh}%)`,
          );

          // if (poolId) {
          //   this.logger.log(`✅ Пул найден: ${poolId}. Добавляем ликвидность...`);
          // } else {
          //   this.logger.warn(`❌ Пул НЕ найден! Пара: ${pair}`);
          // }
          message += messageP;
        }
      }
      //if (message.length > 1) await this._telegramService.sendMessage(message);
      //await this._poolAnalyzer.selectPoolToMonitor(bestpools);
      bestpools.forEach((data) => {
        const params: DLMMParams = {
          binCount: 34,
          activeBin: 1,
          binStep: data.bin_step,
          liquidity: 1,
          totalLiquidity: +data.liquidity,
          tradeVolume: data.trade_volume_24h,
          feeRate: +data.base_fee_percentage,
          timeInPool: 1,
          strategy: 'spot',
          exitPrice: data.current_price * 1.3, // Цена выросла на 5%
          entryPrice: data.current_price,
          dynamicLiquidity: 0,
          meteoraFeeRate: 0.0005,
          volatilityFactor: 1.5,
        };

        const result = this._calculateService.calculateDLMMProfit(params);
        console.log(data.name);
        console.log('Address:', data.address);
        console.log('Profit:', result.finalProfit);
        console.log('Earned Fees:', result.totalFees);
        console.log('Min Price:', result.minPrice);
        console.log('Max Price:', result.maxPrice);
        console.log('-------------');
      });
    } catch (error) {
      this.logger.error(`Ошибка получения данных: ${error.message}`);
    }
  }
}

function findObjectWithMaxValueByNestedKey<T>(arr: [T], keyPath): T | null {
  if (arr[0] === 0) {
    return null; // Если массив пуст, возвращаем null
  }

  // Разбиваем путь к ключу на части (например, "nested.value" -> ["nested", "value"])
  const keys = keyPath.split('.');

  // Используем reduce для поиска объекта с максимальным значением по вложенному ключу
  return arr.reduce((maxObj, currentObj) => {
    // Получаем значение по вложенному ключу
    const currentValue = keys.reduce((obj, key) => obj[key], currentObj);
    const maxValue = keys.reduce((obj, key) => obj[key], maxObj);

    return currentValue > maxValue ? currentObj : maxObj;
  });
}
function getTextMessage(
  name,
  percentCh,
  address,
  tvl,
  volume,
  fees,
  feesRatio,
) {
  return `
🚀 <b>Новый тренд</b> 🚀
          
Пара: <b>${name}</b>
Вкусное fee+${percentCh}%
Address:
<code>${address}</code>
TVL: ${tvl}
Volume-30m: ${volume}
Fees-30m: ${fees}
Fee-ratio: ${feesRatio}
`;
}
