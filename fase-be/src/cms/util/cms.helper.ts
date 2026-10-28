import { HttpException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import type { Users } from 'src/domain/user/entity/user.entity';

export interface CmsRequest extends Request {
  user: Users;
  unreadCount?: number;
}

export const GENERIC_ERROR_MESSAGE = 'Đã có lỗi xảy ra, vui lòng thử lại';

const logger = new Logger('CMS');

function readErrorMessage(exception: HttpException) {
  const body = exception.getResponse() as
    | string
    | { message?: string | string[] };
  const message = typeof body === 'string' ? body : body.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? exception.message;
}

export function toErrorMessage(error: unknown) {
  if (error instanceof HttpException) return readErrorMessage(error);
  logger.error(error instanceof Error ? error.stack : error);
  return GENERIC_ERROR_MESSAGE;
}

/** Form HTML gửi checkbox dạng `leadIds[]` -> luôn đưa về mảng số. */
export const toIdList = (value: unknown): number[] =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

export const toStringList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value])
    .map(String)
    .filter(Boolean);
