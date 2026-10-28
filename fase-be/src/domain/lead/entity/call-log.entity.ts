import { TABLES_NAME } from 'src/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CallResult } from '../../enums';
import { Users } from '../../user/entity/user.entity';
import { Leads } from './lead.entity';

/** Một cuộc gọi do nhân viên tự nhập (không tích hợp tổng đài). */
@Entity(TABLES_NAME.CALL_LOGS)
@Index(['leadId', 'calledAt'])
@Index(['userId', 'calledAt'])
export class CallLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Leads, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Leads;

  @Column({ type: 'int' })
  leadId: number;

  @ManyToOne(() => Users, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamptz' })
  calledAt: Date;

  @Column({ type: 'varchar', length: 20 })
  result: CallResult;

  /** Thời lượng cuộc gọi (phút), nhập tay. */
  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  note: string | null;

  /** Cuộc này có được tính vào bộ đếm x/7 không. */
  @Column({ type: 'boolean', default: false })
  countedNoAnswer: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;
}
