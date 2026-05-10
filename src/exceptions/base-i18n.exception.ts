import type { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

export abstract class BaseI18nException extends HttpException {
  readonly errorCode: string;
  readonly i18nArgs?: Record<string, string | number>;

  constructor(
    errorCode: string,
    statusCode: HttpStatus,
    i18nArgs?: Record<string, string | number>,
  ) {
    super(errorCode, statusCode);
    this.errorCode = errorCode;
    this.i18nArgs = i18nArgs;
  }
}
