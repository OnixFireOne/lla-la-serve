import { Injectable } from '@nestjs/common';
import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DlmmService {
  private connection: Connection;

  constructor(private readonly configService: ConfigService) {
    // Получаем URL из .env файла
    const solanaRpcUrl =
      this.configService.get<string>('SOLANA_RPC_URL') || 'nul';

    // Настройка подключения к Solana
    this.connection = new Connection(solanaRpcUrl, 'confirmed');
  }

  async getPool(poolPublicKey: string): Promise<DLMM> {
    const poolS = new PublicKey(poolPublicKey);
    return await DLMM.create(this.connection, poolS);
  }

  async getPoolCreationTime(poolAddress: string) {
    const pubKey = new PublicKey(poolAddress);

    // Получаем первые транзакции аккаунта
    // const signatures = await this.connection.getSignaturesForAddress(pubKey, {
    //   limit: 1,
    // });

    // if (signatures.length === 0) {
    //   console.log('Нет транзакций для этого адреса');
    //   return null;
    // }
    //
    // const firstSignature = signatures[0];


    // Получаем подробную информацию о транзакции
    //const txDetails = await this.connection.getTransaction(firstSignature,{maxSupportedTransactionVersion: 0});

    // if (!txDetails) {
    //   console.log('Нет данных по транзакции');
    //   return null;
    // }


    //const slot = firstSignature.slot;

    // Получаем время блока по слоту
    //const blockTime = await this.connection.getBlockTime(slot);

    const accountInfo = await this.connection.getAccountInfoAndContext(pubKey);
    if (!accountInfo) {
      console.log('❌ Аккаунт не найден!');
      return;
    }
    if(!accountInfo.value) return;
    const rentEpoch = accountInfo.value.rentEpoch;
    const epochInfo = await this.connection.getEpochInfo();

    if(!rentEpoch) return ;
    const estimatedStartSlot = rentEpoch / epochInfo.slotsInEpoch;
    const blockTimeByEpoch = await this.connection.getBlockTime(estimatedStartSlot);
    if(!blockTimeByEpoch) return ;
    const slot = accountInfo.context.slot;

    const blockTime = await this.connection.getBlockTime(slot);

    if (!blockTime) {
      console.log('Нет времени блока');
      return null;
    }

    const creationDateByEpoch = new Date(blockTimeByEpoch * 1000);
    const creationDate = new Date(blockTime * 1000); // Преобразуем в читаемую дату
    const now = new Date();

    // Рассчитываем разницу во времени (в миллисекундах)
    const elapsedMs = now.getTime() - creationDate.getTime();

    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    console.log(`Адрес пула ${creationDateByEpoch.toUTCString()} был создан или впервые использован: ${creationDate.toUTCString()}`);

    return {
      creationDate: creationDate.toUTCString(),
      days,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60,
    };
  }
}
