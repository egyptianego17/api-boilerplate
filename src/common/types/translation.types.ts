export type SupportedLocale = 'ar' | 'fr';

export type TranslationMap = Record<
  string,
  Partial<Record<SupportedLocale, string>>
>;
