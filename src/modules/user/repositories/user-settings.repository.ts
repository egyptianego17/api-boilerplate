import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import type { CreateSettingsDto } from '../dtos/create-settings.dto.js';
import { UserSettingsEntity } from '../entities/user-settings.entity.js';

@Injectable()
export class UserSettingsRepository extends Repository<UserSettingsEntity> {
  constructor(dataSource: DataSource) {
    super(UserSettingsEntity, dataSource.createEntityManager());
  }

  /**
   * Create user settings
   */
  async createSettings(
    userId: Uuid,
    createSettingsDto: CreateSettingsDto,
  ): Promise<UserSettingsEntity> {
    const userSettingsEntity = this.create(createSettingsDto);
    userSettingsEntity.userId = userId;

    return this.save(userSettingsEntity);
  }
}
