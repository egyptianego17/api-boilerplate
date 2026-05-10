import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class PendingEmailChangeNotFoundException extends BaseI18nException {
  constructor() {
    super('error.noPendingEmailChange', HttpStatus.BAD_REQUEST);
  }
}
