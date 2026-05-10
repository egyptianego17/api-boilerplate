import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { TokenPayloadDto } from './token-payload.dto.js';

export class RefreshTokenRequestDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  readonly refreshToken!: string;

  @ApiProperty({
    description: 'Session identifier shared across all tabs in the browser',
  })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  readonly sessionId!: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ type: () => TokenPayloadDto })
  @Type(() => TokenPayloadDto)
  @ValidateNested({ message: i18nValidationMessage('validation.isObject') })
  accessToken!: TokenPayloadDto;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  refreshToken!: string;
}
