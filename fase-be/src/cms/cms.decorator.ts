import {
  applyDecorators,
  Controller,
  Redirect,
  Render,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CmsSessionGuard } from './cms-session.guard';
import { CmsErrorFilter } from './error.filter';
import {
  FlashRedirectInterceptor,
  FlashRedirectOptions,
} from './flash-redirect.interceptor';

export function CmsController(path: string) {
  return applyDecorators(
    Controller(path),
    UseGuards(CmsSessionGuard),
    UseFilters(CmsErrorFilter),
    ApiExcludeController(),
  );
}

export const CmsView = (view: string) => Render(view);

/** Form POST: chạy xong redirect kèm thông báo flash (thành công / lỗi). */
export function CmsAction(options: FlashRedirectOptions) {
  return applyDecorators(
    Redirect(),
    UseInterceptors(new FlashRedirectInterceptor(options)),
  );
}
