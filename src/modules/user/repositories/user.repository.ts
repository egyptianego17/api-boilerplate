import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import type { PageOptionsDto } from '../../../common/dto/page-options.dto.js';
import { UserEntity } from '../entities/user.entity.js';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  private createBaseQueryBuilder(): SelectQueryBuilder<UserEntity> {
    return this.createQueryBuilder('user').select([
      'user.id',
      'user.firstName',
      'user.lastName',
      'user.email',
      'user.phone',
      'user.avatar',
      'user.bio',
      'user.systemRole',
      'user.createdAt',
      'user.updatedAt',
    ]);
  }

  async findById(userId: Uuid): Promise<UserEntity | null> {
    return this.createBaseQueryBuilder()
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async findByIdWithSettings(userId: Uuid): Promise<UserEntity | null> {
    return this.createBaseQueryBuilder()
      .addSelect(['user.twoFactorEnabled'])
      .leftJoinAndSelect('user.settings', 'settings')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async findByUsernameOrEmail(
    options: Partial<{ username: string; email: string }>,
  ): Promise<UserEntity | null> {
    const queryBuilder = this.createQueryBuilder('user').leftJoinAndSelect(
      'user.settings',
      'settings',
    );

    if (options.email) {
      queryBuilder.orWhere('LOWER(user.email) = LOWER(:email)', {
        email: options.email,
      });
    }

    return queryBuilder.getOne();
  }

  findPaginated(pageOptions: PageOptionsDto): SelectQueryBuilder<UserEntity> {
    return this.createBaseQueryBuilder().orderBy(
      'user.createdAt',
      pageOptions.order,
    );
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.createQueryBuilder('user')
      .select('1')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .limit(1)
      .getRawOne();

    return !!result;
  }

  async updatePasswordResetToken(
    userId: Uuid,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async updatePasswordAndClearResetToken(
    userId: Uuid,
    hashedPassword: string,
  ): Promise<void> {
    await this.update(userId, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async updateTwoFactorSecret(
    userId: Uuid,
    secret: string | null,
  ): Promise<void> {
    await this.update(userId, {
      twoFactorSecret: secret,
    });
  }

  async enableTwoFactor(
    userId: Uuid,
    secret: string,
    recoveryCodes: string[],
  ): Promise<void> {
    await this.update(userId, {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      recoveryCodes,
    });
  }

  async disableTwoFactor(userId: Uuid): Promise<void> {
    await this.update(userId, {
      twoFactorSecret: null,
      twoFactorEnabled: false,
      recoveryCodes: null,
    });
  }

  async updateRecoveryCodes(
    userId: Uuid,
    recoveryCodes: string[],
  ): Promise<void> {
    await this.update(userId, {
      recoveryCodes,
    });
  }

  async findByIdWithPendingEmail(userId: Uuid): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .addSelect(['user.emailVerificationToken', 'user.pendingEmail'])
      .leftJoinAndSelect('user.settings', 'settings')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async setPendingEmailChange(
    userId: Uuid,
    pendingEmail: string,
    hashedToken: string,
    expires: Date,
  ): Promise<void> {
    await this.update(userId, {
      pendingEmail,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: expires,
    });
  }

  async confirmEmailChange(userId: Uuid, newEmail: string): Promise<void> {
    await this.update(userId, {
      email: newEmail,
      pendingEmail: null,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
  }
}
