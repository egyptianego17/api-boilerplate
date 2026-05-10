import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class FileTooLargeException extends BaseI18nException {
  constructor(maxSize: string) {
    super('error.fileTooLarge', HttpStatus.BAD_REQUEST, { maxSize });
  }
}
