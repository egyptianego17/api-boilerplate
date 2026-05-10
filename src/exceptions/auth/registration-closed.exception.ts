import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class RegistrationClosedException extends BaseI18nException {
  constructor() {
    super('error.registrationClosed', HttpStatus.FORBIDDEN);
  }
}
