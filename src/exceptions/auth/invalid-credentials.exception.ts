import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class InvalidCredentialsException extends BaseI18nException {
  constructor() {
    super('error.invalidCredentials', HttpStatus.UNAUTHORIZED);
  }
}
