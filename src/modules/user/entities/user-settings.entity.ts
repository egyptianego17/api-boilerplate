import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { AbstractEntity } from '../../../common/abstract.entity.js';
import { UseDto } from '../../../decorators/use-dto.decorator.js';
import type { UserDtoOptions } from '../dtos/user.dto.js';
import { UserDto } from '../dtos/user.dto.js';
import type { UserEntity } from './user.entity.js';

@Entity({ name: 'user_settings' })
@UseDto(UserDto)
export class UserSettingsEntity extends AbstractEntity<
  UserDto,
  UserDtoOptions
> {
  @Column({ type: 'uuid' })
  userId!: Uuid;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified!: boolean;

  @Column({ type: 'varchar', nullable: true, default: 'en' })
  language?: string | null;

  @OneToOne('UserEntity', 'settings', {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<UserEntity>;
}
