import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UploadedFile,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';

import { AuthUser } from '../../decorators/auth-user.decorator.js';
import { Protected } from '../../decorators/protected.decorator.js';
import { ApiFile } from '../../decorators/swagger.schema.js';
import type { IFile } from '../../interfaces/IFile.js';
import type { Reference } from '../../types.js';
import { UserDto } from '../user/dtos/user.dto.js';
import type { UserEntity } from '../user/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto.js';
import { EnableTwoFactorDto } from './dto/enable-two-factor.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginPayloadDto } from './dto/login-payload.dto.js';
import { LogoutRequestDto } from './dto/logout.dto.js';
import { RecoveryCodesResponseDto } from './dto/recovery-codes-response.dto.js';
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from './dto/refresh-token.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TwoFactorEnabledResponseDto } from './dto/two-factor-enabled-response.dto.js';
import { TwoFactorSetupDto } from './dto/two-factor-setup.dto.js';
import { UserLoginDto } from './dto/user-login.dto.js';
import { UserRegisterDto } from './dto/user-register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto.js';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({
    short: { limit: 5, ttl: seconds(300) },
    medium: { limit: 5, ttl: seconds(300) },
    long: { limit: 10, ttl: seconds(900) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'User info with access token or temp token for 2FA',
  })
  async userLogin(
    @Body() userLoginDto: UserLoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginPayloadDto> {
    return this.authService.login(userLoginDto, {
      userAgent,
      ipAddress,
    });
  }

  @Post('register')
  @Throttle({
    short: { limit: 3, ttl: seconds(3600) },
    medium: { limit: 3, ttl: seconds(3600) },
    long: { limit: 5, ttl: seconds(86_400) },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    description: 'User registered, verification email sent',
  })
  @ApiFile({ name: 'avatar' })
  async userRegister(
    @Body() userRegisterDto: UserRegisterDto,
    @UploadedFile() file?: Reference<IFile>,
  ): Promise<{ message: string }> {
    return this.authService.register(userRegisterDto, file);
  }

  @Post('verify-email')
  @Throttle({
    short: { limit: 5, ttl: seconds(300) },
    medium: { limit: 10, ttl: seconds(600) },
    long: { limit: 20, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'Email verified, user logged in',
  })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginPayloadDto> {
    return this.authService.verifyEmail(dto, {
      userAgent,
      ipAddress,
    });
  }

  @Post('resend-verification')
  @Throttle({
    short: { limit: 3, ttl: seconds(300) },
    medium: { limit: 5, ttl: seconds(600) },
    long: { limit: 10, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Verification email sent if applicable',
  })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendVerification(dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @Protected()
  @ApiOkResponse({ type: UserDto, description: 'current user info' })
  getCurrentUser(@AuthUser() user: UserEntity): UserDto {
    return user.toDto();
  }

  @Post('forgot-password')
  @Throttle({
    short: { limit: 3, ttl: seconds(3600) },
    medium: { limit: 3, ttl: seconds(3600) },
    long: { limit: 5, ttl: seconds(86_400) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Password reset email sent successfully',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Throttle({
    short: { limit: 5, ttl: seconds(300) },
    medium: { limit: 5, ttl: seconds(300) },
    long: { limit: 10, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('2fa/setup')
  @Protected()
  @Throttle({
    short: { limit: 3, ttl: seconds(60) },
    medium: { limit: 5, ttl: seconds(300) },
    long: { limit: 10, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: TwoFactorSetupDto,
    description: 'Setup data for 2FA (QR code and secret)',
  })
  async setupTwoFactor(
    @AuthUser() user: UserEntity,
  ): Promise<TwoFactorSetupDto> {
    return this.authService.setupTwoFactor(user.email!);
  }

  @Post('2fa/enable')
  @Protected()
  @Throttle({
    short: { limit: 5, ttl: seconds(60) },
    medium: { limit: 10, ttl: seconds(300) },
    long: { limit: 20, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: TwoFactorEnabledResponseDto,
    description: '2FA enabled successfully',
  })
  async enableTwoFactor(
    @AuthUser() user: UserEntity,
    @Body() dto: EnableTwoFactorDto,
  ): Promise<TwoFactorEnabledResponseDto> {
    return this.authService.enableTwoFactor(user, dto);
  }

  @Post('2fa/verify')
  @Throttle({
    short: { limit: 5, ttl: seconds(60) },
    medium: { limit: 10, ttl: seconds(300) },
    long: { limit: 15, ttl: seconds(900) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'User info with access token after 2FA verification',
  })
  async verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginPayloadDto> {
    return this.authService.verifyTwoFactor(dto, {
      userAgent,
      ipAddress,
    });
  }

  @Post('2fa/disable')
  @Protected()
  @Throttle({
    short: { limit: 3, ttl: seconds(60) },
    medium: { limit: 5, ttl: seconds(300) },
    long: { limit: 10, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: '2FA disabled successfully',
  })
  async disableTwoFactor(
    @AuthUser() user: UserEntity,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<{ message: string }> {
    return this.authService.disableTwoFactor(user, dto);
  }

  @Post('2fa/recovery-codes/regenerate')
  @Protected()
  @Throttle({
    short: { limit: 2, ttl: seconds(60) },
    medium: { limit: 3, ttl: seconds(300) },
    long: { limit: 5, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: RecoveryCodesResponseDto,
    description: 'Recovery codes regenerated successfully',
  })
  async regenerateRecoveryCodes(
    @AuthUser() user: UserEntity,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<RecoveryCodesResponseDto> {
    return this.authService.regenerateRecoveryCodes(user, dto);
  }

  @Post('refresh')
  @Throttle({
    short: { limit: 10, ttl: seconds(60) },
    medium: { limit: 30, ttl: seconds(300) },
    long: { limit: 60, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: RefreshTokenResponseDto,
    description: 'Refresh access token using refresh token',
  })
  async refreshToken(
    @Body() dto: RefreshTokenRequestDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken, dto.sessionId, {
      userAgent,
      ipAddress,
    });
  }

  @Post('logout')
  @Protected()
  @Throttle({
    short: { limit: 10, ttl: seconds(60) },
    medium: { limit: 30, ttl: seconds(300) },
    long: { limit: 60, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(
    @AuthUser() user: UserEntity,
    @Body() dto: LogoutRequestDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.id, dto.sessionId);

    return { message: 'Logged out successfully' };
  }
}
