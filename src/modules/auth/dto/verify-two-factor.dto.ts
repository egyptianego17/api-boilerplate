import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'Temporary token from initial login' })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  readonly tempToken!: string;

  @ApiProperty({
    description: 'TOTP code from authenticator app or recovery code',
    example: '123456',
  })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  readonly code!: string;

  @ApiProperty({
    description: 'Session identifier shared across all tabs in the browser',
  })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  readonly sessionId!: string;
}
