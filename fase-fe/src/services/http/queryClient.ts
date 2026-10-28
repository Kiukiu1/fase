import { QueryClient } from '@tanstack/react-query'
import { tokenStorage } from '../auth/tokenStorage'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

tokenStorage.subscribe(() => {
  if (!tokenStorage.getSession()) queryClient.clear()
})
