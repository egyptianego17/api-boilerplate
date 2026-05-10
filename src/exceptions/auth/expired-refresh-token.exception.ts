import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class ExpiredRefreshTokenException extends BaseI18nException {
  constructor() {
    super('error.expiredRefreshToken', HttpStatus.UNAUTHORIZED);
  }
}
