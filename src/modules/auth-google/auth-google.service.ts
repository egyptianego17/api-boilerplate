import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

import { InvalidGoogleTokenException } from '../../exceptions/auth/invalid-google-token.exception.js';
import type { AuthGoogleLoginDto } from './dto/auth-google-login.dto.js';

export interface SocialInterface {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthGoogleService {
  private google: OAuth2Client;

  constructor(private configService: ConfigService) {
    this.google = new OAuth2Client(
      configService.get('google.clientId'),
      configService.get('google.clientSecret'),
    );
  }

  async getProfileByToken(
    loginDto: AuthGoogleLoginDto,
  ): Promise<SocialInterface> {
    const ticket = await this.google.verifyIdToken({
      idToken: loginDto.idToken,
      audience: [this.configService.getOrThrow('google.clientId')],
    });

    const data = ticket.getPayload();

    if (!data) {
      throw new InvalidGoogleTokenException();
    }

    return {
      id: data.sub,
      email: data.email!,
      firstName: data.given_name!,
      lastName: data.family_name!,
    };
  }
}
