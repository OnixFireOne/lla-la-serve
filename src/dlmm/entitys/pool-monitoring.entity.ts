import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PoolData } from '../intefaces/pool-data.interface';
import { PoolState } from './pool-state.entity';

@Entity()
export class PoolMonitoring {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  pool_address: string;

  @Column()
  name: string;

  @Column('jsonb')
  pool_data: PoolData;

  @Column('decimal')
  initial_fee_ratio: number;

  @Column('decimal')
  initial_liquidity: number;

  @Column('decimal')
  initial_volume: number;

  @Column('decimal')
  initial_position_usd: number;

  @Column('decimal')
  initial_cumulative_fee: number;

  @Column({ type: 'timestamptz' })
  entry_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  exit_time: Date;

  @Column({ type: 'jsonb', nullable: true })
  final_pool_data: object;

  @Column({ type: 'decimal', nullable: true })
  final_position_usd: number;

  @Column('decimal', { nullable: true })
  final_fee_earned: number;

  @Column('decimal', { nullable: true })
  total_fees_usd: number;

  @Column('decimal', { nullable: true })
  profit_or_loss_usd: number;

  @Column({ default: false })
  active: boolean;

  @OneToMany(() => PoolState, (state) => state.pool, { cascade: true })
  states: PoolState[];

  @CreateDateColumn()
  created_at: Date;
}
