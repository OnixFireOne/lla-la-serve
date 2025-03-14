export interface PoolData {
  address: 'string';
  apr: number;
  apy: number;
  base_fee_percentage: 'string';
  bin_step: number;
  cumulative_fee_volume: 'string';
  cumulative_trade_volume: 'string';
  current_price: number;
  farm_apr: number;
  farm_apy: number;
  fee_tvl_ratio: {
    hour_1: number;
    hour_12: number;
    hour_2: number;
    hour_24: number;
    hour_4: number;
    min_30: number;
  };
  fees: {
    hour_1: number;
    hour_12: number;
    hour_2: number;
    hour_24: number;
    hour_4: number;
    min_30: number;
  };
  fees_24h: number;
  hide: true;
  is_blacklisted: true;
  liquidity: 'string';
  max_fee_percentage: 'string';
  mint_x: 'string';
  mint_y: 'string';
  name: 'string';
  protocol_fee_percentage: 'string';
  reserve_x: 'string';
  reserve_x_amount: number;
  reserve_y: 'string';
  reserve_y_amount: number;
  reward_mint_x: 'string';
  reward_mint_y: 'string';
  tags: ['string'];
  today_fees: number;
  trade_volume_24h: number;
  volume: {
    hour_1: number;
    hour_12: number;
    hour_2: number;
    hour_24: number;
    hour_4: number;
    min_30: number;
  };
}
