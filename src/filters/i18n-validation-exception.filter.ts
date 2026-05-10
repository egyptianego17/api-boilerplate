import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { Request, Response } from 'express';
import type { I18nContext } from 'nestjs-i18n';
import {
  I18nContext as I18nContextClass,
  I18nValidationException,
} from 'nestjs-i18n';

interface ValidationErrorResponse {
  property: string;
  constraints: Record<string, string>;
}

@Catch(I18nValidationException)
export class CustomI18nValidationExceptionFilter
  implements ExceptionFilter<I18nValidationException>
{
  catch(exception: I18nValidationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const i18n = I18nContextClass.current(host);

    const errors = i18n
      ? this.formatErrors(exception.errors, i18n)
      : exception.errors;

    response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
      success: false,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errorCode: 'error.validationFailed',
      message: i18n?.t('error.validationFailed') || 'Validation failed',
      errors,
      timestamp: Date.now(),
      path: request.url,
    });
  }

  private formatErrors(
    errors: ValidationError[],
    i18n: I18nContext,
  ): ValidationErrorResponse[] {
    return errors.map((error) => {
      const constraints: Record<string, string> = {};

      if (error.constraints) {
        for (const [key, value] of Object.entries(error.constraints)) {
          const messageValue = String(value);
          const [translationKey, argsString] = messageValue.split('|');
          const args = argsString ? JSON.parse(argsString) : {};

          constraints[key] = i18n.t(translationKey || key, {
            args: {
              property: error.property,
              value: error.value,
              ...args,
            },
          });
        }
      }

      return {
        property: error.property,
        constraints,
      };
    });
  }
}
