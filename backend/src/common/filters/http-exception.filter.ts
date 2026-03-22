import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { status, message, error } = this.resolveException(exception);

    const body = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status} | ${message}`);
    }

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    // NestJS HTTP exceptions (400, 401, 403, 404, 409...)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as any).message ?? exception.message;

      return {
        status,
        message: Array.isArray(message) ? message.join(', ') : message,
        error: HttpStatus[status] || 'Error',
      };
    }

    // TypeORM query errors (constraints, duplicates, FK violations)
    if (exception instanceof QueryFailedError) {
      const pgError = exception as any;

      // Unique constraint violation
      if (pgError.code === '23505') {
        const detail = pgError.detail || '';
        const field = detail.match(/\((\w+)\)/)?.[1] || 'campo';
        return {
          status: HttpStatus.CONFLICT,
          message: `Ya existe un registro con ese ${field}`,
          error: 'CONFLICT',
        };
      }

      // Foreign key violation
      if (pgError.code === '23503') {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referencia a un registro que no existe',
          error: 'BAD_REQUEST',
        };
      }

      // Not null violation
      if (pgError.code === '23502') {
        const column = pgError.column || 'campo';
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `El campo ${column} es obligatorio`,
          error: 'BAD_REQUEST',
        };
      }

      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error en base de datos',
        error: 'INTERNAL_SERVER_ERROR',
      };
    }

    // Anything else → 500
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'INTERNAL_SERVER_ERROR',
    };
  }
}
