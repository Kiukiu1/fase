import { BadRequestException } from '@nestjs/common';
import { NO_ANSWER_GIVE_UP_CALLS } from 'src/constants';
import { CallResult, LeadStatus } from '../enums';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'Trong kho',
  [LeadStatus.ASSIGNED]: 'Chờ nhận',
  [LeadStatus.RECEIVED]: 'Đã nhận – đang gọi',
  [LeadStatus.NO_ANSWER_RETRY]: 'Không nghe máy / Gọi tiếp',
  [LeadStatus.NO_ANSWER_GIVE_UP]: 'Không nghe máy / Từ bỏ',
  [LeadStatus.NO_NEED]: 'Không có nhu cầu',
  [LeadStatus.NOT_FIT]: 'Không đáp ứng',
  [LeadStatus.CONTACTED]: 'Đã liên hệ',
  [LeadStatus.NURTURING]: 'Đang chăm sóc',
  [LeadStatus.DEMO_QUOTED]: 'Đã demo / báo giá',
  [LeadStatus.WON]: 'Đã chốt',
  [LeadStatus.STOPPED]: 'Dừng',
  [LeadStatus.WRONG_NUMBER]: 'Sai số',
};

/** Trạng thái nhân viên đang chăm sóc (được gọi, ghi kết quả). */
export const ACTIVE_CARE_STATUSES = [
  LeadStatus.RECEIVED,
  LeadStatus.NO_ANSWER_RETRY,
  LeadStatus.CONTACTED,
  LeadStatus.NURTURING,
  LeadStatus.DEMO_QUOTED,
];

export const TERMINAL_STATUSES = [
  LeadStatus.NO_ANSWER_GIVE_UP,
  LeadStatus.NO_NEED,
  LeadStatus.NOT_FIT,
  LeadStatus.WON,
  LeadStatus.STOPPED,
  LeadStatus.WRONG_NUMBER,
];

/** BR-08: trạng thái kết thúc được mở lại để phân lại (Đã chốt thì không). */
export const REOPENABLE_STATUSES: LeadStatus[] = TERMINAL_STATUSES.filter(
  (status) => status !== LeadStatus.WON,
);

/** Kết quả khi khách đã nghe máy và trao đổi (thoát luồng đếm x/7). */
const ANSWERED_OUTCOMES = [
  LeadStatus.CONTACTED,
  LeadStatus.NURTURING,
  LeadStatus.NO_NEED,
  LeadStatus.NOT_FIT,
  LeadStatus.WRONG_NUMBER,
  LeadStatus.STOPPED,
];

/**
 * Bảng chuyển trạng thái nhân viên được tự chọn (mục 6.2).
 * Chuyển do hệ thống làm (phân, nhận, trả kho, tự Từ bỏ) không nằm ở đây.
 */
export const SALES_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [],
  [LeadStatus.ASSIGNED]: [],
  [LeadStatus.RECEIVED]: [LeadStatus.NO_ANSWER_RETRY, ...ANSWERED_OUTCOMES],
  [LeadStatus.NO_ANSWER_RETRY]: ANSWERED_OUTCOMES,
  [LeadStatus.CONTACTED]: [
    LeadStatus.NURTURING,
    LeadStatus.DEMO_QUOTED,
    LeadStatus.NO_NEED,
    LeadStatus.NOT_FIT,
    LeadStatus.WRONG_NUMBER,
    LeadStatus.STOPPED,
  ],
  [LeadStatus.NURTURING]: [
    LeadStatus.DEMO_QUOTED,
    LeadStatus.WON,
    LeadStatus.NO_NEED,
    LeadStatus.NOT_FIT,
    LeadStatus.STOPPED,
  ],
  [LeadStatus.DEMO_QUOTED]: [
    LeadStatus.WON,
    LeadStatus.NURTURING,
    LeadStatus.NO_NEED,
    LeadStatus.NOT_FIT,
    LeadStatus.STOPPED,
  ],
  [LeadStatus.NO_ANSWER_GIVE_UP]: [],
  [LeadStatus.NO_NEED]: [],
  [LeadStatus.NOT_FIT]: [],
  [LeadStatus.WON]: [],
  [LeadStatus.STOPPED]: [],
  [LeadStatus.WRONG_NUMBER]: [],
};

/** Khi khách không nghe máy, nhân viên chỉ được ghi các trạng thái này. */
export const NO_ANSWER_OUTCOMES = [
  LeadStatus.NO_ANSWER_RETRY,
  LeadStatus.WRONG_NUMBER,
  LeadStatus.STOPPED,
];

export const isTerminal = (status: LeadStatus) =>
  TERMINAL_STATUSES.includes(status);

export function assertSalesTransition(
  from: LeadStatus,
  to: LeadStatus,
  reason?: string | null,
) {
  if (!SALES_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Không thể chuyển từ "${STATUS_LABELS[from]}" sang "${STATUS_LABELS[to]}"`,
    );
  }
  if (to === LeadStatus.STOPPED && !reason?.trim()) {
    throw new BadRequestException('Chuyển sang "Dừng" bắt buộc nhập lý do');
  }
}

export interface CallPlanInput {
  status: LeadStatus;
  noAnswerCount: number;
  lastNoAnswerDate: string | null;
  result: CallResult;
  requestedStatus?: LeadStatus | null;
  reason?: string | null;
  today: string;
}

export interface CallPlan {
  /** Trạng thái mới (null = giữ nguyên). */
  nextStatus: LeadStatus | null;
  /** BR-02: đủ 7 ngày không nghe máy -> hệ thống tự chuyển Từ bỏ. */
  autoGiveUp: boolean;
  /** Cuộc gọi này có được tính vào bộ đếm x/7 không. */
  counted: boolean;
  noAnswerCount: number;
  lastNoAnswerDate: string | null;
}

/**
 * Quyết định kết quả của một lần ghi cuộc gọi (FR-SAL-03, BR-02, BR-06).
 * Bộ đếm x/7 chỉ tăng tối đa 1 lần mỗi ngày và chỉ khi LEAD đang ở luồng
 * "Không nghe máy / Gọi tiếp".
 */
export function planCall(input: CallPlanInput): CallPlan {
  const { status, result, reason, today } = input;
  if (!ACTIVE_CARE_STATUSES.includes(status)) {
    throw new BadRequestException(
      `LEAD đang ở trạng thái "${STATUS_LABELS[status]}", không thể ghi cuộc gọi`,
    );
  }
  const unchanged = {
    nextStatus: null,
    autoGiveUp: false,
    counted: false,
    noAnswerCount: input.noAnswerCount,
    lastNoAnswerDate: input.lastNoAnswerDate,
  };
  const inNoAnswerFlow =
    status === LeadStatus.RECEIVED || status === LeadStatus.NO_ANSWER_RETRY;
  const requested =
    input.requestedStatus && input.requestedStatus !== status
      ? input.requestedStatus
      : null;

  if (result === CallResult.NO_ANSWER && inNoAnswerFlow) {
    const target = requested ?? LeadStatus.NO_ANSWER_RETRY;
    if (!NO_ANSWER_OUTCOMES.includes(target)) {
      throw new BadRequestException(
        'Khách không nghe máy thì chỉ chọn được "Không nghe máy / Gọi tiếp", "Sai số" hoặc "Dừng"',
      );
    }
    if (target !== status) assertSalesTransition(status, target, reason);
    if (target !== LeadStatus.NO_ANSWER_RETRY) {
      return { ...unchanged, nextStatus: target };
    }
    const counted = input.lastNoAnswerDate !== today;
    const noAnswerCount = input.noAnswerCount + (counted ? 1 : 0);
    return {
      nextStatus: target === status ? null : target,
      autoGiveUp: noAnswerCount >= NO_ANSWER_GIVE_UP_CALLS,
      counted,
      noAnswerCount,
      lastNoAnswerDate: today,
    };
  }

  if (result === CallResult.ANSWERED && inNoAnswerFlow && !requested) {
    throw new BadRequestException(
      'Khách đã nghe máy, vui lòng chọn trạng thái chăm sóc mới',
    );
  }
  if (requested === LeadStatus.NO_ANSWER_RETRY) {
    throw new BadRequestException(
      'Khách đã nghe máy thì không chọn "Không nghe máy / Gọi tiếp"',
    );
  }
  if (requested) assertSalesTransition(status, requested, reason);
  return { ...unchanged, nextStatus: requested };
}
