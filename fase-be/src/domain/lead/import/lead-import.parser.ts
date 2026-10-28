import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

export const MAX_IMPORT_ROWS = 10_000;

export enum ImportAction {
  CREATE = 'CREATE',
  OVERWRITE = 'OVERWRITE',
  ERROR = 'ERROR',
}

export interface LeadFields {
  mst: string;
  phone: string;
  address: string;
  servicePackage: string;
  interestedDate: string;
}

export interface ImportRow extends LeadFields {
  rowNumber: number;
  action: ImportAction;
  /** Toàn bộ lỗi hiển thị (lỗi của file + lỗi do trùng trong kho). */
  errors: string[];
  /** Lỗi chỉ phụ thuộc nội dung file, dùng để phân loại lại lúc xác nhận. */
  fileErrors?: string[];
  existingLeadId?: number;
}

type RawValue = string | number | Date | null;
export type RawRow = { rowNumber: number } & Record<keyof LeadFields, RawValue>;

/** Cột bắt buộc (mục 5.1) và các tên tiêu đề được chấp nhận (đã bỏ dấu, bỏ khoảng trắng). */
export const COLUMNS: { field: keyof LeadFields; title: string; aliases: string[] }[] = [
  { field: 'mst', title: 'MST', aliases: ['mst', 'masothue'] },
  {
    field: 'phone',
    title: 'SĐT',
    aliases: ['sdt', 'sodienthoai', 'dienthoai', 'phone'],
  },
  { field: 'address', title: 'Địa chỉ', aliases: ['diachi', 'address'] },
  {
    field: 'servicePackage',
    title: 'Gói dịch vụ',
    aliases: ['goidichvu', 'goi', 'servicepackage'],
  },
  {
    field: 'interestedDate',
    title: 'Ngày quan tâm',
    aliases: ['ngayquantam', 'interesteddate'],
  },
];

const normalizeHeader = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

function cellValue(cell: ExcelJS.Cell): RawValue {
  const value = cell.value as unknown;
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const object = value as {
      result?: unknown;
      richText?: { text: string }[];
      text?: string;
    };
    if (object.result !== undefined) {
      const result = object.result;
      return result instanceof Date || typeof result === 'number'
        ? result
        : String(result);
    }
    if (object.richText) return object.richText.map((part) => part.text).join('');
    if (object.text !== undefined) return object.text;
  }
  return String(value as string);
}

/** Đọc sheet đầu tiên; dòng 1 là tiêu đề. */
export async function readWorkbook(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException('File không đúng định dạng .xlsx');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('File không có sheet dữ liệu');

  const columnOf = new Map<keyof LeadFields, number>();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = normalizeHeader(String(cellValue(cell) ?? ''));
    const column = COLUMNS.find((item) => item.aliases.includes(header));
    if (column && !columnOf.has(column.field)) {
      columnOf.set(column.field, columnNumber);
    }
  });
  const missing = COLUMNS.filter((column) => !columnOf.has(column.field));
  if (missing.length) {
    throw new BadRequestException(
      `File thiếu cột bắt buộc: ${missing.map((column) => column.title).join(', ')}`,
    );
  }

  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw = { rowNumber } as RawRow;
    for (const column of COLUMNS) {
      raw[column.field] = cellValue(row.getCell(columnOf.get(column.field)!));
    }
    const empty = COLUMNS.every((column) => {
      const value = raw[column.field];
      return value === null || String(value).trim() === '';
    });
    if (!empty) rows.push(raw);
  });
  if (!rows.length) throw new BadRequestException('File không có dòng dữ liệu nào');
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(
      `File có ${rows.length} dòng, tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần import`,
    );
  }
  return rows;
}

const asText = (value: RawValue) =>
  value === null ? '' : value instanceof Date ? value.toISOString() : String(value).trim();

/** SĐT Việt Nam 10 số, chấp nhận +84/84 và trường hợp Excel làm mất số 0 đầu. */
export function normalizePhone(value: RawValue): string | null {
  let digits = asText(value).replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+84')) digits = '0' + digits.slice(3);
  else if (/^84\d{9}$/.test(digits)) digits = '0' + digits.slice(2);
  else if (/^[1-9]\d{8}$/.test(digits)) digits = '0' + digits;
  return /^0\d{9}$/.test(digits) ? digits : null;
}

/** MST 10 số hoặc 10 số + "-" + 3 số (chi nhánh). */
export function normalizeMst(value: RawValue): string | null {
  let text = asText(value).replace(/\s/g, '');
  if (/^\d{13}$/.test(text)) text = `${text.slice(0, 10)}-${text.slice(10)}`;
  if (/^\d{9}$/.test(text)) text = '0' + text;
  return /^\d{10}(-\d{3})?$/.test(text) ? text : null;
}

const isoDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return valid && year >= 1900 ? date.toISOString().slice(0, 10) : null;
};

/** Ngày quan tâm: ô ngày của Excel, số serial, dd/mm/yyyy hoặc yyyy-mm-dd. */
export function normalizeDate(value: RawValue): string | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const date = new Date(Math.round((value - 25569) * 86_400_000));
    return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const text = asText(value);
  let match = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(text);
  if (match) return isoDate(+match[3], +match[2], +match[1]);
  match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (match) return isoDate(+match[1], +match[2], +match[3]);
  return null;
}

/** Validate từng dòng và đánh dấu trùng MST/SĐT ngay trong file. */
export function validateRows(rawRows: RawRow[]): ImportRow[] {
  const firstRowOfMst = new Map<string, number>();
  const firstRowOfPhone = new Map<string, number>();

  return rawRows.map((raw) => {
    const errors: string[] = [];
    const mst = normalizeMst(raw.mst);
    const phone = normalizePhone(raw.phone);
    const address = asText(raw.address);
    const servicePackage = asText(raw.servicePackage);
    const interestedDate = normalizeDate(raw.interestedDate);

    if (!asText(raw.mst)) errors.push('Thiếu MST');
    else if (!mst) errors.push('MST không hợp lệ (10 số hoặc 10 số-3 số)');
    if (!asText(raw.phone)) errors.push('Thiếu SĐT');
    else if (!phone) errors.push('SĐT không hợp lệ (10 số, bắt đầu bằng 0)');
    if (!address) errors.push('Thiếu địa chỉ');
    else if (address.length > 500) errors.push('Địa chỉ quá 500 ký tự');
    if (!servicePackage) errors.push('Thiếu gói dịch vụ');
    else if (servicePackage.length > 200) errors.push('Gói dịch vụ quá 200 ký tự');
    if (!asText(raw.interestedDate)) errors.push('Thiếu ngày quan tâm');
    else if (!interestedDate) errors.push('Ngày quan tâm không hợp lệ (dd/mm/yyyy)');

    if (mst) {
      const firstRow = firstRowOfMst.get(mst);
      if (firstRow) errors.push(`Trùng MST với dòng ${firstRow} trong file`);
      else firstRowOfMst.set(mst, raw.rowNumber);
    }
    if (phone) {
      const firstRow = firstRowOfPhone.get(phone);
      if (firstRow) errors.push(`Trùng SĐT với dòng ${firstRow} trong file`);
      else firstRowOfPhone.set(phone, raw.rowNumber);
    }

    return {
      rowNumber: raw.rowNumber,
      mst: mst ?? asText(raw.mst),
      phone: phone ?? asText(raw.phone),
      address,
      servicePackage,
      interestedDate: interestedDate ?? asText(raw.interestedDate),
      errors,
      action: errors.length ? ImportAction.ERROR : ImportAction.CREATE,
    };
  });
}

/** File mẫu cho trưởng phòng tải về. */
export async function buildTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('LEAD');
  sheet.columns = COLUMNS.map((column) => ({
    header: column.title,
    key: column.field,
    width: column.field === 'address' ? 40 : 20,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    mst: '0101234567',
    phone: '0912345678',
    address: '123 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    servicePackage: 'Gói Kế toán Pro',
    interestedDate: '28/10/2026',
  });
  sheet.getColumn('mst').numFmt = '@';
  sheet.getColumn('phone').numFmt = '@';
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
