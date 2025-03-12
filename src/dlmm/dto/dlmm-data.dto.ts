export interface DlmmDataDto {
  groups: [
    {
      name: 'string';
      pairs: [
        {
          address: 'string';
          apr: 0.1;
          apy: 0.1;
          base_fee_percentage: 'string';
          bin_step: 1073741824;
          cumulative_fee_volume: 'string';
          cumulative_trade_volume: 'string';
          current_price: 0.1;
          farm_apr: 0.1;
          farm_apy: 0.1;
          fee_tvl_ratio: {
            hour_1: 0.1;
            hour_12: 0.1;
            hour_2: 0.1;
            hour_24: 0.1;
            hour_4: 0.1;
            min_30: 0.1;
          };
          fees: {
            hour_1: 0.1;
            hour_12: 0.1;
            hour_2: 0.1;
            hour_24: 0.1;
            hour_4: 0.1;
            min_30: 0.1;
          };
          fees_24h: 0.1;
          hide: true;
          is_blacklisted: true;
          liquidity: 'string';
          max_fee_percentage: 'string';
          mint_x: 'string';
          mint_y: 'string';
          name: 'string';
          protocol_fee_percentage: 'string';
          reserve_x: 'string';
          reserve_x_amount: 9007199254740991;
          reserve_y: 'string';
          reserve_y_amount: 9007199254740991;
          reward_mint_x: 'string';
          reward_mint_y: 'string';
          tags: ['string'];
          today_fees: 0.1;
          trade_volume_24h: 0.1;
          volume: {
            hour_1: 0.1;
            hour_12: 0.1;
            hour_2: 0.1;
            hour_24: 0.1;
            hour_4: 0.1;
            min_30: 0.1;
          };
        },
      ];
    },
  ];
  total: 0;
}
