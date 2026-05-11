import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

jest.mock('@sentry/node', () => ({
  withScope: (cb: (s: { setTag: jest.Mock; setContext: jest.Mock }) => void) => cb({ setTag: jest.fn(), setContext: jest.fn() }),
  captureException: jest.fn(),
}));

function buildHost(req: { method: string; url: string; query?: unknown; headers?: Record<string, unknown> }) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host: Partial<ArgumentsHost> = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
      getNext: () => ({}),
    }) as ReturnType<ArgumentsHost['switchToHttp']>,
  };
  return { host: host as ArgumentsHost, res };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('mapea NotFoundException a 404 con código', () => {
    const { host, res } = buildHost({ method: 'GET', url: '/api/x' });
    filter.catch(new NotFoundException('Caballo no encontrado'), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        // NestJS asigna error: "Not Found" en NotFoundException
        code: expect.stringMatching(/Not Found|NOT_FOUND/),
        message: 'Caballo no encontrado',
        path: '/api/x',
      }),
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('aplana arrays de mensajes (ValidationPipe)', () => {
    const exc = new BadRequestException({
      statusCode: 400,
      message: ['email debe ser email válido', 'password muy corta'],
      error: 'Bad Request',
    });
    const { host, res } = buildHost({ method: 'POST', url: '/api/auth/register' });
    filter.catch(exc, host);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'email debe ser email válido; password muy corta',
      }),
    );
  });

  it('5xx loggea como error y devuelve 500', () => {
    const { host, res } = buildHost({
      method: 'GET',
      url: '/api/y',
      query: { foo: 'bar' },
      headers: { authorization: 'Bearer secret', accept: 'json' },
    });
    filter.catch(new Error('boom'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('respeta el status original de un HttpException no estándar', () => {
    const { host, res } = buildHost({ method: 'GET', url: '/api/z' });
    filter.catch(new HttpException('Pago requerido', 402), host);
    expect(res.status).toHaveBeenCalledWith(402);
  });
});
