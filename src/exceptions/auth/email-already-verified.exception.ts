import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class EmailAlreadyVerifiedException extends BaseI18nException {
  constructor() {
    super('error.emailAlreadyVerified', HttpStatus.BAD_REQUEST);
  }
}
