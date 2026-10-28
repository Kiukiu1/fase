export interface AuthUser {
  id: string
  username: string
  email: string
  fullName: string
  role: 'manager' | 'sales'
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
