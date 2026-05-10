import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import type { UserEntity } from '../../user/entities/user.entity.js';

@Entity({ name: 'refresh_tokens' })
@Unique(['userId', 'sessionId'])
@Index(['userId'])
@Index(['expiresAt'])
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: Uuid;

  @Column({ type: 'uuid' })
  userId!: Uuid;

  @Column({ type: 'varchar', length: 500 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 64 })
  sessionId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<UserEntity>;
}
