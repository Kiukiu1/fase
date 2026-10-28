import ExcelJS from 'exceljs';
import {
  buildTemplate,
  ImportAction,
  normalizeDate,
  normalizeMst,
  normalizePhone,
  RawRow,
  readWorkbook,
  validateRows,
} from './lead-import.parser';

const raw = (overrides: Partial<RawRow> = {}): RawRow => ({
  rowNumber: 2,
  mst: '0101234567',
  phone: '0912345678',
  address: 'Hà Nội',
  servicePackage: 'Gói A',
  interestedDate: '28/10/2026',
  ...overrides,
});

describe('chuẩn hoá dữ liệu', () => {
  it('SĐT', () => {
    expect(normalizePhone('0912 345 678')).toBe('0912345678');
    expect(normalizePhone('+84912345678')).toBe('0912345678');
    expect(normalizePhone(912345678)).toBe('0912345678');
    expect(normalizePhone('12345')).toBeNull();
  });

  it('MST', () => {
    expect(normalizeMst('0101234567')).toBe('0101234567');
    expect(normalizeMst('0101234567-001')).toBe('0101234567-001');
    expect(normalizeMst('0101234567001')).toBe('0101234567-001');
    expect(normalizeMst(101234567)).toBe('0101234567');
    expect(normalizeMst('ABC')).toBeNull();
  });

  it('ngày quan tâm', () => {
    expect(normalizeDate('28/10/2026')).toBe('2026-10-28');
    expect(normalizeDate('2026-10-28')).toBe('2026-10-28');
    expect(normalizeDate(new Date(Date.UTC(2026, 9, 28)))).toBe('2026-10-28');
    expect(normalizeDate(46323)).toBe('2026-10-28');
    expect(normalizeDate('31/02/2026')).toBeNull();
  });
});

describe('validateRows', () => {
  it('dòng hợp lệ là tạo mới', () => {
    const [row] = validateRows([raw()]);
    expect(row.action).toBe(ImportAction.CREATE);
    expect(row.errors).toEqual([]);
  });

  it('báo lỗi thiếu cột và sai định dạng trên từng dòng', () => {
    const [row] = validateRows([
      raw({ mst: '', phone: 'abc', address: null, interestedDate: '99/99/2026' }),
    ]);
    expect(row.action).toBe(ImportAction.ERROR);
    expect(row.errors).toEqual([
      'Thiếu MST',
      'SĐT không hợp lệ (10 số, bắt đầu bằng 0)',
      'Thiếu địa chỉ',
      'Ngày quan tâm không hợp lệ (dd/mm/yyyy)',
    ]);
  });

  it('trùng MST hoặc SĐT trong cùng file thì dòng sau bị lỗi', () => {
    const rows = validateRows([
      raw(),
      raw({ rowNumber: 3, phone: '0987654321' }),
      raw({ rowNumber: 4, mst: '0109999999' }),
    ]);
    expect(rows[0].action).toBe(ImportAction.CREATE);
    expect(rows[1].errors).toEqual(['Trùng MST với dòng 2 trong file']);
    expect(rows[2].errors).toEqual(['Trùng SĐT với dòng 2 trong file']);
  });
});

describe('readWorkbook', () => {
  it('đọc được file mẫu', async () => {
    const rows = await readWorkbook(await buildTemplate());
    expect(rows).toHaveLength(1);
    expect(validateRows(rows)[0].action).toBe(ImportAction.CREATE);
  });

  it('báo thiếu cột bắt buộc', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('x').addRow(['MST', 'SĐT']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(readWorkbook(buffer)).rejects.toThrow(
      'File thiếu cột bắt buộc: Địa chỉ, Gói dịch vụ, Ngày quan tâm',
    );
  });

  it('báo file không phải xlsx', async () => {
    await expect(readWorkbook(Buffer.from('not excel'))).rejects.toThrow(
      'File không đúng định dạng .xlsx',
    );
  });
});
