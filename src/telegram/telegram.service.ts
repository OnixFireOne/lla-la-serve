import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { SetService } from '../dlmm/set-service/set-service.service';
import { DlmmApiService } from '../dlmm/dlmm-api/dlmm-api.service';
import { DlmmService } from '../dlmm/dlmm.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;
  private chatId = '439104348'; // 🔥 Твой chat ID
  private token = '946715771:AAGx300ZP_tI0LrOfbmoF20iJVyw7jTwoDk'; // 🔥 Твой токен бота

  constructor(
    private readonly _setService: SetService,
    private readonly _dlmmApiService: DlmmApiService,
    private readonly _dlmmService: DlmmService,
  ) {
    this.bot = new TelegramBot(this.token, { polling: true });

    this.bot.onText(/\/start/, (msg) => this.sendWelcome(msg.chat.id));
    this.bot.onText(/\/set_percent_fees/, (msg) => this.setUserCommand(msg.text));
    this.bot.onText(/^[1-9A-HJ-NP-Za-km-z]{44}$/, (msg) => this.dlmmPoolInfo(msg.text));
  }

  async sendWelcome(chatId: number) {
    const message = `👋 Привет! Я бот для анализа DEX Meteora!\n\n🚀 Команды:\n/set_percent_fees - Изменить процент роста фисиков\n`;
    await this.bot.sendMessage(chatId, message);
  }

  async sendMessage(message: string) {
    try {
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      this.logger.log(`📩 Сообщение отправлено: ${message}`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`❌ Ошибка отправки в Telegram: ${error.message}`);
    }
  }

  async setUserCommand(command: string | undefined) {
    if (command === undefined) {
      await this.sendMessage('🎈');
      return;
    }
    const [cmd, value] = command.split(' ');

    if (cmd === '/set_tvl' && !isNaN(Number(value))) {
      this._setService.setTvlThreshold(Number(value));
      await this.sendMessage(`✅ TVL порог изменен: $${value}`);
    } else if (cmd === '/set_volume' && !isNaN(Number(value))) {
      this._setService.setVolumeThreshold(Number(value));
      await this.sendMessage(`✅ Порог объема изменен: $${value}`);
    } else if (cmd === '/set_percent_fees' && !isNaN(Number(value))) {
      this._setService.setPercentFeesUp(Number(value));
      await this.sendMessage(`✅ Процент изменение фисиков изменен: ${value}%`);
    } else {
      await this.sendMessage('⚠️ Неизвестная команда!');
    }
  }

  async dlmmPoolInfo(poolAddress: string | undefined) {
    if (poolAddress === undefined) {
      await this.sendMessage('❌ Ошибка адресса');
      return;
    }
    const formatter = new Intl.NumberFormat('en-EN', { style: 'decimal', maximumFractionDigits: 2, useGrouping: true });
    const poolInfo = await this._dlmmApiService.getPoolInfo(poolAddress);
    //const data = await this._dlmmService.getPoolCreationTime(poolAddress);
    //const date = `${data?.days}d, ${data?.hours},${data?.minutes},${data?.seconds} `;
    const info = `
📊 Информация о пуле:
🔹 Адрес: ${poolInfo.address}
🔹 Имя: <b>${poolInfo.name}</b>
🔹 Bin: ${poolInfo.bin_step}
🔹 Ликвидность: $${formatter.format(+poolInfo.liquidity)}
🔹 Объем торгов (30m): $${formatter.format(poolInfo.volume.min_30)}
🔹 MarketCap: ${formatter.format(poolInfo.current_price * 1000000000)}
🔹 Price: ${poolInfo.current_price}
🔹 Meteora: <a href="https://app.meteora.ag/dlmm/${poolInfo.address}">Link</a>
      `;
    await this.sendMessage(info);
  }
}
