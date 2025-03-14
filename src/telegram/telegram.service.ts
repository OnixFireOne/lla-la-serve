import { Injectable, Logger } from '@nestjs/common';
import { Bot } from 'grammy';
import { SetService } from '../dlmm/set-service/set-service.service';
import { DlmmApiService } from '../dlmm/dlmm-api/dlmm-api.service';
import { DlmmService } from '../dlmm/dlmm.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot;
  private chatId = '439104348'; // 🔥 Твой chat ID
  private token = '946715771:AAGx300ZP_tI0LrOfbmoF20iJVyw7jTwoDk'; // 🔥 Твой токен бота

  constructor(
    private readonly _setService: SetService,
    private readonly _dlmmApiService: DlmmApiService,
    private readonly _dlmmService: DlmmService,
    private readonly _walletService: WalletService
  ) {
    this.bot = new Bot(this.token);

    // Обработка команды /start
    this.bot.command('start', async (ctx) => {
      if (ctx.chat?.id) {
        await this.sendWelcome(ctx.chat.id);
      }
    });

    // Обработка команд вида /set_tvl, /set_volume, /set_percent_fees
    this.bot.hears(/^\/set_(tvl|volume|percent_fees)/, async (ctx) => {
      await this.setUserCommand(ctx.message?.text);
    });

    // Обработка сообщений, соответствующих регулярному выражению (например, pool address)
    this.bot.hears(/^[1-9A-HJ-NP-Za-km-z]{44}$/, async (ctx) => {
      await this.dlmmPoolInfo(ctx.message?.text);
    });

    this.bot.command('create_wallet', async (ctx) => {
      await this.createWallet(ctx.chat.id);
    });

    this.bot.command('balance', async (ctx) => {
      await this.getWalletBalance(ctx.chat.id);
    });

    this.bot.start();
  }

  async sendWelcome(chatId: number) {
    const message = `👋 Привет! Я бот для анализа DEX Meteora!\n\n🚀 Команды:\n/set_percent_fees - Изменить процент роста фисиков\n`;
    await this.bot.api.sendMessage(chatId, message);
  }

  async sendMessage(message: string) {
    try {
      await this.bot.api.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      this.logger.log(`📩 Сообщение отправлено: ${message}`);
    } catch (error: any) {
      this.logger.error(`❌ Ошибка отправки в Telegram: ${error.message}`);
    }
  }

  async setUserCommand(command: string | undefined) {
    if (!command) {
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
    } else if (cmd === '/set_fees_ratio' && !isNaN(Number(value))) {
      this._setService.setFeesRatioMin(Number(value));
      await this.sendMessage(`✅ Соотношение фисиков изменен: ${value}%`);
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

  async createWallet(chatId: number) {
    if (!chatId) return;
    if (this._walletService.loadEncryptedWallet()) return;
    const publicKey = this._walletService.createAndEncryptWallet();
    await this.bot.api.sendMessage(chatId, `✅ Кошелек создан:\n <code>${publicKey}</code>`);
  }

  async getWalletBalance(chatId: number) {
    if (!chatId) return;
    const wallet = this._walletService.loadEncryptedWallet();
    if (!wallet) {
      await this.bot.api.sendMessage(chatId, '❌ Не удалось загрузить кошелек.');
      return;
    }

    // Получаем баланс SOL
    const solBalance = await this._walletService.getWalletBalance(wallet.publicKey);

    // Получаем балансы SPL токенов
    const tokenBalances = await this._walletService.getTokenBalances(wallet.publicKey);

    let response = `💰 Баланс кошелька:\n🔹 SOL: ${solBalance.toFixed(8)} SOL\n\n`;
    if (tokenBalances.length > 0) {
      response += `📦 SPL Токены:\n`;
      tokenBalances.forEach((token) => {
        response += `🔸 Mint: ${token.mint}\n  Amount: ${token.amount} (raw: ${token.raw})\n\n`;
      });
    } else {
      response += `📦 Нет SPL токенов.`;
    }

    await this.bot.api.sendMessage(chatId, response);
  }
}
