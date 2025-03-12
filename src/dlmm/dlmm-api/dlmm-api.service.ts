import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PoolData } from '../intefaces/pool-data.interface';

@Injectable()
export class DlmmApiService {
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('DLMM_API_URL') || 'null';
  }

  async getPoolInfo(poolAddress: string): Promise<PoolData> {
    const url = `${this.apiUrl}/pair/${poolAddress}`;
    const response = await firstValueFrom(this.httpService.get<PoolData>(url));
    return response.data;
  }

  async getPools(): Promise<any> {
    const url = `${this.apiUrl}/pair/all_by_groups`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }

  async getPoolsByAddress(address?: string): Promise<any> {
    const url = `${this.apiUrl}/pair/all_by_groups`;
    const params = { search_term: address };
    const response = await firstValueFrom(
      this.httpService.get(url, { params }),
    );
    return response.data;
  }
}
