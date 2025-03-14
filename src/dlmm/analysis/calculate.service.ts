import { Injectable } from '@nestjs/common';

type Strategy = 'spot' | 'curve' | 'bid-ask';

export type DLMMParams = {
  binCount: number;
  activeBin: number;
  binStep: number;
  liquidity: number;
  totalLiquidity: number;
  tradeVolume: number;
  feeRate: number;
  timeInPool: number;
  strategy: Strategy;
  exitPrice: number;
  entryPrice: number;
  dynamicLiquidity: number;
  meteoraFeeRate: number;
  volatilityFactor: number; // Коэффициент волатильности (динамическая комиссия)
};


@Injectable()
export class CalculateService{

  calculateDLMMProfit(params: DLMMParams) {
    const {
      binCount,
      activeBin,
      binStep,
      liquidity,
      totalLiquidity,
      tradeVolume,
      timeInPool,
      strategy,
      exitPrice,
      entryPrice,
      dynamicLiquidity,
      meteoraFeeRate,
      volatilityFactor,
    } = params;

    const feeRate = params.feeRate / 100;
    const binStepSize = 0.001;
    // Рассчитываем диапазон цен, на который влияет binStepSize
    const priceRange = binStep * binStepSize;
   // const minPrice = entryPrice - (binCount / 2) * binStep * binStepSize;
   // const maxPrice = entryPrice + (binCount / 2) * binStep * binStepSize;
    const minPrice = Math.max(0, entryPrice - (binCount / 2) * binStep * binStepSize);
    const maxPrice = Math.max(minPrice, entryPrice + (binCount / 2) * binStep * binStepSize);

    // Рассчитываем долю ликвидности в пуле (учитывая динамическое перераспределение)
    const effectiveLiquidity = liquidity + dynamicLiquidity;
    const liquidityShare = effectiveLiquidity / totalLiquidity;

    // Динамическая комиссия на основе волатильности
    const dynamicFee = meteoraFeeRate * volatilityFactor;
    const totalFeeRate = feeRate + dynamicFee;

    // Оценка полученных комиссий (с учетом динамических комиссий)
    const earnedFees = tradeVolume * totalFeeRate * liquidityShare * timeInPool;

    // Распределение ликвидности по стратегиям
    let strategyMultiplier = 1;
    let liquidityDistributionFactor = 1;
    switch (strategy) {
      case 'spot':
        strategyMultiplier = 1.0; // Равномерное распределение
        liquidityDistributionFactor = 1 / binCount;
        break;
      case 'curve':
        strategyMultiplier = 1.2; // Концентрация в начале, спад к краям
        liquidityDistributionFactor = (activeBin / binCount) ** 2;
        break;
      case 'bid-ask':
        strategyMultiplier = 1.3; // Концентрация на краях
        liquidityDistributionFactor = ((binCount - activeBin) / binCount) ** 2;
        break;
    }

    // Итоговая комиссия с учетом стратегии и распределения ликвидности
    const totalFees = earnedFees * strategyMultiplier * liquidityDistributionFactor;

    // Непостоянные потери (если цена изменилась)
    const impermanentLoss = Math.abs(exitPrice - entryPrice) / entryPrice * effectiveLiquidity;

    // Финальная прибыль
    const finalProfit = totalFees - impermanentLoss;

    return { finalProfit, totalFees, minPrice, maxPrice };
  }

  calculateProfit(
    initialSolAmount: number,
    initialSolPrice: number,
    finalTSolPrice: number,
    initialTokenPrice: number,
    finalTokenPrice: number,
    tradingVolumeUSD: number,
    liquidityPoolUSD: number,
    allocation: { sol: number; token: number },
    feeRate: number,
  ): { profitOrLossUSD: number; pnlPercentage: number, feesEarnedUSD: number, impermanentLoss: number } {

    // Учитываем распределение ликвидности (80/20, 70/30 и т.д.)
    const initialSolPart = initialSolAmount * allocation.sol;
    const initialTokenPart = (initialSolAmount * allocation.token * initialSolPrice) / initialTokenPrice;

    const finalSolAmount = initialSolPart;
    const finalTokenAmount = initialTokenPart;

    // Входная стоимость LP
    const entryFee = 0.001;
    const solAfterFee = initialSolPart * (1 - entryFee);
    const tokenAfterFee = initialTokenPart * (1 - entryFee);
    const initialLPValueUSD = solAfterFee * initialSolPrice + tokenAfterFee * initialTokenPrice;


    const finalLPValueUSD = (finalSolAmount * finalTSolPrice) + (finalTokenAmount * finalTokenPrice);

    // Накопленные комиссии
    feeRate = feeRate / 100;
    const feesEarnedUSD = (tradingVolumeUSD / liquidityPoolUSD) * initialLPValueUSD * feeRate;

    // Итоговая прибыль или убыток
    const profitOrLossUSD = (finalLPValueUSD - initialLPValueUSD) + feesEarnedUSD;

    const impermanentLoss =
      Math.abs(finalTokenPrice - initialTokenPrice) / initialTokenPrice * finalLPValueUSD;

    // PnL в процентах
    const pnlPercentage = (profitOrLossUSD / initialLPValueUSD) * 100;

    ///this.logger.log(`Прибыль/убыток: ${profitOrLossUSD.toFixed(2)} USD (${pnlPercentage.toFixed(2)}%)`);
    return { profitOrLossUSD, pnlPercentage, feesEarnedUSD, impermanentLoss };
  }
}
