import { ApiProperty } from '@nestjs/swagger';

export class RecoveryCodesResponseDto {
  @ApiProperty({
    type: [String],
    description: 'New recovery codes for account recovery',
    example: ['1A2B-3C4D', '5E6F-7G8H', '9I0J-1K2L', '3M4N-5O6P', '7Q8R-9S0T'],
  })
  recoveryCodes!: string[];

  constructor(recoveryCodes: string[]) {
    this.recoveryCodes = recoveryCodes;
  }
}
