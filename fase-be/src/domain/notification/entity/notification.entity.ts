import { TABLES_NAME } from 'src/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../../enums';

/** Thông báo in-app (FR-COM-03). */
@Entity(TABLES_NAME.NOTIFICATIONS)
@Index(['userId', 'readAt'])
export class Notifications {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;
}
