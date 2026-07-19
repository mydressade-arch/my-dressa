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
      } else if (err.code === '23514') {
        // Check-Constraint verletzt
        status  = HttpStatus.BAD_REQUEST;
        message = 'Eingabe nicht zulässig';
      } else {
        // SICHERHEIT: interne DB-Details (err.detail enthält Tabellen-/
        // Spaltenwerte) NICHT an den Client leaken. Nur generische Meldung.
        status  = HttpStatus.BAD_REQUEST;
        message = 'Anfrage konnte nicht verarbeitet werden';
      }
      // Volle DB-Fehlerdetails nur ins Server-Log (nicht an den Client)
      this.logger.error(`DB-Fehler ${err.code}: ${err.detail || err.message}`);
    } else if (exception instanceof Error) {
      // SICHERHEIT: bei unerwarteten Fehlern keine internen Details/Stacktraces
      // an den Client. Details nur ins Log.
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
      message = 'Interner Serverfehler';
    }

    this.logger.error(`${req.method} ${req.url} → ${status}: ${message}`);
    res.status(status).json({ statusCode: status, message });
  }
}
