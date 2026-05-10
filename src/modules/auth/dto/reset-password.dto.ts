import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ResetPasswordDto {
  @ApiProperty({ minLength: 16, maxLength: 16 })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @Length(16, 16, { message: i18nValidationMessage('validation.length') })
  readonly hash!: string;

  @ApiProperty({ minLength: 6, maxLength: 72 })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MinLength(6, { message: i18nValidationMessage('validation.minLength') })
  @MaxLength(72, { message: i18nValidationMessage('validation.maxLength') })
  readonly password!: string;
}
