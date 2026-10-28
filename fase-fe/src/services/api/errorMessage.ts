import { isAxiosError } from 'axios'

/** Lấy câu thông báo lỗi tiếng Việt do BE trả về. */
export function errorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại') {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (message) return message
    if (!error.response) return 'Không kết nối được máy chủ'
  }
  return fallback
}
