import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({ example: 'en' })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  language?: string;
}
