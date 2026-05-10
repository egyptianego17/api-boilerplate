import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';
import { Logger } from 'nestjs-pino';

import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { BaseI18nException } from '../exceptions/base-i18n.exception.js';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  constructor(@Inject(Logger) private readonly logger: Logger) {}

  private mapStatusToErrorCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.UNAUTHORIZED:
        return 'error.unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'error.forbidden';
      case HttpStatus.NOT_FOUND:
        return 'error.notFound';
      case HttpStatus.BAD_REQUEST:
        return 'error.badRequest';
      case HttpStatus.CONFLICT:
        return 'error.conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'error.validationFailed';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'error.tooManyRequests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'error.internalServerError';
      default:
        return 'error.unknown';
    }
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const i18n = I18nContext.current(host);

    let errorCode: string;
    let message: string;

    if (exception instanceof BaseI18nException) {
      errorCode = exception.errorCode;
      message =
        i18n?.t(errorCode, { args: exception.i18nArgs }) || exception.message;
    } else {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorCode = this.mapStatusToErrorCode(statusCode);
        message = i18n?.t(errorCode) || exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        errorCode = this.mapStatusToErrorCode(statusCode);
        message =
          i18n?.t(errorCode) ||
          i18n?.t(responseObj.message as string) ||
          (responseObj.message as string) ||
          exception.message;
      } else {
        errorCode = this.mapStatusToErrorCode(statusCode);
        message = exception.message;
      }
    }

    // Log the exception with context
    const logContext = {
      context: 'HttpExceptionFilter',
      statusCode,
      errorCode,
      method: request.method,
      path: request.url,
      userId: (request.user as { id?: string } | undefined)?.id,
    };

    if (statusCode >= 500) {
      this.logger.error(
        { ...logContext, stack: exception.stack },
        `HTTP Exception: ${message}`,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(logContext, `HTTP Exception: ${message}`);
    }

    const errorResponse = new ErrorResponseDto(
      statusCode,
      errorCode,
      message,
      undefined,
      request.url,
    );

    response.status(statusCode).json(errorResponse);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(Logger) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const i18n = I18nContext.current(host);

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const errorCode = 'error.internalServerError';
    const message = i18n?.t(errorCode) || 'Internal server error';

    // Log all unhandled exceptions with full stack trace
    this.logger.error(
      {
        context: 'AllExceptionsFilter',
        exception:
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
              }
            : exception,
        method: request.method,
        path: request.url,
        body: request.body,
        userId: (request.user as { id?: string } | undefined)?.id,
      },
      'Unhandled exception',
    );

    const errorResponse = new ErrorResponseDto(
      statusCode,
      errorCode,
      message,
      undefined,
      request.url,
    );

    response.status(statusCode).json(errorResponse);
  }
}
