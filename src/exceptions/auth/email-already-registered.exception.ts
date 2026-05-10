import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class EmailAlreadyRegisteredException extends BaseI18nException {
  constructor() {
    super('error.emailAlreadyRegistered', HttpStatus.CONFLICT);
  }
}
