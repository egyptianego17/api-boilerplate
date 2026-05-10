import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of IDs to delete',
    type: [String],
    format: 'uuid',
  })
  @IsArray({ message: i18nValidationMessage('validation.isArray') })
  @ArrayNotEmpty({ message: i18nValidationMessage('validation.arrayNotEmpty') })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('validation.isUuid'),
  })
  readonly ids!: Uuid[];
}
