import type { AuthSession } from '../../types/auth'
import { isTokenExpired } from '../../utils/jwt'

const SESSION_KEY = 'fase.session'

type Listener = () => void
const listeners = new Set<Listener>()

let session: AuthSession | null = readFromStorage()

function readFromStorage(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    return isTokenExpired(parsed.refreshToken) ? null : parsed
  } catch {
    return null
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function write(next: AuthSession | null) {
  session = next
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  } catch {}
  notify()
}

export const tokenStorage = {
  getSession: () => session,
  getAccessToken: () => session?.accessToken ?? null,
  getRefreshToken: () => session?.refreshToken ?? null,

  save(next: AuthSession) {
    write(next)
  },

  clear() {
    write(null)
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

window.addEventListener('storage', (event) => {
  if (event.key !== SESSION_KEY) return
  session = readFromStorage()
  notify()
})
