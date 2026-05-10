import { Injectable, type PipeTransform } from '@nestjs/common';

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../constants/images.js';
import { FileInvalidTypeException } from '../exceptions/file/file-invalid-type.exception.js';
import { FileRequiredException } from '../exceptions/file/file-required.exception.js';
import { FileTooLargeException } from '../exceptions/file/file-too-large.exception.js';
import type { IFile } from '../interfaces/IFile.js';

@Injectable()
export class ImageFileValidationPipe implements PipeTransform {
  transform(file: IFile): IFile {
    if (!file) {
      throw new FileRequiredException();
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new FileInvalidTypeException('PNG, JPG, JPEG, WebP');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeException('5MB');
    }

    return file;
  }
}
