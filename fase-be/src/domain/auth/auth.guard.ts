import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '../enums';
import { Users } from '../user/entity/user.entity';

const ROLES_KEY = 'roles';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const { user } = context.switchToHttp().getRequest<{ user: Users }>();
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền sử dụng chức năng này');
    }
    return true;
  }
}

/** Bắt buộc đăng nhập JWT; truyền role để giới hạn thêm (vd. chỉ sales). */
export const Authenticated = (...roles: UserRole[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
  );

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Users =>
    context.switchToHttp().getRequest<{ user: Users }>().user,
);
