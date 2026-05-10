import path from 'node:path';

import { Injectable } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

import type { I18nPath } from '../../../generated/i18n.generated.js';
import { ApiConfigService } from '../../services/api-config.service.js';
import { TranslationService } from '../../services/translation.service.js';
import type { MailTemplate } from '../constants/mail-template.constant.js';

@Injectable()
export class MailHelperService {
  constructor(
    private readonly apiConfigService: ApiConfigService,
    private readonly translationService: TranslationService,
  ) {}

  getTranslations(keys: I18nPath[]): string[] {
    return keys.map((key) => this.translationService.t(key));
  }

  buildUrl(urlPath: string, params: Record<string, string>): URL {
    const { frontendDomain } = this.apiConfigService.mailConfig;
    const url = new URL(frontendDomain + urlPath);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url;
  }

  getTemplatePath(template: MailTemplate): string {
    const { workingDirectory } = this.apiConfigService.mailConfig;

    return path.join(
      workingDirectory,
      'src',
      'shared',
      'mail',
      'mail-templates',
      template,
    );
  }

  getAppName(): string {
    const { appName } = this.apiConfigService.mailConfig;

    return appName;
  }

  getCurrentLanguage(): string {
    const i18n = I18nContext.current();

    return i18n?.lang || this.apiConfigService.fallbackLanguage || 'en';
  }

  getLogoUrl(): string {
    const { frontendDomain } = this.apiConfigService.mailConfig;

    return `${frontendDomain.replace(/\/$/, '')}/email/api-boilerplate-logo.png`;
  }

  getCompanyTagline(): string {
    return 'The system that connects.';
  }
}
