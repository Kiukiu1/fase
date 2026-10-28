export enum ActiveStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum UserRole {
  MANAGER = 'manager',
  SALES = 'sales',
}

export enum LeadStatus {
  /** Trong kho, chưa phân (gồm cả LEAD bị trả về / mở lại). */
  NEW = 'NEW',
  /** Đã phân, chờ nhân viên nhận trong 2h giờ hành chính. */
  ASSIGNED = 'ASSIGNED',
  /** Nhân viên đã nhận và đang gọi, chưa ghi kết quả cuộc gọi đầu. */
  RECEIVED = 'RECEIVED',
  NO_ANSWER_RETRY = 'NO_ANSWER_RETRY',
  NO_ANSWER_GIVE_UP = 'NO_ANSWER_GIVE_UP',
  NO_NEED = 'NO_NEED',
  NOT_FIT = 'NOT_FIT',
  CONTACTED = 'CONTACTED',
  NURTURING = 'NURTURING',
  DEMO_QUOTED = 'DEMO_QUOTED',
  WON = 'WON',
  STOPPED = 'STOPPED',
  WRONG_NUMBER = 'WRONG_NUMBER',
}

export enum CallResult {
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO_ANSWER',
}

export enum AssignmentAction {
  ASSIGN = 'ASSIGN',
  RECEIVE = 'RECEIVE',
  AUTO_RETURN = 'AUTO_RETURN',
  REVOKE = 'REVOKE',
  REOPEN = 'REOPEN',
}

export enum NotificationType {
  LEAD_ASSIGNED = 'LEAD_ASSIGNED',
  RECEIVE_EXPIRING = 'RECEIVE_EXPIRING',
  LEAD_RETURNED = 'LEAD_RETURNED',
  LEAD_REVOKED = 'LEAD_REVOKED',
  CALLBACK_DUE = 'CALLBACK_DUE',
  AUTO_GIVE_UP = 'AUTO_GIVE_UP',
}
