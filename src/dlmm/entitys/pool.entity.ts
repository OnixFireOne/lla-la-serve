import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { PoolData } from '../intefaces/pool-data.interface';

@Entity()
export class Pool {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  pool_address: string;

  @Column('jsonb')
  pool_data: PoolData;

  @Column('decimal')
  fee_ratio: number;

  @CreateDateColumn()
  timestamp: Date;
}
