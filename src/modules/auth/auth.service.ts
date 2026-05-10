import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';

import { generateHash, hashToken, validateHash } from '../../common/utils.js';
import {
  EMAIL_VERIFICATION_TTL_MS,
  OAUTH_SESSION_ID_BYTES,
  PASSWORD_RESET_TTL_MS,
  SHORT_LIVED_TOKEN_BYTES,
  TEMP_TOKEN_TTL,
  TEMP_TOKEN_TTL_SECONDS,
} from '../../constants/auth-tokens.js';
import { TokenType } from '../../constants/token-type.js';
import { EmailNotVerifiedException } from '../../exceptions/auth/email-not-verified.exception.js';
import { InvalidCredentialsException } from '../../exceptions/auth/invalid-credentials.exception.js';
import { InvalidResetTokenException } from '../../exceptions/auth/invalid-reset-token.exception.js';
import { InvalidTokenException } from '../../exceptions/auth/invalid-token.exception.js';
import { InvalidTurnstileException } from '../../exceptions/auth/invalid-turnstile.exception.js';
import { InvalidTwoFactorCodeException } from '../../exceptions/auth/invalid-two-factor-code.exception.js';
import { InvalidVerificationTokenException } from '../../exceptions/auth/invalid-verification-token.exception.js';
import { RegistrationClosedException } from '../../exceptions/auth/registration-closed.exception.js';
import { TwoFactorNotEnabledException } from '../../exceptions/auth/two-factor-not-enabled.exception.js';
import type { IFile } from '../../interfaces/IFile.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { ApiConfigService } from '../../shared/services/api-config.service.js';
import { TranslationService } from '../../shared/services/translation.service.js';
import { TurnstileService } from '../../shared/services/turnstile.service.js';
import type { Reference } from '../../types.js';
import { AuditEvent } from '../audit/constants/audit-event.js';
import { AuditService } from '../audit/services/audit.service.js';
import type { SocialInterface } from '../auth-google/auth-google.service.js';
import { MetricsService } from '../metrics/metrics.service.js';
import type { UserEntity } from '../user/entities/user.entity.js';
import { UserService } from '../user/user.service.js';
import { AuthRepository } from './auth.repository.js';
import type { DisableTwoFactorDto } from './dto/disable-two-factor.dto.js';
import type { EnableTwoFactorDto } from './dto/enable-two-factor.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginPayloadDto } from './dto/login-payload.dto.js';
import { RecoveryCodesResponseDto } from './dto/recovery-codes-response.dto.js';
import type { RefreshTokenResponseDto } from './dto/refresh-token.dto.js';
import type { ResendVerificationDto } from './dto/resend-verification.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TokenPayloadDto } from './dto/token-payload.dto.js';
import { TwoFactorEnabledResponseDto } from './dto/two-factor-enabled-response.dto.js';
import type { TwoFactorSetupDto } from './dto/two-factor-setup.dto.js';
import type { UserLoginDto } from './dto/user-login.dto.js';
import type { UserRegisterDto } from './dto/user-register.dto.js';
import type { VerifyEmailDto } from './dto/verify-email.dto.js';
import type { VerifyTwoFactorDto } from './dto/verify-two-factor.dto.js';
import type { RequestMetadata } from './interfaces/request-metadata.interface.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { TwoFactorService } from './two-factor.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private jwtService: JwtService,
    private configService: ApiConfigService,
    private mailService: MailService,
    private authRepository: AuthRepository,
    private twoFactorService: TwoFactorService,
    private refreshTokenService: RefreshTokenService,
    private turnstileService: TurnstileService,
    private userService: UserService,
    private readonly metricsService: MetricsService,
    private readonly translationService: TranslationService,
    private readonly auditService: AuditService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async createAccessToken(data: { userId: Uuid }): Promise<TokenPayloadDto> {
    const user = await this.userService.findOne({ id: data.userId });

    if (!user) {
      throw new InvalidCredentialsException();
    }

    return new TokenPayloadDto({
      expiresIn: this.configService.authConfig.jwtExpirationTime,
      token: await this.jwtService.signAsync({
        userId: data.userId,
        email: user.email,
        systemRole: user.systemRole,
        type: TokenType.ACCESS_TOKEN,
      }),
    });
  }

  async createTokenPair(data: {
    userId: Uuid;
    sessionId: string;
    metadata: RequestMetadata;
  }): Promise<{ accessToken: TokenPayloadDto; refreshToken: string }> {
    const accessToken = await this.createAccessToken(data);
    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      data.userId,
      data.sessionId,
      data.metadata,
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
    sessionId: string,
    metadata: RequestMetadata,
  ): Promise<RefreshTokenResponseDto> {
    const user = await this.refreshTokenService.validateAndGetUser(
      refreshToken,
      sessionId,
    );

    await this.refreshTokenService.revokeRefreshToken(user.id, sessionId);

    const accessToken = await this.createAccessToken({ userId: user.id });
    const newRefreshToken = await this.refreshTokenService.generateRefreshToken(
      user.id,
      sessionId,
      metadata,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: Uuid, sessionId: string): Promise<void> {
    await this.refreshTokenService.revokeRefreshToken(userId, sessionId);
  }

  async register(
    _userRegisterDto: UserRegisterDto,
    _file?: Reference<IFile>,
  ): Promise<{ message: string }> {
    throw new RegistrationClosedException();
  }

  private async validateUser(userLoginDto: UserLoginDto): Promise<UserEntity> {
    const user = await this.authRepository.findByEmailWithPassword(
      userLoginDto.email,
    );

    if (!user || !(await validateHash(userLoginDto.password, user.password))) {
      this.logger.warn(
        { email: userLoginDto.email },
        'Failed login attempt - invalid credentials',
      );
      throw new InvalidCredentialsException();
    }

    return user;
  }

  async login(
    userLoginDto: UserLoginDto,
    metadata: RequestMetadata,
  ): Promise<LoginPayloadDto> {
    const isTurnstileValid = await this.turnstileService.verify(
      userLoginDto.turnstileToken,
    );

    if (!isTurnstileValid) {
      this.logger.warn('Turnstile validation failed during login');
      throw new InvalidTurnstileException();
    }

    const userEntity = await this.validateUser(userLoginDto);

    if (!userEntity.settings?.isEmailVerified) {
      throw new EmailNotVerifiedException();
    }

    if (userEntity.twoFactorEnabled) {
      const tempToken = await this.createTempToken({ userId: userEntity.id });
      const response = new LoginPayloadDto(
        await this.userService.getUserProfile(userEntity.id),
      );
      response.tempToken = tempToken.token;
      response.requiresTwoFactor = true;

      return response;
    }

    return this.completeLogin(userEntity.id, userLoginDto.sessionId, metadata);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const message = this.translationService.t('auth.passwordResetEmailSent');
    const user = await this.authRepository.findByEmailWithPassword(
      forgotPasswordDto.email,
    );

    /* Identical response whether or not the email is registered, to block user enumeration */
    if (!user) {
      return { message };
    }

    const resetToken = randomBytes(SHORT_LIVED_TOKEN_BYTES)
      .toString('hex')
      .toUpperCase();
    const hashedToken = hashToken(resetToken);
    const tokenExpires = Date.now() + PASSWORD_RESET_TTL_MS;

    await this.authRepository.updatePasswordResetToken(
      user.id,
      hashedToken,
      new Date(tokenExpires),
    );

    await this.mailService.forgotPassword({
      to: user.email!,
      data: { hash: resetToken, tokenExpires },
    });

    await this.auditService.record(AuditEvent.AuthPasswordResetRequested, {
      objectId: user.id,
    });

    return { message };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const matchedUser = await this.authRepository.findByPasswordResetToken(
      hashToken(resetPasswordDto.hash),
    );

    if (!matchedUser) {
      this.logger.warn('Invalid password reset token used');
      throw new InvalidResetTokenException();
    }

    const hashedPassword = generateHash(resetPasswordDto.password);

    await this.authRepository.updatePassword(matchedUser.id, hashedPassword);
    await this.authRepository.clearPasswordResetToken(matchedUser.id);
    await this.refreshTokenService.revokeAllForUser(matchedUser.id);

    await this.auditService.record(AuditEvent.AuthPasswordResetCompleted, {
      objectId: matchedUser.id,
    });

    return { message: this.translationService.t('auth.passwordResetSuccess') };
  }

  async verifyEmail(
    dto: VerifyEmailDto,
    metadata: RequestMetadata,
  ): Promise<LoginPayloadDto> {
    const matchedUser = await this.authRepository.findByEmailVerificationToken(
      hashToken(dto.hash),
    );

    if (!matchedUser) {
      this.logger.warn('Invalid or expired email verification token used');
      throw new InvalidVerificationTokenException();
    }

    await this.userService.setEmailVerified(matchedUser.id);
    await this.authRepository.clearEmailVerificationToken(matchedUser.id);

    await this.auditService.record(AuditEvent.AuthEmailVerified, {
      objectId: matchedUser.id,
    });

    return this.completeLogin(matchedUser.id, dto.sessionId, metadata);
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const message = this.translationService.t('auth.verificationEmailResent');
    const user = await this.authRepository.findByEmailWithPassword(dto.email);

    if (!user || user.settings?.isEmailVerified) {
      return { message };
    }

    const plainToken = randomBytes(SHORT_LIVED_TOKEN_BYTES)
      .toString('hex')
      .toUpperCase();
    const hashedToken = hashToken(plainToken);
    const expires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await this.authRepository.setEmailVerificationToken(
      user.id,
      hashedToken,
      expires,
    );

    await this.mailService.userSignUp({
      to: user.email,
      data: { hash: plainToken },
    });

    return { message };
  }

  async setupTwoFactor(email: string): Promise<TwoFactorSetupDto> {
    return this.twoFactorService.generateSecret(email);
  }

  async enableTwoFactor(
    user: UserEntity,
    dto: EnableTwoFactorDto,
  ): Promise<TwoFactorEnabledResponseDto> {
    const isPasswordValid = await validateHash(dto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(
        { userId: user.id },
        'Invalid password when attempting to enable 2FA',
      );
      throw new InvalidCredentialsException();
    }

    const isCodeValid = this.twoFactorService.verifyTOTP(dto.code, dto.secret);

    if (!isCodeValid) {
      this.logger.warn({ userId: user.id }, 'Invalid 2FA code during setup');
      throw new InvalidTwoFactorCodeException();
    }

    const recoveryCodes = await this.twoFactorService.generateRecoveryCodes();

    await this.twoFactorService.enableTwoFactor(
      user.id,
      dto.secret,
      recoveryCodes,
    );

    await this.auditService.record(AuditEvent.AuthTwoFactorEnabled, {
      objectId: user.id,
    });

    return new TwoFactorEnabledResponseDto(
      this.translationService.t('auth.twoFactorEnabled'),
      recoveryCodes,
    );
  }

  async verifyTwoFactor(
    dto: VerifyTwoFactorDto,
    metadata: RequestMetadata,
  ): Promise<LoginPayloadDto> {
    const { userId } = await this.validateTempToken(dto.tempToken);
    const user = await this.authRepository.findByIdWithTwoFactorData(userId);

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new TwoFactorNotEnabledException();
    }

    const decryptedSecret = this.twoFactorService.decryptSecret(
      user.twoFactorSecret,
    );

    const isTotpValid = this.twoFactorService.verifyTOTP(
      dto.code,
      decryptedSecret,
    );

    if (isTotpValid) {
      return this.completeLogin(userId, dto.sessionId, metadata);
    }

    const isRecoveryValid = await this.twoFactorService.validateRecoveryCode(
      userId,
      dto.code,
    );

    if (isRecoveryValid) {
      return this.completeLogin(userId, dto.sessionId, metadata);
    }

    this.logger.warn({ userId }, 'Invalid 2FA code or recovery code');
    throw new InvalidTwoFactorCodeException();
  }

  async disableTwoFactor(
    user: UserEntity,
    dto: DisableTwoFactorDto,
  ): Promise<{ message: string }> {
    const isPasswordValid = await validateHash(dto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(
        { userId: user.id },
        'Invalid password when attempting to disable 2FA',
      );
      throw new InvalidCredentialsException();
    }

    await this.twoFactorService.disableTwoFactor(user.id);

    await this.auditService.record(AuditEvent.AuthTwoFactorDisabled, {
      objectId: user.id,
    });

    return { message: this.translationService.t('auth.twoFactorDisabled') };
  }

  async regenerateRecoveryCodes(
    user: UserEntity,
    dto: DisableTwoFactorDto,
  ): Promise<RecoveryCodesResponseDto> {
    const isPasswordValid = await validateHash(dto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(
        { userId: user.id },
        'Invalid password when regenerating recovery codes',
      );
      throw new InvalidCredentialsException();
    }

    const recoveryCodes = await this.twoFactorService.regenerateRecoveryCodes(
      user.id,
    );

    await this.auditService.record(AuditEvent.AuthRecoveryCodesRegenerated, {
      objectId: user.id,
    });

    return new RecoveryCodesResponseDto(recoveryCodes);
  }

  async validateSocialLogin(
    provider: 'google',
    socialData: SocialInterface,
    metadata: RequestMetadata,
    sessionId?: string,
  ): Promise<LoginPayloadDto> {
    const user = await this.authRepository.findByEmailWithPassword(
      socialData.email,
    );

    if (!user) {
      throw new RegistrationClosedException();
    }

    const effectiveSessionId =
      sessionId ?? randomBytes(OAUTH_SESSION_ID_BYTES).toString('hex');

    const tokens = await this.createTokenPair({
      userId: user.id,
      sessionId: effectiveSessionId,
      metadata,
    });

    this.metricsService.recordLogin(provider);

    await this.auditService.record(AuditEvent.AuthLoginSucceeded, {
      objectId: user.id,
      payload: { provider },
    });

    const response = new LoginPayloadDto(
      await this.userService.getUserProfile(user.id),
      tokens.accessToken,
    );
    response.refreshToken = tokens.refreshToken;
    response.sessionId = effectiveSessionId;

    return response;
  }

  private async completeLogin(
    userId: Uuid,
    sessionId: string,
    metadata: RequestMetadata,
  ): Promise<LoginPayloadDto> {
    const tokens = await this.createTokenPair({ userId, sessionId, metadata });

    this.metricsService.recordLogin('password');

    await this.auditService.record(AuditEvent.AuthLoginSucceeded, {
      objectId: userId,
      payload: { provider: 'password' },
    });

    const response = new LoginPayloadDto(
      await this.userService.getUserProfile(userId),
      tokens.accessToken,
    );
    response.refreshToken = tokens.refreshToken;

    return response;
  }

  private async createTempToken(data: {
    userId: Uuid;
  }): Promise<TokenPayloadDto> {
    return new TokenPayloadDto({
      expiresIn: TEMP_TOKEN_TTL_SECONDS,
      token: await this.jwtService.signAsync(
        { userId: data.userId, type: TokenType.TEMP_TOKEN },
        { expiresIn: TEMP_TOKEN_TTL },
      ),
    });
  }

  private async validateTempToken(token: string): Promise<{ userId: Uuid }> {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (payload.type !== TokenType.TEMP_TOKEN) {
        throw new InvalidTokenException();
      }

      return { userId: payload.userId };
    } catch {
      throw new InvalidTokenException();
    }
  }
}
