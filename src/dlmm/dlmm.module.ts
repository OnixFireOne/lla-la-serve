import { Module } from '@nestjs/common';
import { DlmmService } from './dlmm.service';
import { DlmmController } from './dlmm.controller';
import { DlmmApiService } from './dlmm-api/dlmm-api.service';
import { HttpModule } from '@nestjs/axios';
import { AnalysisService } from './analysis/analysis.service';
import { TelegramService } from '../telegram/telegram.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SetService } from './set-service/set-service.service';
import { WalletService } from '../wallet/wallet.service';
import { PoolAnalyzerService } from './analysis/pool-analyzer.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pool } from './entitys/pool.entity';
import { PoolMonitoring } from './entitys/pool-monitoring.entity';
import { PoolState } from './entitys/pool-state.entity';
import { SolPrice } from './entitys/sol-price.entity';
import { SolPriceService } from './analysis/sol-Price.service';
import { CalculateService } from './analysis/calculate.service';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot(), TypeOrmModule.forFeature([Pool, PoolMonitoring, PoolState, SolPrice])],
  providers: [
    DlmmService,
    DlmmApiService,
    AnalysisService,
    TelegramService,
    SetService,
    WalletService,
    PoolAnalyzerService,
    SolPriceService,
    CalculateService,
  ],
  controllers: [DlmmController],
})
export class DlmmModule {}
