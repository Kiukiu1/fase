import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { LeadStatus } from '../../enums';
import { LeadImports } from '../entity/lead-import.entity';
import { Leads } from '../entity/lead.entity';
import {
  ImportAction,
  ImportRow,
  readWorkbook,
  validateRows,
} from './lead-import.parser';

const CHUNK_SIZE = 500;
const MAX_FILE_NAME = 255;

const chunk = <T>(items: T[], size = CHUNK_SIZE) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

export interface ImportSummary {
  total: number;
  create: number;
  overwrite: number;
  error: number;
}

export const summarize = (rows: ImportRow[]): ImportSummary => ({
  total: rows.length,
  create: rows.filter((row) => row.action === ImportAction.CREATE).length,
  overwrite: rows.filter((row) => row.action === ImportAction.OVERWRITE).length,
  error: rows.filter((row) => row.action === ImportAction.ERROR).length,
});

@Injectable()
export class LeadImportBean {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(LeadImports)
    private readonly importRepository: Repository<LeadImports>,
  ) {}

  /**
   * BR-09: dòng trùng MST hoặc SĐT với LEAD đã có trong kho của trưởng phòng
   * sẽ ghi đè. Nếu MST khớp một LEAD còn SĐT khớp LEAD khác thì không đoán, báo lỗi.
   */
  private async classify(
    manager: EntityManager,
    managerId: string,
    validated: ImportRow[],
  ) {
    const rows = validated.map((row) => ({
      ...row,
      fileErrors: row.fileErrors ?? row.errors,
      errors: [...(row.fileErrors ?? row.errors)],
      existingLeadId: undefined as number | undefined,
      action: (row.fileErrors ?? row.errors).length
        ? ImportAction.ERROR
        : ImportAction.CREATE,
    }));
    const valid = rows.filter((row) => row.action !== ImportAction.ERROR);
    const existing: Pick<Leads, 'id' | 'mst' | 'phone'>[] = [];
    for (const part of chunk(valid)) {
      existing.push(
        ...(await manager.getRepository(Leads).find({
          select: { id: true, mst: true, phone: true },
          where: [
            { managerId, mst: In(part.map((row) => row.mst)) },
            { managerId, phone: In(part.map((row) => row.phone)) },
          ],
        })),
      );
    }
    const idByMst = new Map(existing.map((lead) => [lead.mst, lead.id]));
    const idByPhone = new Map(existing.map((lead) => [lead.phone, lead.id]));
    const rowOfLead = new Map<number, number>();

    for (const row of valid) {
      const ids = [
        ...new Set([idByMst.get(row.mst), idByPhone.get(row.phone)].filter(
          (id): id is number => id !== undefined,
        )),
      ];
      if (ids.length > 1) {
        row.errors.push(
          'MST và SĐT đang trùng với 2 LEAD khác nhau trong kho, vui lòng kiểm tra lại',
        );
        row.action = ImportAction.ERROR;
      } else if (ids.length === 1) {
        const firstRow = rowOfLead.get(ids[0]);
        if (firstRow) {
          row.errors.push(`Cùng ghi đè một LEAD với dòng ${firstRow}`);
          row.action = ImportAction.ERROR;
        } else {
          rowOfLead.set(ids[0], row.rowNumber);
          row.existingLeadId = ids[0];
          row.action = ImportAction.OVERWRITE;
        }
      }
    }
    return rows;
  }

  /** FR-CRM-01: parse + validate + phân loại, lưu lại để xem trước. */
  async preview(managerId: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file .xlsx');
    if (!/\.xlsx$/i.test(file.originalname)) {
      throw new BadRequestException('Chỉ chấp nhận file .xlsx');
    }
    const rows = await this.classify(
      this.dataSource.manager,
      managerId,
      validateRows(await readWorkbook(file.buffer)),
    );
    const fileName = Buffer.from(file.originalname, 'latin1')
      .toString('utf8')
      .slice(0, MAX_FILE_NAME);
    return this.importRepository.save({ managerId, fileName, rows, confirmedAt: null });
  }

  recent(managerId: string, limit: number) {
    return this.importRepository.find({
      select: {
        id: true,
        fileName: true,
        createdCount: true,
        overwrittenCount: true,
        confirmedAt: true,
        dateCreated: true,
      },
      where: { managerId },
      order: { dateCreated: 'DESC' },
      take: limit,
    });
  }

  async findPreview(managerId: string, id: number) {
    const leadImport = await this.importRepository.findOne({ where: { id, managerId } });
    if (!leadImport) throw new NotFoundException('Không tìm thấy lượt import');
    return leadImport;
  }

  /**
   * Trưởng phòng xác nhận: phân loại lại ngay lúc ghi (kho có thể đã đổi từ lúc
   * xem trước), tạo mới + ghi đè trong một transaction. Ghi đè chỉ cập nhật thông
   * tin, giữ nguyên trạng thái / người được phân / lịch sử.
   */
  async confirm(managerId: string, id: number) {
    return this.dataSource.transaction(async (manager) => {
      const leadImport = await manager
        .getRepository(LeadImports)
        .createQueryBuilder('import')
        .setLock('pessimistic_write')
        .where('import.id = :id AND import.managerId = :managerId', { id, managerId })
        .getOne();
      if (!leadImport) throw new NotFoundException('Không tìm thấy lượt import');
      if (leadImport.confirmedAt) {
        throw new ConflictException('Lượt import này đã được xác nhận trước đó');
      }
      // Khoá theo kho để hai lượt import song song của cùng trưởng phòng không tạo trùng.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [managerId]);

      const rows = await this.classify(manager, managerId, leadImport.rows);
      const creates = rows.filter((row) => row.action === ImportAction.CREATE);
      const overwrites = rows.filter((row) => row.action === ImportAction.OVERWRITE);

      for (const part of chunk(creates)) {
        await manager.getRepository(Leads).insert(
          part.map((row) => ({
            mst: row.mst,
            phone: row.phone,
            address: row.address,
            servicePackage: row.servicePackage,
            interestedDate: row.interestedDate,
            status: LeadStatus.NEW,
            managerId,
          })),
        );
      }
      for (const part of chunk(overwrites)) {
        const params: unknown[] = [managerId];
        const values = part.map((row) => {
          params.push(row.existingLeadId, row.mst, row.phone, row.address, row.servicePackage, row.interestedDate);
          const base = params.length - 6;
          return `($${base + 1}::int, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::date)`;
        });
        await manager.query(
          `UPDATE "lead" AS l SET mst = v.mst, phone = v.phone, address = v.address,
             service_package = v.service_package, interested_date = v.interested_date,
             date_modified = now()
           FROM (VALUES ${values.join(', ')}) AS v(id, mst, phone, address, service_package, interested_date)
           WHERE l.id = v.id AND l.manager_id = $1`,
          params,
        );
      }

      Object.assign(leadImport, {
        rows,
        confirmedAt: new Date(),
        createdCount: creates.length,
        overwrittenCount: overwrites.length,
      });
      await manager.getRepository(LeadImports).save(leadImport);
      return leadImport;
    });
  }
}
