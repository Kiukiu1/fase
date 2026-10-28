import { http } from '../http/httpClient'

export const accountApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    http.put<{ message: string }>('/auth/password', { currentPassword, newPassword }).then((res) => res.data),
}
