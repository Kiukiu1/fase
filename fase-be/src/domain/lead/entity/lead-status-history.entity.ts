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
import { LeadStatus } from '../../enums';
import { Users } from '../../user/entity/user.entity';
import { Leads } from './lead.entity';

/** BR-04: lịch sử mọi lần đổi trạng thái. actor = null nghĩa là hệ thống tự chuyển. */
@Entity(TABLES_NAME.LEAD_STATUS_HISTORY)
@Index(['leadId', 'dateCreated'])
export class LeadStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Leads, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Leads;

  @Column({ type: 'int' })
  leadId: number;

  @Column({ type: 'varchar', length: 30 })
  fromStatus: LeadStatus;

  @Column({ type: 'varchar', length: 30 })
  toStatus: LeadStatus;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: Users | null;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;
}
