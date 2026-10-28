import type { AppNotification, Paged } from '../../types/lead'
import { http } from '../http/httpClient'

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  list: (page: number) => ['notifications', 'list', page] as const,
}

export const notificationApi = {
  list: (page: number) =>
    http.get<Paged<AppNotification>>('/notifications', { params: { page } }).then((res) => res.data),

  unreadCount: () =>
    http.get<{ count: number }>('/notifications/unread-count').then((res) => res.data.count),

  read: (id: number) => http.post(`/notifications/${id}/read`),

  readAll: () => http.post('/notifications/read-all'),
}
