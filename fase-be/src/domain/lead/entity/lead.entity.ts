import { TABLES_NAME } from 'src/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LeadStatus } from '../../enums';
import { Users } from '../../user/entity/user.entity';

@Entity(TABLES_NAME.LEADS)
@Index(['managerId', 'status'])
@Index(['assignedToId', 'status'])
@Index(['managerId', 'mst'])
@Index(['managerId', 'phone'])
@Index(['status', 'receiveDeadline'])
export class Leads {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  mst: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ type: 'varchar', length: 200 })
  servicePackage: string;

  @Column({ type: 'date' })
  interestedDate: string;

  @Column({ type: 'varchar', length: 30, default: LeadStatus.NEW })
  status: LeadStatus;

  /** Kho LEAD của trưởng phòng nào. */
  @ManyToOne(() => Users, { nullable: false })
  @JoinColumn({ name: 'manager_id' })
  manager: Users;

  @Column({ type: 'uuid' })
  managerId: string;

  /** Nhân viên đang được phân; null = LEAD đang nằm trong kho. */
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: Users | null;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  /** Hạn nhận, đã tính sẵn theo giờ hành chính lúc phân (BR-01). */
  @Column({ type: 'timestamptz', nullable: true })
  receiveDeadline: Date | null;

  /** Đã gửi nhắc "sắp hết hạn nhận" cho lần phân hiện tại chưa. */
  @Column({ type: 'boolean', default: false })
  receiveWarned: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  /** Số ngày đã gọi mà khách không nghe máy (bộ đếm x/7, BR-02). */
  @Column({ type: 'int', default: 0 })
  noAnswerCount: number;

  /** Ngày địa phương gần nhất đã được tính vào bộ đếm x/7. */
  @Column({ type: 'date', nullable: true })
  lastNoAnswerDate: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastCallAt: Date | null;

  @Column({ type: 'int', default: 0 })
  callCount: number;

  /** Lịch gọi lại do nhân viên đặt (FR-SAL-04). */
  @Column({ type: 'timestamptz', nullable: true })
  nextCallbackAt: Date | null;

  @Column({ type: 'boolean', default: false })
  callbackNotified: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  dateModified: Date;
}
