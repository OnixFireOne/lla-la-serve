import { Injectable } from '@nestjs/common';

@Injectable()
export class SetService {
  private tvlThreshold = 1000; // Минимальный TVL ($)
  private volumeThreshold = 1000; // Объем за 5 минут ($)
  private percentFees = 20; // Change the percent of fees is up (%)

  getTvlThreshold(): number {
    return this.tvlThreshold;
  }

  setTvlThreshold(value: number) {
    this.tvlThreshold = value;
  }

  getVolumeThreshold(): number {
    return this.volumeThreshold;
  }

  setVolumeThreshold(value: number) {
    this.volumeThreshold = value;
  }

  getPercentFeesUp() {
    return this.percentFees;
  }

  setPercentFeesUp(value: number) {
    this.percentFees = value;
  }
}
