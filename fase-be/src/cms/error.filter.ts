import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { canEnterCms } from './util/cms.auth';
import { CmsRequest, GENERIC_ERROR_MESSAGE, toErrorMessage } from './util/cms.helper';

const LOGIN_URL = '/cms/login';

@Catch()
export class CmsErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('CMS');

  catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<CmsRequest>();
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof UnauthorizedException) {
      return this.logOut(request, response);
    }
    if (exception instanceof ForbiddenException && !canEnterCms(request.user)) {
      return this.logOut(
        request,
        response,
        'Fase-CRM chỉ dành cho trưởng phòng. Nhân viên vui lòng dùng Fase-Sales.',
      );
    }
    if (exception instanceof HttpException) {
      return this.showError(response, exception.getStatus(), toErrorMessage(exception));
    }
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return this.showError(response, 500, GENERIC_ERROR_MESSAGE);
  }

  private logOut(request: CmsRequest, response: Response, error?: string) {
    request.session.regenerate(() => {
      if (error) request.session.info = { type: 'error', content: error };
      response.redirect(LOGIN_URL);
    });
  }

  private showError(response: Response, status: number, message: string) {
    return response.status(status).render('error', { status, message });
  }
}
