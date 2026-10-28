const RETURN_TO_KEY = 'fase.returnTo'

function isSafePath(path: string | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//')
}

export function rememberReturnTo(path: string | null) {
  try {
    if (isSafePath(path)) sessionStorage.setItem(RETURN_TO_KEY, path)
    else sessionStorage.removeItem(RETURN_TO_KEY)
  } catch {}
}

export function consumeReturnTo(fallback = '/'): string {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY)
    sessionStorage.removeItem(RETURN_TO_KEY)
    return isSafePath(path) ? path : fallback
  } catch {
    return fallback
  }
}
