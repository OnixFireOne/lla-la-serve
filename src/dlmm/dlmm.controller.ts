import { Controller, Get, Param } from '@nestjs/common';
import { DlmmService } from './dlmm.service';
import { DlmmApiService } from './dlmm-api/dlmm-api.service';

@Controller('dlmm')
export class DlmmController {
  constructor(
    private readonly dlmmService: DlmmService,
    private readonly dlmmApiService: DlmmApiService,
  ) {}

  @Get('pool/:publicKey')
  async getPoolInfo(@Param('publicKey') poolId: string): Promise<any> {
    return this.dlmmService.getPool(poolId);
  }

  @Get('api/pool/:id')
  async getPoolInfoFromApi(@Param('id') poolId: string): Promise<any> {
    return this.dlmmApiService.getPoolInfo(poolId);
  }

  @Get('api/pools')
  async getPoolsFromApi(): Promise<any> {
    return this.dlmmApiService.getPools();
  }

  @Get('api/pools/:address')
  async getPoolsFromApiByAddress(@Param('address') address: string): Promise<any> {
    return this.dlmmApiService.getPoolsByAddress(address);
  }
}
