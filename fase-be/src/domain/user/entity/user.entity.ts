import { TABLES_NAME } from 'src/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActiveStatus, UserRole } from '../../enums';

/**
 * Tài khoản do quản trị viên tạo trực tiếp trong DB (không có đăng ký).
 * Nhân viên Sales luôn thuộc một trưởng phòng qua `manager`.
 */
@Entity(TABLES_NAME.USERS)
export class Users {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 200 })
  fullName: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager?: Users | null;

  @Column({ type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ type: 'varchar', length: 20, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  dateModified: Date;
}
