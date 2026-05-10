import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { LanguageCode } from '../../constants/language-code.js';

export class CreateTranslationDto {
  @ApiProperty({ enum: LanguageCode })
  @IsEnum(LanguageCode)
  languageCode!: LanguageCode;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text!: string;
}
