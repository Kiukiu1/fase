import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { catchError, map, of } from 'rxjs';
import { CmsRequest, toErrorMessage } from './util/cms.helper';

export interface FlashRedirectOptions {
  to: string;
  onError?: string;
}

/** Kết quả action: chỉ thông báo, hoặc thông báo + trang đích riêng. */
export type ActionOutcome = string | { message: string; to: string };

/** Chỉ cho quay về trang trong CRM (chống open redirect). */
const safeReturnTo = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/cms') && !value.startsWith('//')
    ? value
    : null;

export class FlashRedirectInterceptor implements NestInterceptor {
  constructor(private readonly options: FlashRedirectOptions) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<CmsRequest>();
    const fill = (url: string) =>
      url.replace(/:(\w+)/g, (param, name: string) =>
        String(request.params[name] ?? param),
      );
    const returnTo = safeReturnTo(
      (request.body as { returnTo?: unknown } | undefined)?.returnTo,
    );
    const errorUrl = returnTo ?? fill(this.options.onError ?? this.options.to);

    return next.handle().pipe(
      map((outcome: ActionOutcome) => {
        const message = typeof outcome === 'string' ? outcome : outcome.message;
        const to =
          typeof outcome === 'string'
            ? (returnTo ?? fill(this.options.to))
            : outcome.to;
        request.session.info = { type: 'success', content: message };
        return { url: to };
      }),
      catchError((error) => {
        request.session.info = {
          type: 'error',
          content: toErrorMessage(error),
        };
        return of({ url: errorUrl });
      }),
    );
  }
}
