import 'nestjs-i18n';
import type { ValidationArguments } from 'class-validator';

declare module 'nestjs-i18n' {
  export function i18nValidationMessage(
    key: string,
    args?: Record<string, unknown>,
  ): (a: ValidationArguments) => string;
}
