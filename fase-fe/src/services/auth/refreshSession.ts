import { authApi } from './authApi'
import { tokenStorage } from './tokenStorage'

let pending: Promise<string> | null = null

export function refreshSession(): Promise<string> {
  pending ??= run().finally(() => {
    pending = null
  })
  return pending
}

async function run(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  try {
    const next = await authApi.refresh(refreshToken)
    tokenStorage.save(next)
    return next.accessToken
  } catch (error) {
    tokenStorage.clear()
    throw error
  }
}
