import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MailHelperService } from './helpers/mail-helper.service.js';
import { MailService } from './mail.service.js';
import { MailerService } from './mailer.service.js';
import { AuthMailService } from './services/auth-mail.service.js';

@Module({
  imports: [ConfigModule],
  providers: [MailerService, MailHelperService, AuthMailService, MailService],
  exports: [MailService, MailerService, MailHelperService],
})
export class MailModule {}
