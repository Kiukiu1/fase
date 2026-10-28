import type {
  LeadDetail,
  LeadStatus,
  LogCallInput,
  Lead,
  Paged,
  PendingLead,
  SalesDue,
  SalesSummary,
} from '../../types/lead'
import { http } from '../http/httpClient'

export interface LeadListParams {
  keyword?: string
  status?: LeadStatus
  due?: SalesDue
  page?: number
}

export const leadKeys = {
  all: ['leads'] as const,
  summary: ['leads', 'summary'] as const,
  pending: ['leads', 'pending'] as const,
  list: (params: LeadListParams) => ['leads', 'list', params] as const,
  detail: (id: number) => ['leads', 'detail', id] as const,
}

export const leadApi = {
  summary: () => http.get<SalesSummary>('/sales/summary').then((res) => res.data),

  pending: () => http.get<PendingLead[]>('/sales/leads/pending').then((res) => res.data),

  list: (params: LeadListParams) =>
    http.get<Paged<Lead>>('/sales/leads', { params }).then((res) => res.data),

  detail: (id: number) => http.get<LeadDetail>(`/sales/leads/${id}`).then((res) => res.data),

  receive: (id: number) => http.post<LeadDetail>(`/sales/leads/${id}/receive`).then((res) => res.data),

  logCall: (id: number, input: LogCallInput) =>
    http
      .post<{ counted: boolean; autoGiveUp: boolean; lead: LeadDetail }>(`/sales/leads/${id}/calls`, input)
      .then((res) => res.data),

  changeStatus: (id: number, status: LeadStatus, reason?: string) =>
    http.post<LeadDetail>(`/sales/leads/${id}/status`, { status, reason }).then((res) => res.data),

  setCallback: (id: number, callbackAt: string | null) =>
    http.put<LeadDetail>(`/sales/leads/${id}/callback`, { callbackAt }).then((res) => res.data),
}
