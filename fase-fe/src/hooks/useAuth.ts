import { useSyncExternalStore } from 'react'
import { tokenStorage } from '../services/auth/tokenStorage'

export function useAuth() {
  const session = useSyncExternalStore(tokenStorage.subscribe, tokenStorage.getSession)

  return {
    user: session?.user ?? null,
    isAuthenticated: session !== null,
    signOut: tokenStorage.clear,
  }
}
