import fs from 'node:fs/promises';

import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import Handlebars from 'handlebars';
import { I18nService } from 'nestjs-i18n';

import { ApiConfigService } from '../services/api-config.service.js';
import { MailSendFailedException } from './exceptions/mail-send-failed.exception.js';
import type { SendMailOptions } from './interfaces/mail.interface.js';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly templateCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();

  constructor(
    private readonly apiConfigService: ApiConfigService,
    private readonly i18nService: I18nService,
  ) {
    const { sendgridApiKey } = this.apiConfigService.mailConfig;

    if (sendgridApiKey) {
      sgMail.setApiKey(sendgridApiKey);
    } else {
      this.logger.warn(
        'SendGrid API key not configured. Email sending will fail.',
      );
    }

    this.registerI18nHelper();
    this.registerCurrentYearHelper();
    this.registerPartials();
  }

  private async registerPartials(): Promise<void> {
    const { workingDirectory } = this.apiConfigService.mailConfig;
    const partialsPath = `${workingDirectory}/src/shared/mail/mail-templates/partials`;

    try {
      const [styles, header, footer] = await Promise.all([
        fs.readFile(`${partialsPath}/styles.hbs`, 'utf-8'),
        fs.readFile(`${partialsPath}/header.hbs`, 'utf-8'),
        fs.readFile(`${partialsPath}/footer.hbs`, 'utf-8'),
      ]);

      Handlebars.registerPartial('styles', styles);
      Handlebars.registerPartial('header', header);
      Handlebars.registerPartial('footer', footer);
    } catch (error) {
      this.logger.warn('Failed to register partials', error);
    }
  }

  private registerCurrentYearHelper(): void {
    Handlebars.registerHelper('currentYear', () => new Date().getFullYear());
    Handlebars.registerHelper('upper', (value: unknown) =>
      typeof value === 'string' ? value.toUpperCase() : value,
    );
  }

  private registerI18nHelper(): void {
    Handlebars.registerHelper(
      't',
      (key: string, options: Handlebars.HelperOptions) => {
        const lang =
          options.data?.root?.lang ||
          this.apiConfigService.fallbackLanguage ||
          'en';
        const args = options.hash || {};

        return this.i18nService.t(key, { lang, args });
      },
    );
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      let html: string | undefined = options.html;

      if (options.templatePath && options.context) {
        html = await this.compileTemplate(
          options.templatePath,
          options.context,
        );
      }

      const { defaultEmail, defaultName } = this.apiConfigService.mailConfig;
      const fromAddress = options.from || `"${defaultName}" <${defaultEmail}>`;

      const mailData = {
        to: options.to,
        from: fromAddress,
        subject: options.subject,
        ...(options.text && { text: options.text }),
        ...(html && { html }),
      };

      await sgMail.send(mailData as sgMail.MailDataRequired);

      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new MailSendFailedException(errorMessage);
    }
  }

  private async compileTemplate(
    templatePath: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    try {
      let template = this.templateCache.get(templatePath);

      if (!template) {
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        template = Handlebars.compile(templateContent, {
          strict: true,
        });
        this.templateCache.set(templatePath, template);
      }

      return template(context);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to compile template ${templatePath}: ${errorMessage}`,
      );

      throw error;
    }
  }

  clearTemplateCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }
}
