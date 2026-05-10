import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DisableTwoFactorDto {
  @ApiProperty({
    description: 'User password required to disable 2FA',
    minLength: 6,
    maxLength: 72,
  })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MinLength(6, { message: i18nValidationMessage('validation.minLength') })
  @MaxLength(72, { message: i18nValidationMessage('validation.maxLength') })
  readonly password!: string;
}
