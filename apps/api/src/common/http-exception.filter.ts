import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Interner Serverfehler';

    if (exception instanceof HttpException) {
      status  = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message || message;
      if (Array.isArray(message)) message = message[0];
    } else if (exception instanceof QueryFailedError) {
      const err = exception as any;
      if (err.code === '23503') {
        status  = HttpStatus.CONFLICT;
        message = 'Kann nicht gelöscht werden — verknüpfte Bestellungen oder Daten vorhanden';
      } else if (err.code === '23505') {
        status  = HttpStatus.CONFLICT;
        message = 'Dieser Eintrag existiert bereits';
      } else {
        message = err.detail || err.message || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(`${req.method} ${req.url} → ${status}: ${message}`);
    res.status(status).json({ statusCode: status, message });
  }
}
