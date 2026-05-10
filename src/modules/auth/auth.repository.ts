import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { UserEntity } from '../user/entities/user.entity.js';

@Injectable()
export class AuthRepository extends Repository<UserEntity> {
  constructor(dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.settings', 'settings')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async findByPasswordResetToken(
    tokenHash: string,
  ): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.passwordResetToken')
      .where('user.passwordResetToken = :tokenHash', { tokenHash })
      .andWhere('user.passwordResetExpires > :now', { now: new Date() })
      .getOne();
  }

  async findByIdWithTwoFactorData(userId: Uuid): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .addSelect(['user.twoFactorSecret', 'user.recoveryCodes'])
      .where('user.id = :userId', { userId })
      .getOne();
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

  async clearPasswordResetToken(userId: Uuid): Promise<void> {
    await this.update(userId, {
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async updatePassword(userId: Uuid, hashedPassword: string): Promise<void> {
    await this.update(userId, { password: hashedPassword });
  }

  async enableTwoFactor(
    userId: Uuid,
    encryptedSecret: string,
    hashedRecoveryCodes: string[],
  ): Promise<void> {
    await this.update(userId, {
      twoFactorSecret: encryptedSecret,
      twoFactorEnabled: true,
      recoveryCodes: hashedRecoveryCodes,
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
    hashedRecoveryCodes: string[],
  ): Promise<void> {
    await this.update(userId, { recoveryCodes: hashedRecoveryCodes });
  }

  async findByIdWithSiteMemberships(userId: Uuid): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .leftJoinAndSelect('user.siteMemberships', 'siteMemberships')
      .leftJoinAndSelect('siteMemberships.site', 'site')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async findByEmailVerificationToken(
    tokenHash: string,
  ): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.emailVerificationToken')
      .leftJoinAndSelect('user.settings', 'settings')
      .where('user.emailVerificationToken = :tokenHash', { tokenHash })
      .andWhere('user.emailVerificationExpires > :now', { now: new Date() })
      .andWhere('user.pendingEmail IS NULL')
      .getOne();
  }

  async setEmailVerificationToken(
    userId: Uuid,
    hashedToken: string,
    expires: Date,
  ): Promise<void> {
    await this.update(userId, {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: expires,
    });
  }

  async clearEmailVerificationToken(userId: Uuid): Promise<void> {
    await this.update(userId, {
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
  }
}
