import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';

import { AuthService } from '../auth/auth.service.js';
import { LoginPayloadDto } from '../auth/dto/login-payload.dto.js';
import { AuthGoogleService } from './auth-google.service.js';
import { AuthGoogleLoginDto } from './dto/auth-google-login.dto.js';

@ApiTags('auth')
@Controller('auth/google')
export class AuthGoogleController {
  constructor(
    private readonly authService: AuthService,
    private readonly authGoogleService: AuthGoogleService,
  ) {}

  @Post('login')
  @Throttle({
    short: { limit: 5, ttl: seconds(300) },
    medium: { limit: 10, ttl: seconds(600) },
    long: { limit: 20, ttl: seconds(3600) },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'Google OAuth login successful',
  })
  async login(
    @Body() loginDto: AuthGoogleLoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginPayloadDto> {
    const socialData = await this.authGoogleService.getProfileByToken(loginDto);

    return this.authService.validateSocialLogin(
      'google',
      socialData,
      { userAgent, ipAddress },
      loginDto.sessionId,
    );
  }
}
