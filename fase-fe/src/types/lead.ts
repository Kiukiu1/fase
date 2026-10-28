export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'RECEIVED'
  | 'NO_ANSWER_RETRY'
  | 'NO_ANSWER_GIVE_UP'
  | 'NO_NEED'
  | 'NOT_FIT'
  | 'CONTACTED'
  | 'NURTURING'
  | 'DEMO_QUOTED'
  | 'WON'
  | 'STOPPED'
  | 'WRONG_NUMBER'

export type CallResult = 'ANSWERED' | 'NO_ANSWER'

export type SalesDue = 'CALLBACK' | 'NOT_CALLED_TODAY' | 'CARE_EXPIRING'

export interface Countdown {
  remainingSeconds: number
  paused: boolean
  resumeAt: string | null
}

export interface Lead {
  id: number
  mst: string
  phone: string
  address: string
  servicePackage: string
  interestedDate: string
  status: LeadStatus
  statusLabel: string
  assignedAt: string | null
  receiveDeadline: string | null
  receivedAt: string | null
  noAnswerCount: number
  noAnswerLimit: number
  calledToday: boolean
  lastCallAt: string | null
  callCount: number
  nextCallbackAt: string | null
  careDeadline: string | null
}

export interface PendingLead extends Lead {
  countdown: Countdown
}

export interface TimelineItem {
  at: string
  kind: 'ASSIGNMENT' | 'CALL' | 'STATUS'
  title: string
  detail: string | null
  actorName: string
}

export interface LeadDetail extends Lead {
  countdown: Countdown | null
  callOutcomes: Record<CallResult, LeadStatus[]> | null
  allowedStatuses: LeadStatus[]
  timeline: TimelineItem[]
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface SalesSummary {
  byStatus: Record<LeadStatus, number>
  pending: number
  active: number
  due: Record<SalesDue, number>
}

export interface LogCallInput {
  result: CallResult
  durationMinutes?: number
  note?: string
  status?: LeadStatus
  reason?: string
}

export interface AppNotification {
  id: number
  type: string
  content: string
  leadId: number | null
  readAt: string | null
  dateCreated: string
}
