import { Injectable } from '@nestjs/common';

import { MailTemplate } from '../constants/mail-template.constant.js';
import { MailHelperService } from '../helpers/mail-helper.service.js';
import type {
  ActivationEmailContext,
  ConfirmNewEmailContext,
  MailData,
  ResetPasswordEmailContext,
} from '../interfaces/mail.interface.js';
import { MailerService } from '../mailer.service.js';

@Injectable()
export class AuthMailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly mailHelper: MailHelperService,
  ) {}

  async sendActivationEmail(
    mailData: MailData<{ hash: string }>,
  ): Promise<void> {
    const translations = this.mailHelper.getTranslations([
      'common.confirmEmail',
      'confirm-email.text1',
      'confirm-email.text2',
      'confirm-email.text3',
    ]);

    const url = this.mailHelper.buildUrl('/confirm-email', {
      hash: mailData.data.hash,
    });

    const context: ActivationEmailContext = {
      title: translations[0]!,
      hash: mailData.data.hash,
      url: url.toString(),
      actionTitle: translations[0]!,
      appName: this.mailHelper.getAppName(),
      lang: this.mailHelper.getCurrentLanguage(),
      logoUrl: this.mailHelper.getLogoUrl(),
      companyTagline: this.mailHelper.getCompanyTagline(),
      text1: translations[1]!,
      text2: translations[2]!,
      text3: translations[3]!,
    };

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: translations[0] || 'Confirm Email',
      text: `Your verification code is: ${mailData.data.hash}`,
      templatePath: this.mailHelper.getTemplatePath(MailTemplate.ACTIVATION),
      context,
    });
  }

  async sendPasswordResetEmail(
    mailData: MailData<{ hash: string; tokenExpires: number }>,
  ): Promise<void> {
    const translations = this.mailHelper.getTranslations([
      'common.resetPassword',
      'reset-password.text1',
      'reset-password.text2',
      'reset-password.text3',
      'reset-password.text4',
    ]);

    const url = this.mailHelper.buildUrl('/password-change', {
      hash: mailData.data.hash,
      expires: mailData.data.tokenExpires.toString(),
    });

    const context: ResetPasswordEmailContext = {
      title: translations[0]!,
      hash: mailData.data.hash,
      url: url.toString(),
      actionTitle: translations[0]!,
      appName: this.mailHelper.getAppName(),
      lang: this.mailHelper.getCurrentLanguage(),
      logoUrl: this.mailHelper.getLogoUrl(),
      companyTagline: this.mailHelper.getCompanyTagline(),
      text1: translations[1]!,
      text2: translations[2]!,
      text3: translations[3]!,
      text4: translations[4]!,
    };

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: translations[0] || 'Reset Password',
      text: `Your password reset code is: ${mailData.data.hash}`,
      templatePath: this.mailHelper.getTemplatePath(
        MailTemplate.RESET_PASSWORD,
      ),
      context,
    });
  }

  async sendConfirmNewEmail(
    mailData: MailData<{ hash: string }>,
  ): Promise<void> {
    const translations = this.mailHelper.getTranslations([
      'common.confirmEmail',
      'confirm-new-email.text1',
      'confirm-new-email.text2',
      'confirm-new-email.text3',
    ]);

    const url = this.mailHelper.buildUrl('/confirm-new-email', {
      hash: mailData.data.hash,
    });

    const context: ConfirmNewEmailContext = {
      title: translations[0]!,
      hash: mailData.data.hash,
      url: url.toString(),
      actionTitle: translations[0]!,
      appName: this.mailHelper.getAppName(),
      lang: this.mailHelper.getCurrentLanguage(),
      logoUrl: this.mailHelper.getLogoUrl(),
      companyTagline: this.mailHelper.getCompanyTagline(),
      text1: translations[1]!,
      text2: translations[2]!,
      text3: translations[3]!,
    };

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: translations[0] || 'Confirm New Email',
      text: `Your email verification code is: ${mailData.data.hash}`,
      templatePath: this.mailHelper.getTemplatePath(
        MailTemplate.CONFIRM_NEW_EMAIL,
      ),
      context,
    });
  }
}
