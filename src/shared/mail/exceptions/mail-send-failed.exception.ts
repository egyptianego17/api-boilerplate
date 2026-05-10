import { InternalServerErrorException } from '@nestjs/common';

export class MailSendFailedException extends InternalServerErrorException {
  constructor(error?: string) {
    super('error.mailSendFailed', error);
  }
}
