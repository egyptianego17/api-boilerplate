import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { validate as isUuid } from 'uuid';

import { generateHash, validateHash } from '../../common/utils.js';
import {
  REFRESH_TOKEN_SECRET_BYTES,
  REFRESH_TOKEN_TTL_DAYS,
} from '../../constants/auth-tokens.js';
import { ExpiredRefreshTokenException } from '../../exceptions/auth/expired-refresh-token.exception.js';
import { InvalidRefreshTokenException } from '../../exceptions/auth/invalid-refresh-token.exception.js';
import type { UserEntity } from '../user/entities/user.entity.js';
import { UserRepository } from '../user/repositories/user.repository.js';
import type { RequestMetadata } from './interfaces/request-metadata.interface.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';

@Injectable()
export class RefreshTokenService {
  constructor(
    private refreshTokenRepository: RefreshTokenRepository,
    private userRepository: UserRepository,
  ) {}

  async generateRefreshToken(
    userId: Uuid,
    sessionId: string,
    metadata: RequestMetadata,
  ): Promise<string> {
    const secret = randomBytes(REFRESH_TOKEN_SECRET_BYTES).toString('hex');
    const tokenHash = generateHash(secret);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    /* Scoping by userId so another user can't wipe this session via a colliding sessionId */
    await this.refreshTokenRepository.deleteByUserAndSession(userId, sessionId);

    await this.refreshTokenRepository.save({
      userId,
      tokenHash,
      sessionId,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt,
    });

    return `${userId}.${secret}`;
  }

  async validateAndGetUser(
    token: string,
    sessionId: string,
  ): Promise<UserEntity> {
    const separatorIndex = token.indexOf('.');
    const userId = separatorIndex > 0 ? token.slice(0, separatorIndex) : '';
    const secret = separatorIndex > 0 ? token.slice(separatorIndex + 1) : '';

    if (!userId || !secret || !isUuid(userId)) {
      throw new InvalidRefreshTokenException();
    }

    const tokenEntry = await this.refreshTokenRepository.findByUserAndSession(
      userId as Uuid,
      sessionId,
    );

    if (!tokenEntry) {
      throw new InvalidRefreshTokenException();
    }

    const isValid = await validateHash(secret, tokenEntry.tokenHash);

    if (!isValid) {
      throw new InvalidRefreshTokenException();
    }

    if (tokenEntry.expiresAt < new Date()) {
      await this.refreshTokenRepository.deleteById(tokenEntry.id);
      throw new ExpiredRefreshTokenException();
    }

    const user = await this.userRepository.findById(tokenEntry.userId);

    if (!user) {
      throw new InvalidRefreshTokenException();
    }

    return user;
  }

  async revokeRefreshToken(userId: Uuid, sessionId: string): Promise<void> {
    await this.refreshTokenRepository.deleteByUserAndSession(userId, sessionId);
  }

  async revokeAllForUser(userId: Uuid): Promise<void> {
    await this.refreshTokenRepository.deleteAllForUser(userId);
  }
}
