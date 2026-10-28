import { BadRequestException } from '@nestjs/common';

export enum SplitMode {
  /** Chia đều lần lượt (round-robin) theo thứ tự nhân viên đã chọn. */
  EVEN = 'EVEN',
  /** Trưởng phòng nhập số lượng cho từng nhân viên. */
  MANUAL = 'MANUAL',
}

export const MAX_LEADS_PER_ASSIGN = 2000;

/** Chia danh sách LEAD cho các nhân viên (FR-CRM-04). Trả về salesId -> leadIds. */
export function splitLeads(
  leadIds: number[],
  salesIds: string[],
  mode: SplitMode,
  counts: Record<string, number> = {},
): Map<string, number[]> {
  if (!leadIds.length) throw new BadRequestException('Cần chọn ít nhất một LEAD');
  if (leadIds.length > MAX_LEADS_PER_ASSIGN) {
    throw new BadRequestException(
      `Mỗi lần chỉ phân tối đa ${MAX_LEADS_PER_ASSIGN} LEAD`,
    );
  }
  if (!salesIds.length) throw new BadRequestException('Cần chọn ít nhất một nhân viên');

  const plan = new Map<string, number[]>(salesIds.map((id) => [id, []]));
  if (mode === SplitMode.EVEN) {
    leadIds.forEach((leadId, index) => {
      plan.get(salesIds[index % salesIds.length])!.push(leadId);
    });
    return plan;
  }

  const wanted = salesIds.map((id) => {
    const count = Number(counts[id] ?? 0);
    if (!Number.isInteger(count) || count < 0) {
      throw new BadRequestException('Số lượng chia cho mỗi nhân viên phải là số nguyên ≥ 0');
    }
    return count;
  });
  const total = wanted.reduce((sum, count) => sum + count, 0);
  if (total !== leadIds.length) {
    throw new BadRequestException(
      `Tổng số lượng chia (${total}) phải bằng số LEAD đã chọn (${leadIds.length})`,
    );
  }
  let cursor = 0;
  salesIds.forEach((id, index) => {
    plan.get(id)!.push(...leadIds.slice(cursor, cursor + wanted[index]));
    cursor += wanted[index];
  });
  return plan;
}
