import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class UserNotFoundException extends BaseI18nException {
  constructor() {
    super('error.userNotFound', HttpStatus.NOT_FOUND);
  }
}
