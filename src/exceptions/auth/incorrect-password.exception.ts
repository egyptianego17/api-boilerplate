import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class IncorrectPasswordException extends BaseI18nException {
  constructor() {
    super('error.incorrectPassword', HttpStatus.BAD_REQUEST);
  }
}
