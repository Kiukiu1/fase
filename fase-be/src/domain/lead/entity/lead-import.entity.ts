import { TABLES_NAME } from 'src/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ImportRow } from '../import/lead-import.parser';

/** Kết quả parse file xlsx, giữ lại để trưởng phòng xem trước rồi mới xác nhận. */
@Entity(TABLES_NAME.LEAD_IMPORTS)
export class LeadImports {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  managerId: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'jsonb' })
  rows: ImportRow[];

  @Column({ type: 'int', default: 0 })
  createdCount: number;

  @Column({ type: 'int', default: 0 })
  overwrittenCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;
}
