import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { PoolMonitoring } from './pool-monitoring.entity';


@Entity()
export class PoolState {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PoolMonitoring, (pool) => pool.states, { onDelete: 'CASCADE' })
  pool: PoolMonitoring;

  @Column('decimal')
  liquidity: number;

  @Column('decimal')
  cumulative_fee_volume: number;

  @Column('decimal')
  feesEarnedUSD: number;

  @Column('decimal')
  positionUSD: number;

  @Column({ type: 'timestamptz' })
  recorded_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
