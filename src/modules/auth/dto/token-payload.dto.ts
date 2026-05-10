import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class TokenPayloadDto {
  @ApiProperty()
  @IsNumber({}, { message: i18nValidationMessage('validation.isNumber') })
  expiresIn: number;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  token: string;

  constructor(data: { expiresIn: number; token: string }) {
    this.expiresIn = data.expiresIn;
    this.token = data.token;
  }
}
