import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class FileInvalidTypeException extends BaseI18nException {
  constructor(allowedTypes: string) {
    super('error.fileInvalidType', HttpStatus.BAD_REQUEST, {
      types: allowedTypes,
    });
  }
}
