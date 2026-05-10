import type { Relation } from 'typeorm';
import { Column, Entity, Index, OneToOne, VirtualColumn } from 'typeorm';

import { AbstractEntity } from '../../../common/abstract.entity.js';
import { SystemRole } from '../../../constants/system-role.js';
import { UseDto } from '../../../decorators/use-dto.decorator.js';
import type { UserDtoOptions } from '../dtos/user.dto.js';
import { UserDto } from '../dtos/user.dto.js';
import type { UserSettingsEntity } from './user-settings.entity.js';

@Entity({ name: 'users' })
@UseDto(UserDto)
@Index('idx_user_email_unique', ['email'], {
  unique: true,
})
export class UserEntity extends AbstractEntity<UserDto, UserDtoOptions> {
  @Column({ type: 'varchar' })
  firstName!: string;

  @Column({ type: 'varchar' })
  lastName!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ nullable: true, type: 'varchar' })
  phone?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  avatar?: string | null;

  @Column({ nullable: true, type: 'varchar', length: 160 })
  bio?: string | null;

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  systemRole!: SystemRole;

  @Index('idx_user_password_reset_token')
  @Column({ nullable: true, type: 'varchar' })
  passwordResetToken?: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  passwordResetExpires?: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  twoFactorSecret?: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  recoveryCodes?: string[] | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  refreshToken?: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  refreshTokenExpiresAt?: Date | null;

  @Index('idx_user_email_verification_token')
  @Column({ nullable: true, type: 'varchar', select: false })
  emailVerificationToken?: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  emailVerificationExpires?: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  pendingEmail?: string | null;

  @VirtualColumn({
    query: (alias) =>
      `SELECT CONCAT(${alias}.first_name, ' ', ${alias}.last_name)`,
  })
  fullName!: string;

  @OneToOne('UserSettingsEntity', 'user')
  settings?: Relation<UserSettingsEntity>;
}
