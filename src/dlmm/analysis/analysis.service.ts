import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../../telegram/telegram.service';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DlmmDataDto } from '../dto/dlmm-data.dto';
import { SetService } from '../set-service/set-service.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly _apiUrl: string;
  private tradeHistory = new Map<string, number | undefined>();
  constructor(
    private readonly _telegramService: TelegramService,
    private readonly _configService: ConfigService,
    private readonly _setService: SetService,
  ) {
    this._apiUrl = this._configService.get<string>('DLMM_API_URL') || 'null';
  }
  @Cron('*/60 * * * * *') // Запускаем каждые 60 секунд
  async checkNewPairs() {
    this.logger.log('🔍 Проверка новых торговых пар...');
    const formatter = new Intl.NumberFormat('en-EN', { style: 'decimal', maximumFractionDigits: 2, useGrouping: true });
    const percentCh = this._setService.getPercentFeesUp();
    try {
      const params = {
        sort_key: 'feetvlratio30m',
        hide_low_tvl: 500,
        limit: 20,
        hide_low_apr: true,
        include_token_mints: 'So11111111111111111111111111111111111111112',
      };
      const response = await axios.get<DlmmDataDto>(`${this._apiUrl}/pair/all_by_groups`, {params}); // Получаем данные о торгах
      const trades = response.data.groups;
      let message = '';
      for (const trade of trades) {
        const { pairs, name } = trade;
        const maxFeeInPair = findObjectWithMaxValueByNestedKey(pairs,'fee_tvl_ratio.min_30');

        if (maxFeeInPair === null) continue;
        const fees30m = maxFeeInPair?.fees.min_30;
        const liquidity = +maxFeeInPair.liquidity || 0;
        const volume = maxFeeInPair.volume;
        const fees = maxFeeInPair.fees;
        const fee_tvl_ratio = maxFeeInPair.fee_tvl_ratio;

        if (!this.tradeHistory.has(name)) {
          this.tradeHistory.set(name, fees30m);
          message += getTextMessage(name,percentCh,maxFeeInPair.address, formatter.format(liquidity),formatter.format(volume.min_30), formatter.format(fees.min_30),formatter.format(fee_tvl_ratio.min_30)) + '*new* \n\n';
          continue;
        }

        const previousFees = this.tradeHistory.get(name);
        this.tradeHistory.set(name, fees30m);

        if (fee_tvl_ratio.min_30 < 0.6) continue;
        // Проверяем рост объёма (например, больше 50%) (feeTvlRatio30m / previousFee - 1) * 100 > 5)
        if ( previousFees && (fees30m / previousFees - 1) * 100 > percentCh ) {
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
          this.logger.warn(`🚀 Новый тренд: ${name} (Вкусные Фисы+${percentCh}%)`);

          // if (poolId) {
          //   this.logger.log(`✅ Пул найден: ${poolId}. Добавляем ликвидность...`);
          // } else {
          //   this.logger.warn(`❌ Пул НЕ найден! Пара: ${pair}`);
          // }
          message += messageP;
        }
      }
      if (message.length > 1) await this._telegramService.sendMessage(message);
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

    return (currentValue > maxValue) ? currentObj : maxObj;
  });
}
function getTextMessage (name, percentCh, address, tvl, volume, fees, feesRatio) {
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
