import { Injectable } from '@nestjs/common';

@Injectable()
export class SetService {
  private tvlThreshold = 1000; // Минимальный TVL ($)
  private volumeThreshold = 1000; // Объем за 5 минут ($)
  private percentFees = 20; // Change the percent of fees is up (%)
  private feesRatioMin = 1;
  private solAmount = 1;

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

  // Fees ration then big, then less notification
  getFeesRatioMin() {
    return this.feesRatioMin;
  }

  setFeesRatioMin(value: number) {
    this.feesRatioMin = value;
  }

  getSolAmount() {
    return this.solAmount;
  }

  setSolAmount(value: number) {
    this.solAmount = value;
  }
}
