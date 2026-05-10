import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { SystemRole } from '../../../constants/system-role.js';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: SystemRole })
  @IsEnum(SystemRole, { message: i18nValidationMessage('validation.isEnum') })
  @IsOptional()
  systemRole?: SystemRole;
}
