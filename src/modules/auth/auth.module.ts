import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../../shared/mail/mail.module.js';
import { ApiConfigService } from '../../shared/services/api-config.service.js';
import { TurnstileService } from '../../shared/services/turnstile.service.js';
import { UserModule } from '../user/user.module.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenEntity } from './entities/refresh-token.entity.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PublicStrategy } from './public.strategy.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { TwoFactorService } from './two-factor.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    UserModule,
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ApiConfigService) => ({
        privateKey: configService.authConfig.privateKey,
        publicKey: configService.authConfig.publicKey,
        signOptions: {
          algorithm: 'RS256',
          expiresIn: configService.authConfig.jwtExpirationTime,
        },
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
      inject: [ApiConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    JwtStrategy,
    PublicStrategy,
    TwoFactorService,
    RefreshTokenRepository,
    RefreshTokenService,
    TurnstileService,
  ],
  exports: [JwtModule, AuthService, RefreshTokenService],
})
export class AuthModule {}
