import type { Request } from 'express';
import { UserRole } from 'src/domain/enums';
import type { Users } from 'src/domain/user/entity/user.entity';

export const CMS_SESSION_COOKIE = 'fase.cms.sid';

/** Fase-CRM chỉ dành cho trưởng phòng. */
export const canEnterCms = (user?: Pick<Users, 'role'> | null) =>
  user?.role === UserRole.MANAGER;

const sessionStep = (step: (done: (error?: Error) => void) => void) =>
  new Promise<void>((resolve, reject) =>
    step((error) => (error ? reject(error) : resolve())),
  );

export async function startCmsSession(request: Request, user: Users) {
  if (!canEnterCms(user)) return false;
  await sessionStep((done) => request.session.regenerate(done));
  request.session.userId = user.id;
  await sessionStep((done) => request.session.save(done));
  return true;
}
