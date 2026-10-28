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
import { AssignmentAction } from '../../enums';
import { Users } from '../../user/entity/user.entity';
import { Leads } from './lead.entity';

/** Lịch sử phân / nhận / trả / thu hồi / mở lại LEAD. */
@Entity(TABLES_NAME.LEAD_ASSIGNMENTS)
@Index(['leadId', 'dateCreated'])
@Index(['userId', 'action'])
export class LeadAssignments {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Leads, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Leads;

  @Column({ type: 'int' })
  leadId: number;

  /** Nhân viên liên quan (người được phân / người nhận / người bị trả). */
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: Users | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 20 })
  action: AssignmentAction;

  /** Người thực hiện; null = hệ thống. */
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: Users | null;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;
}
