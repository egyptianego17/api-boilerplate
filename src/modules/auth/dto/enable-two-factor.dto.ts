import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class EnableTwoFactorDto {
  @ApiProperty({ description: 'TOTP secret from setup phase' })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  readonly secret!: string;

  @ApiProperty({
    description: 'TOTP code to verify setup',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @Length(6, 6, { message: i18nValidationMessage('validation.length') })
  readonly code!: string;

  @ApiProperty({
    description: 'User password required to enable 2FA',
    minLength: 6,
    maxLength: 72,
  })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MinLength(6, { message: i18nValidationMessage('validation.minLength') })
  @MaxLength(72, { message: i18nValidationMessage('validation.maxLength') })
  readonly password!: string;
}
