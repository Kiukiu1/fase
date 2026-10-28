import {
  Body,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { NotificationBean } from 'src/domain/notification/notification.bean';
import { UserBean } from 'src/domain/user/user.bean';
import { CmsAction, CmsController, CmsView } from '../cms.decorator';
import type { CmsRequest } from '../util/cms.helper';

@CmsController('cms')
export class AccountController {
  constructor(
    private readonly userBean: UserBean,
    private readonly notificationBean: NotificationBean,
  ) {}

  @Get('account/password')
  @CmsView('account/password')
  showPasswordForm() {
    return {};
  }

  /** FR-COM-02 */
  @Post('account/password')
  @CmsAction({ to: '/cms', onError: '/cms/account/password' })
  async changePassword(
    @Req() request: CmsRequest,
    @Body() form: { currentPassword?: string; newPassword?: string; confirmPassword?: string },
  ) {
    if (form.newPassword !== form.confirmPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không khớp');
    }
    await this.userBean.changePassword(
      request.user.id,
      form.currentPassword ?? '',
      form.newPassword ?? '',
    );
    return 'Đã đổi mật khẩu';
  }

  @Get('notifications')
  @CmsView('notification/list')
  async notifications(
    @Req() request: CmsRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.notificationBean.list(request.user.id, Math.max(1, page));
  }

  @Post('notifications/read-all')
  @CmsAction({ to: '/cms/notifications' })
  async readAll(@Req() request: CmsRequest) {
    await this.notificationBean.markAllRead(request.user.id);
    return 'Đã đánh dấu tất cả là đã đọc';
  }
}
