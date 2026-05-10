import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

@Injectable()
export class TurnstileService {
  constructor(
    @InjectPinoLogger(TurnstileService.name)
    private readonly logger: PinoLogger,
    private configService: ConfigService,
  ) {}

  async verify(token: string, userIp?: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (nodeEnv === 'development') {
      this.logger.warn(
        'Development bypass token detected - skipping Turnstile validation',
      );
      return true;
    }

    if (!secretKey) {
      this.logger.error('TURNSTILE_SECRET_KEY not configured');
      return false;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);

      if (userIp) {
        formData.append('remoteip', userIp);
      }

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        },
      );

      const data = (await response.json()) as TurnstileVerifyResponse;

      if (!data.success) {
        this.logger.warn(
          { errorCodes: data['error-codes'] },
          'Turnstile verification failed',
        );
      }

      return data.success;
    } catch (error) {
      this.logger.error({ error }, 'Failed to verify Turnstile token');
      return false;
    }
  }
}
