export const PATHS = {
  home: '/',
  login: '/login',
  leads: '/leads',
  leadDetail: (leadId: number | string) => `/leads/${leadId}`,
  notifications: '/notifications',
  password: '/settings/password',
} as const
