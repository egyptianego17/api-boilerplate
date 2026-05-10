import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { UserDto } from '../../user/dtos/user.dto.js';
import { TokenPayloadDto } from './token-payload.dto.js';

export class LoginPayloadDto {
  @ApiProperty({ type: () => UserDto })
  @Type(() => UserDto)
  @ValidateNested({ message: i18nValidationMessage('validation.isObject') })
  user: UserDto;

  @ApiPropertyOptional({ type: () => TokenPayloadDto })
  @Type(() => TokenPayloadDto)
  @ValidateNested({ message: i18nValidationMessage('validation.isObject') })
  @IsOptional()
  accessToken?: TokenPayloadDto;

  @ApiPropertyOptional({
    description: 'Temporary token for 2FA verification (if 2FA is enabled)',
  })
  @IsString()
  @IsOptional()
  tempToken?: string;

  @ApiPropertyOptional({
    description: 'Indicates if 2FA verification is required',
  })
  @IsBoolean()
  @IsOptional()
  requiresTwoFactor?: boolean;

  @ApiPropertyOptional({
    description: 'Refresh token (provided after successful login or 2FA)',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Session identifier shared across all tabs in the browser',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  constructor(user: UserDto, token?: TokenPayloadDto) {
    this.user = user;
    this.accessToken = token;
  }
}
