import { ApiProperty } from '@nestjs/swagger';

import { StringField } from '../../../decorators/field.decorators.js';

export class TwoFactorEnabledResponseDto {
  @StringField()
  message!: string;

  @ApiProperty({
    type: [String],
    description: 'Recovery codes for account recovery',
    example: ['1A2B-3C4D', '5E6F-7G8H', '9I0J-1K2L', '3M4N-5O6P', '7Q8R-9S0T'],
  })
  recoveryCodes!: string[];

  constructor(message: string, recoveryCodes: string[]) {
    this.message = message;
    this.recoveryCodes = recoveryCodes;
  }
}
