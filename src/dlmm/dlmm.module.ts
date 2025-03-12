import { Module } from '@nestjs/common';
import { DlmmService } from './dlmm.service';
import { DlmmController } from './dlmm.controller';
import { DlmmApiService } from './dlmm-api/dlmm-api.service';
import { HttpModule } from '@nestjs/axios';
import { AnalysisService } from './analysis/analysis.service';
import { TelegramService } from '../telegram/telegram.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SetService } from './set-service/set-service.service';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  providers: [DlmmService, DlmmApiService, AnalysisService, TelegramService, SetService],
  controllers: [DlmmController],
})
export class DlmmModule {}
