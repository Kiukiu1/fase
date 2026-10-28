import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '../auth/auth.guard';
import type { Users } from '../user/entity/user.entity';
import { NotificationBean } from './notification.bean';

@ApiTags('Thông báo')
@Controller('notifications')
@Authenticated()
export class NotificationController {
  constructor(private readonly notificationBean: NotificationBean) {}

  @Get()
  list(
    @CurrentUser() user: Users,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.notificationBean.list(user.id, Math.max(1, page));
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: Users) {
    return { count: await this.notificationBean.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(204)
  readAll(@CurrentUser() user: Users) {
    return this.notificationBean.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(204)
  read(@CurrentUser() user: Users, @Param('id', ParseIntPipe) id: number) {
    return this.notificationBean.markRead(user.id, id);
  }
}
