export const TABLES_NAME = {
  USERS: 'user',
  LEADS: 'lead',
  CALL_LOGS: 'call_log',
  LEAD_STATUS_HISTORY: 'lead_status_history',
  LEAD_ASSIGNMENTS: 'lead_assignment',
  LEAD_IMPORTS: 'lead_import',
  NOTIFICATIONS: 'notification',
};

/** Hạn nhận LEAD tính theo phút giờ hành chính (BR-01). */
export const RECEIVE_LIMIT_MINUTES = 120;
/** Còn bấy nhiêu phút giờ hành chính thì nhắc "sắp hết hạn nhận". */
export const RECEIVE_WARNING_MINUTES = 30;
/** Số ngày gọi không nghe máy thì từ bỏ (BR-02). */
export const NO_ANSWER_GIVE_UP_CALLS = 7;
/** Số ngày lịch kể từ lúc nhận mà LEAD "Đã liên hệ" phải tiến triển (BR-03). */
export const CONTACTED_CARE_DAYS = 7;
