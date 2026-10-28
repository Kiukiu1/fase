import type { LeadStatus } from '../types/lead'

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Trong kho',
  ASSIGNED: 'Chờ nhận',
  RECEIVED: 'Đã nhận – đang gọi',
  NO_ANSWER_RETRY: 'Không nghe máy / Gọi tiếp',
  NO_ANSWER_GIVE_UP: 'Không nghe máy / Từ bỏ',
  NO_NEED: 'Không có nhu cầu',
  NOT_FIT: 'Không đáp ứng',
  CONTACTED: 'Đã liên hệ',
  NURTURING: 'Đang chăm sóc',
  DEMO_QUOTED: 'Đã demo / báo giá',
  WON: 'Đã chốt',
  STOPPED: 'Dừng',
  WRONG_NUMBER: 'Sai số',
}

export type StatusTone = 'neutral' | 'warning' | 'info' | 'primary' | 'purple' | 'success' | 'danger' | 'muted'

export const STATUS_TONES: Record<LeadStatus, StatusTone> = {
  NEW: 'neutral',
  ASSIGNED: 'warning',
  RECEIVED: 'info',
  NO_ANSWER_RETRY: 'warning',
  NO_ANSWER_GIVE_UP: 'muted',
  NO_NEED: 'muted',
  NOT_FIT: 'muted',
  CONTACTED: 'info',
  NURTURING: 'primary',
  DEMO_QUOTED: 'purple',
  WON: 'success',
  STOPPED: 'danger',
  WRONG_NUMBER: 'danger',
}

/** Trạng thái nhân viên đang chăm sóc (dùng cho bộ lọc). */
export const ACTIVE_STATUSES: LeadStatus[] = ['RECEIVED', 'NO_ANSWER_RETRY', 'CONTACTED', 'NURTURING', 'DEMO_QUOTED']

export const CLOSED_STATUSES: LeadStatus[] = ['WON', 'NO_ANSWER_GIVE_UP', 'NO_NEED', 'NOT_FIT', 'STOPPED', 'WRONG_NUMBER']
