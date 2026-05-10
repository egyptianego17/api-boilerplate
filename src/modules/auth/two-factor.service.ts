import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

import { generateHash, validateHash } from '../../common/utils.js';
import { TOTP_STEP_SECONDS } from '../../constants/auth-tokens.js';
import { ApiConfigService } from '../../shared/services/api-config.service.js';
import { CryptoService } from '../../shared/services/crypto.service.js';
import { AuthRepository } from './auth.repository.js';
import { TwoFactorSetupDto } from './dto/two-factor-setup.dto.js';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly logger: PinoLogger,
    private configService: ApiConfigService,
    private cryptoService: CryptoService,
    private authRepository: AuthRepository,
  ) {
    this.logger.setContext(TwoFactorService.name);

    authenticator.options = {
      digits: this.configService.twoFactorConfig.codeDigits,
      window: this.configService.twoFactorConfig.codeValidityWindow,
      step: TOTP_STEP_SECONDS,
    };
  }

  async generateSecret(email: string): Promise<TwoFactorSetupDto> {
    const secret = authenticator.generateSecret();
    const qrCode = await this.generateQRCode(secret, email);

    return new TwoFactorSetupDto({ secret, qrCode });
  }

  verifyTOTP(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  decryptSecret(encryptedSecret: string): string {
    return this.cryptoService.decrypt(encryptedSecret);
  }

  async enableTwoFactor(
    userId: Uuid,
    secret: string,
    plainRecoveryCodes: string[],
  ): Promise<void> {
    const encryptedSecret = this.cryptoService.encrypt(secret);
    const hashedCodes = await this.hashRecoveryCodes(plainRecoveryCodes);

    await this.authRepository.enableTwoFactor(
      userId,
      encryptedSecret,
      hashedCodes,
    );
  }

  async disableTwoFactor(userId: Uuid): Promise<void> {
    await this.authRepository.disableTwoFactor(userId);
  }

  async validateRecoveryCode(
    userId: Uuid,
    inputCode: string,
  ): Promise<boolean> {
    const user = await this.authRepository.findByIdWithTwoFactorData(userId);

    if (!user?.recoveryCodes?.length) {
      return false;
    }

    for (const [index, hashedCode] of user.recoveryCodes.entries()) {
      const isMatch = await validateHash(inputCode, hashedCode);

      if (isMatch) {
        const remaining = user.recoveryCodes.filter((_, i) => i !== index);
        await this.authRepository.updateRecoveryCodes(userId, remaining);

        return true;
      }
    }

    return false;
  }

  async generateRecoveryCodes(): Promise<string[]> {
    return this.generateRecoveryCodesPlain();
  }

  async regenerateRecoveryCodes(userId: Uuid): Promise<string[]> {
    const plainCodes = this.generateRecoveryCodesPlain();
    const hashedCodes = await this.hashRecoveryCodes(plainCodes);

    await this.authRepository.updateRecoveryCodes(userId, hashedCodes);

    return plainCodes;
  }

  private async generateQRCode(secret: string, email: string): Promise<string> {
    const { issuer } = this.configService.twoFactorConfig;
    const otpAuthUrl = authenticator.keyuri(email, issuer, secret);

    return QRCode.toDataURL(otpAuthUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });
  }

  private generateRecoveryCodesPlain(): string[] {
    const count = this.configService.twoFactorConfig.recoveryCodesCount;
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = randomBytes(4)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,4}/g)!
        .join('-');

      codes.push(code);
    }

    return codes;
  }

  private async hashRecoveryCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => generateHash(code)));
  }
}
