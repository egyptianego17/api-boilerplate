import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';

import type { I18nPath } from '../../generated/i18n.generated.js';

@Injectable()
export class TranslationService {
  constructor(private readonly i18nService: I18nService) {}

  t(key: I18nPath, args?: Record<string, unknown>): string {
    return this.i18nService.t(key, {
      lang: I18nContext.current()?.lang,
      args,
    }) as string;
  }
}
