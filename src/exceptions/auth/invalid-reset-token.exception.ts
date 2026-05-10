import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class InvalidResetTokenException extends BaseI18nException {
  constructor() {
    super('error.invalidResetToken', HttpStatus.BAD_REQUEST);
  }
}
