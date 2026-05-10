import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ChangePasswordDto {
  @ApiProperty({ minLength: 6 })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(6)
  currentPassword!: string;

  @ApiProperty({ minLength: 6 })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(6)
  newPassword!: string;
}
