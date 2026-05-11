import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';

/**
 * Filtro global: convierte cualquier excepción a JSON consistente, registra logs
 * y reporta a Sentry los 5xx con request_id correlacionado.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? exception.getResponse() : null;

    const message = this.extractMessage(payload, exception);
    const code = this.extractCode(payload, status);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      Sentry.withScope((scope) => {
        scope.setTag('path', req.url);
        scope.setTag('method', req.method);
        scope.setContext('request', {
          query: req.query,
          headers: this.redactHeaders(req.headers),
        });
        Sentry.captureException(exception);
      });
    } else if (status >= 400) {
      this.logger.warn(`${req.method} ${req.url} → ${status} ${message}`);
    }

    res.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }

  private extractMessage(payload: unknown, exception: unknown): string {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const m = (payload as { message: unknown }).message;
      if (Array.isArray(m)) return m.join('; ');
      if (typeof m === 'string') return m;
    }
    if (typeof payload === 'string') return payload;
    if (exception instanceof Error) return exception.message;
    return 'Error interno';
  }

  private extractCode(payload: unknown, status: number): string {
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const e = (payload as { error: unknown }).error;
      if (typeof e === 'string') return e;
    }
    return HttpStatus[status] ?? 'UNKNOWN';
  }

  private redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const clone = { ...headers };
    delete clone.authorization;
    delete clone.cookie;
    return clone;
  }
}
