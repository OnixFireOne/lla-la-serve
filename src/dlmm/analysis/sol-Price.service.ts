import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';
import { SolPrice } from '../entitys/sol-price.entity';


@Injectable()
export class SolPriceService {
  private readonly logger = new Logger(SolPriceService.name);

  constructor(
    @InjectRepository(SolPrice)
    private readonly solPriceRepo: Repository<SolPrice>,
  ) {}

  // CRON (каждые 5 мин)
  @Cron('*/300 * * * *')
  async fetchAndStoreSolPrice() {
    // try {
    //   const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    //     params: { ids: 'solana', vs_currencies: 'usd' },
    //   });
    //
    //   const priceUSD = response.data.solana.usd;
    //
    //   const newPrice = this.solPriceRepo.create({ priceUSD });
    //   await this.solPriceRepo.save(newPrice);
    //
    //   this.logger.log(`Обновлена цена SOL: ${priceUSD} USD`);
    // } catch (error) {
    //   this.logger.error('Ошибка получения цены SOL', error);
    // }
  }

  async convertSolToUSD(solAmount: number): Promise<number> {
    // const latestPrice = await this.solPriceRepo.findOne({
    //   order: { timestamp: 'DESC' },
    // });
    //
    // if (!latestPrice) {
    //   throw new Error('Нет данных о цене SOL/USD');
    // }
    const latestPrice = {priceUSD: 126};

    return Number(latestPrice.priceUSD) * solAmount;
  }
}
