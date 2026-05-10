import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { RefreshTokenEntity } from './entities/refresh-token.entity.js';

@Injectable()
export class RefreshTokenRepository extends Repository<RefreshTokenEntity> {
  constructor(dataSource: DataSource) {
    super(RefreshTokenEntity, dataSource.createEntityManager());
  }

  async findByUserAndSession(
    userId: Uuid,
    sessionId: string,
  ): Promise<RefreshTokenEntity | null> {
    return this.findOne({ where: { userId, sessionId } });
  }

  async deleteByUserAndSession(userId: Uuid, sessionId: string): Promise<void> {
    await this.delete({ userId, sessionId });
  }

  async deleteAllForUser(userId: Uuid): Promise<void> {
    await this.delete({ userId });
  }

  async deleteById(id: Uuid): Promise<void> {
    await this.delete({ id });
  }
}
