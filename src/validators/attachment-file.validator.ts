import { Injectable, type PipeTransform } from '@nestjs/common';

import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE,
} from '../constants/attachments.js';
import { FileInvalidTypeException } from '../exceptions/file/file-invalid-type.exception.js';
import { FileRequiredException } from '../exceptions/file/file-required.exception.js';
import { FileTooLargeException } from '../exceptions/file/file-too-large.exception.js';
import type { IFile } from '../interfaces/IFile.js';

@Injectable()
export class AttachmentFileValidationPipe implements PipeTransform {
  transform(file: IFile): IFile {
    if (!file) {
      throw new FileRequiredException();
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
      throw new FileInvalidTypeException('Images, PDF, Word, Excel, CSV, TXT');
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new FileTooLargeException('10MB');
    }

    return file;
  }
}
