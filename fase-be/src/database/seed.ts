import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source.options';
import { ActiveStatus, LeadStatus, UserRole } from '../domain/enums';
import { Users } from '../domain/user/entity/user.entity';
import { hashPassword } from '../domain/user/user.bean';
import { Leads } from '../domain/lead/entity/lead.entity';
import { CallLogs } from '../domain/lead/entity/call-log.entity';
import { LeadStatusHistory } from '../domain/lead/entity/lead-status-history.entity';
import { LeadAssignments } from '../domain/lead/entity/lead-assignment.entity';
import { LeadImports } from '../domain/lead/entity/lead-import.entity';
import { Notifications } from '../domain/notification/entity/notification.entity';
dotenv.config();

/**
 * Hệ thống không có đăng ký: script này đóng vai "quản trị viên tạo tài khoản
 * trong DB". Chạy lại nhiều lần không tạo trùng.
 *   npm run seed            -> tài khoản mẫu + 30 LEAD trong kho
 *   SEED_LEADS=0 npm run seed -> chỉ tài khoản
 */
const PASSWORD = process.env.SEED_PASSWORD || 'Fase@123';
const LEAD_COUNT = Number(process.env.SEED_LEADS ?? 30);

const PACKAGES = ['Gói Kế toán Pro', 'Gói Hoá đơn điện tử', 'Gói Chữ ký số', 'Gói Bảo hiểm XH'];
const STREETS = ['Trần Duy Hưng', 'Nguyễn Trãi', 'Láng Hạ', 'Kim Mã', 'Lê Văn Lương', 'Phạm Hùng'];

async function upsertUser(
  dataSource: DataSource,
  data: Pick<Users, 'username' | 'email' | 'fullName' | 'role'> & { managerId?: string | null },
) {
  const repository = dataSource.getRepository(Users);
  const existing = await repository.findOne({ where: { username: data.username } });
  if (existing) return existing;
  return repository.save({
    ...data,
    managerId: data.managerId ?? null,
    password: await hashPassword(PASSWORD),
    status: ActiveStatus.ACTIVE,
  });
}

async function main() {
  const dataSource = new DataSource({
    ...dataSourceOptions(),
    entities: [Users, Leads, CallLogs, LeadStatusHistory, LeadAssignments, LeadImports, Notifications],
  });
  await dataSource.initialize();

  const manager = await upsertUser(dataSource, {
    username: 'truongphong',
    email: 'truongphong@fase.vn',
    fullName: 'Nguyễn Văn Trưởng',
    role: UserRole.MANAGER,
  });
  const salesNames = ['Trần Thị An', 'Lê Văn Bình', 'Phạm Thu Cúc'];
  for (const [index, fullName] of salesNames.entries()) {
    await upsertUser(dataSource, {
      username: `sales${index + 1}`,
      email: `sales${index + 1}@fase.vn`,
      fullName,
      role: UserRole.SALES,
      managerId: manager.id,
    });
  }

  const leadRepository = dataSource.getRepository(Leads);
  const existingLeads = await leadRepository.count({ where: { managerId: manager.id } });
  if (LEAD_COUNT > 0 && existingLeads === 0) {
    await leadRepository.insert(
      Array.from({ length: LEAD_COUNT }, (_, index) => ({
        mst: String(100000000 + index * 7919).padStart(10, '0'),
        phone: `09${String(10000000 + index * 3571).slice(0, 8)}`,
        address: `${index + 1} ${STREETS[index % STREETS.length]}, Hà Nội`,
        servicePackage: PACKAGES[index % PACKAGES.length],
        interestedDate: new Date(Date.now() - index * 86_400_000).toISOString().slice(0, 10),
        status: LeadStatus.NEW,
        managerId: manager.id,
      })),
    );
  }

  console.log('Seed xong. Mật khẩu chung:', PASSWORD);
  console.log('  Fase-CRM  : truongphong');
  console.log('  Fase-Sales: sales1, sales2, sales3');
  console.log(`  LEAD của trưởng phòng: ${existingLeads || LEAD_COUNT}`);
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
