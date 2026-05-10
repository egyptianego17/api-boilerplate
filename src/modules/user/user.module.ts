import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../../shared/mail/mail.module.js';
import { UserEntity } from './entities/user.entity.js';
import { UserSettingsEntity } from './entities/user-settings.entity.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserSettingsRepository } from './repositories/user-settings.repository.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserSettingsEntity]),
    MailModule,
  ],
  controllers: [UserController],
  exports: [UserService, UserRepository, UserSettingsRepository],
  providers: [UserService, UserRepository, UserSettingsRepository],
})
export class UserModule {}
