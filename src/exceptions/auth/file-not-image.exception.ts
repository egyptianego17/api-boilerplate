import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class FileNotImageException extends BaseI18nException {
  constructor() {
    super('error.fileNotImage', HttpStatus.BAD_REQUEST);
  }
}
