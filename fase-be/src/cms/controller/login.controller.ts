import {
  Body,
  Controller,
  Get,
  Post,
  Render,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UserBean } from 'src/domain/user/user.bean';
import { CmsErrorFilter } from '../error.filter';
import { CMS_SESSION_COOKIE, startCmsSession } from '../util/cms.auth';

@Controller('cms')
@UseFilters(CmsErrorFilter)
@ApiExcludeController()
export class LoginController {
  constructor(private readonly userBean: UserBean) {}

  @Get('login')
  @Render('login')
  showLoginForm() {
    return { layout: false };
  }

  @Post('login')
  async login(
    @Req() request: Request,
    @Res() response: Response,
    @Body() form: { username?: string; password?: string },
  ) {
    const fail = (content: string) => {
      request.session.info = { type: 'error', content };
      return response.redirect('/cms/login');
    };
    const username = form.username?.trim();
    if (!username || !form.password) {
      return fail('Vui lòng nhập tên đăng nhập và mật khẩu');
    }
    const user = await this.userBean.verifyCredentials(username, form.password);
    if (!user) return fail('Sai tên đăng nhập hoặc mật khẩu');
    if (!(await startCmsSession(request, user))) {
      return fail('Fase-CRM chỉ dành cho trưởng phòng. Nhân viên vui lòng dùng Fase-Sales.');
    }
    return response.redirect('/cms');
  }

  @Post('logout')
  logout(@Req() request: Request, @Res() response: Response) {
    request.session.destroy(() => {
      response.clearCookie(CMS_SESSION_COOKIE);
      response.redirect('/cms/login');
    });
  }
}
