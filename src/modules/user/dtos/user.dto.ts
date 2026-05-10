import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { AbstractDto } from '../../../common/dto/abstract.dto.js';
import type { UserEntity } from '../entities/user.entity.js';

export type UserDtoOptions = Partial<{
  isActive: boolean;
}>;

export class UserDto extends AbstractDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  firstName!: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  lastName!: string;

  @ApiProperty()
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  avatar?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  bio?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      language: { type: 'string' },
    },
  })
  @IsOptional()
  settings?: { language?: string | null } | null;

  @ApiPropertyOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  @IsOptional()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  pendingEmail?: string | null;

  @ApiPropertyOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Two-factor authentication status' })
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  twoFactorEnabled!: boolean;

  constructor(user: UserEntity, options?: UserDtoOptions) {
    super(user);
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.avatar = user.avatar;
    this.phone = user.phone;
    this.bio = user.bio;
    this.isActive = options?.isActive;
    this.twoFactorEnabled = user.twoFactorEnabled;
    if (user.settings) {
      this.settings = {
        language: user.settings.language,
      };
      this.isEmailVerified = user.settings.isEmailVerified;
    }
    this.pendingEmail = user.pendingEmail;
  }
}
