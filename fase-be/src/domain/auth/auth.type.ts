import type { UserRole } from '../enums';

export interface UserJwtPayload {
  sub: string;
  role: UserRole;
}

export interface AuthUserView {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}
