import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class InvalidVerificationTokenException extends BaseI18nException {
  constructor() {
    super('error.invalidVerificationToken', HttpStatus.BAD_REQUEST);
  }
}
