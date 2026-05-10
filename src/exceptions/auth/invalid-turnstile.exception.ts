import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class InvalidTurnstileException extends BaseI18nException {
  constructor() {
    super('error.invalidTurnstile', HttpStatus.BAD_REQUEST);
  }
}
