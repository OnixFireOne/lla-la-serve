import { Injectable, Logger } from '@nestjs/common';
import { Connection, Keypair, LAMPORTS_PER_SOL, ParsedAccountData, PublicKey } from '@solana/web3.js';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private connection: Connection;
  private walletPath = './wallet.enc';

  constructor(private readonly _configService: ConfigService) {
  }

  createAndEncryptWallet(): string {
    const wallet = Keypair.generate();
    const password = this._configService.get('WALLET_SECRET');
    if (!password) throw new Error('❌ WALLET_SECRET не задан в .env');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      crypto.scryptSync(password, 'salt', 32),
      iv,
    );

    const encryptedSecret = Buffer.concat([cipher.update(wallet.secretKey), cipher.final()]);

    fs.writeFileSync(
      this.walletPath,
      JSON.stringify({
        iv: iv.toString('hex'),
        secret: encryptedSecret.toString('hex'),
      }),
    );

    this.logger.log(`✅ Кошелек создан: ${wallet.publicKey.toBase58()}`);
    return wallet.publicKey.toBase58();
  }

  loadEncryptedWallet(): Keypair | null {
    const walletSecret = this._configService.get('WALLET_SECRET');
    if (!fs.existsSync(this.walletPath) && walletSecret != undefined) {
      this.logger.error('❌ Кошелек не найден!');
      return null;
    }

    const encryptedData = JSON.parse(fs.readFileSync(this.walletPath, 'utf8'));
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const encryptedSecret = Buffer.from(encryptedData.secret, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.scryptSync(walletSecret, 'salt', 32),
      iv,
    );

    const decrypted = Buffer.concat([decipher.update(encryptedSecret), decipher.final()]);
    const wallet = Keypair.fromSecretKey(decrypted);

    this.logger.log(`✅ Кошелек загружен: ${wallet.publicKey.toBase58()}`);

    return wallet;
  }

  async getWalletBalance(walletAddress: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(walletAddress);
      const solBalance = balance / LAMPORTS_PER_SOL;

      this.logger.log(`Баланс кошелька ${walletAddress.toString()}: ${solBalance} SOL`);

      return solBalance;
    } catch (error) {
      this.logger.error('Ошибка получения баланса:', error);
      return 0;
    }
  }

  async getTokenBalances(publicKey: PublicKey): Promise<any[]> {
    try {
      // Адрес стандартной программы токенов в Solana
      const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: tokenProgramId,
      });

      const tokens = tokenAccounts.value.map((tokenAccount) => {
        // Данные распарсены как ParsedAccountData
        const parsedInfo = (tokenAccount.account.data as ParsedAccountData).parsed.info;
        const tokenAmount = parsedInfo.tokenAmount;

        return {
          mint: parsedInfo.mint,
          amount: tokenAmount.uiAmount,
          decimals: tokenAmount.decimals,
          raw: tokenAmount.amount,
        };
      });

      return tokens;
    } catch (error) {
      this.logger.error('Ошибка получения SPL балансов:', error);
      return [];
    }
  }
}
