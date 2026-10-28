import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationBean } from 'src/domain/notification/notification.bean';
import { UserBean } from 'src/domain/user/user.bean';
import { canEnterCms } from './util/cms.auth';
import type { CmsRequest } from './util/cms.helper';

@Injectable()
export class CmsSessionGuard implements CanActivate {
  constructor(
    private readonly userBean: UserBean,
    private readonly notificationBean: NotificationBean,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CmsRequest>();
    const userId = request.session.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.userBean.findActiveById(userId);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    if (!canEnterCms(user)) throw new ForbiddenException();
    request.unreadCount = await this.notificationBean.unreadCount(user.id);
    return true;
  }
}
