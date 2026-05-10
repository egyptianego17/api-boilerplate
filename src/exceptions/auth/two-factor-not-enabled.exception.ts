import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class TwoFactorNotEnabledException extends BaseI18nException {
  constructor() {
    super('error.twoFactorNotEnabled', HttpStatus.BAD_REQUEST);
  }
}
