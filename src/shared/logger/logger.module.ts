import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { ApiConfigService } from '../services/api-config.service.js';
import { SharedModule } from '../shared.module.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [SharedModule],
      inject: [ApiConfigService],
      useFactory: (configService: ApiConfigService) => ({
        pinoHttp: {
          level: configService.logLevel,

          genReqId: (req: IncomingMessage): string => {
            const inbound =
              req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
            const candidate = Array.isArray(inbound) ? inbound[0] : inbound;

            return typeof candidate === 'string' && UUID_PATTERN.test(candidate)
              ? candidate
              : randomUUID();
          },

          transport: configService.isDevelopment
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  levelFirst: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : {
                targets: [
                  { target: 'pino/file', options: { destination: 1 } },
                  ...(configService.lokiUrl
                    ? [
                        {
                          target: 'pino-loki',
                          options: {
                            host: configService.lokiUrl,
                            batching: true,
                            interval: 5,
                            labels: {
                              app: 'api-boilerplate',
                              environment: configService.nodeEnv,
                            },
                          },
                        },
                      ]
                    : []),
                ],
              },

          autoLogging: true,

          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              query: req.query,
              params: req.params,
              headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type'],
                'x-request-id': req.headers['x-request-id'],
              },
            }),
            res: (res) => ({
              statusCode: res.statusCode,
            }),
          },

          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.confirmPassword',
              'req.body.currentPassword',
              'req.body.newPassword',
              'req.body.token',
              'req.body.refreshToken',
              'req.body.accessToken',
              'req.body.secret',
              'req.body.twoFactorSecret',
              'req.body.recoveryCodes',
              'req.body.creditCard',
              'req.body.cardNumber',
              'req.body.cvv',
              'req.body.ssn',
              'password',
              'token',
              'secret',
              'authorization',
            ],
            censor: '[REDACTED]',
          },

          customLogLevel: (_req, res, err) => {
            if (res.statusCode >= 500 || err) {
              return 'error';
            }

            if (res.statusCode >= 400) {
              return 'warn';
            }

            return 'info';
          },

          customSuccessMessage: (req, res) => {
            return `${req.method} ${req.url} completed with ${res.statusCode}`;
          },

          customErrorMessage: (req, res, err) => {
            return `${req.method} ${req.url} failed with ${res.statusCode}: ${err?.message || 'Unknown error'}`;
          },

          customProps: (req: IncomingMessage): Record<string, unknown> => ({
            requestId: req.id,
          }),

          quietReqLogger: true,
          customAttributeKeys: {
            req: 'request',
            res: 'response',
            err: 'error',
            responseTime: 'duration',
          },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
