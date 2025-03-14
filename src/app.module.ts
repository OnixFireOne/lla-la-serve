import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DlmmModule } from './dlmm/dlmm.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WalletModule } from './wallet/wallet.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pool } from './dlmm/entitys/pool.entity';
import { getPostgreConfig } from './configs/postgre.config';

@Module({
  imports: [
    DlmmModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    WalletModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getPostgreConfig,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
