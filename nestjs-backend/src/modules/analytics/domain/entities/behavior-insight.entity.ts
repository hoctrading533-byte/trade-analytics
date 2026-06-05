import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('behavior_insights')
export class BehaviorInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  accountId: number;

  @Column({ type: 'date' })
  recordDate: Date;

  @Column({ type: 'varchar', length: 50 })
  insightType: string;

  @Column({ type: 'jsonb' })
  insightData: any;

  @CreateDateColumn()
  createdAt: Date;

  constructor(partial: Partial<BehaviorInsight>) {
    Object.assign(this, partial);
  }
}
