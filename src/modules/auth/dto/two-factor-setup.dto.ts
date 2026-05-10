import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorSetupDto {
  @ApiProperty({
    description: 'TOTP secret in base32 format',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret!: string;

  @ApiProperty({
    description: 'QR code as data URL for scanning with authenticator app',
    example: 'data:image/png;base64,iVBORw0KGgo...',
  })
  qrCode!: string;

  constructor(partial: Partial<TwoFactorSetupDto>) {
    Object.assign(this, partial);
  }
}
