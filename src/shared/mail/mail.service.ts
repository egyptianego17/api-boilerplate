import { Injectable } from '@nestjs/common';

import type { MailData } from './interfaces/mail.interface.js';
import { AuthMailService } from './services/auth-mail.service.js';

@Injectable()
export class MailService {
  constructor(private readonly authMailService: AuthMailService) {}

  async userSignUp(mailData: MailData<{ hash: string }>): Promise<void> {
    return this.authMailService.sendActivationEmail(mailData);
  }

  async forgotPassword(
    mailData: MailData<{ hash: string; tokenExpires: number }>,
  ): Promise<void> {
    return this.authMailService.sendPasswordResetEmail(mailData);
  }

  async confirmNewEmail(mailData: MailData<{ hash: string }>): Promise<void> {
    return this.authMailService.sendConfirmNewEmail(mailData);
  }
}
