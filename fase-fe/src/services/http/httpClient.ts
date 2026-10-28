import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '../../config/env'
import { refreshSession } from '../auth/refreshSession'
import { tokenStorage } from '../auth/tokenStorage'

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

export const http = axios.create({
  baseURL: API_URL,
  timeout: 60_000,
})

http.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const canRetry = error.response?.status === 401 && original && !original._retried && tokenStorage.getRefreshToken()

    if (!canRetry) throw error

    original._retried = true
    await refreshSession()
    return http(original)
  },
)
