import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PinoLogger } from 'nestjs-pino';
import type { FindOptionsWhere } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import type { PageOptionsDto } from '../../common/dto/page-options.dto.js';
import type { PageDto } from '../../common/dto/page.dto.js';
import { hashToken, validateHash } from '../../common/utils.js';
import { EmailAlreadyRegisteredException } from '../../exceptions/auth/email-already-registered.exception.js';
import { FileNotImageException } from '../../exceptions/auth/file-not-image.exception.js';
import { IncorrectPasswordException } from '../../exceptions/auth/incorrect-password.exception.js';
import { InvalidVerificationTokenException } from '../../exceptions/auth/invalid-verification-token.exception.js';
import { PendingEmailChangeNotFoundException } from '../../exceptions/auth/pending-email-change-not-found.exception.js';
import { UserNotFoundException } from '../../exceptions/shared/user-not-found.exception.js';
import type { IFile } from '../../interfaces/IFile.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { AwsS3Service } from '../../shared/services/aws-s3.service.js';
import { TranslationService } from '../../shared/services/translation.service.js';
import { ValidatorService } from '../../shared/services/validator.service.js';
import type { Reference } from '../../types.js';
import type { UserRegisterDto } from '../auth/dto/user-register.dto.js';
import type { ChangePasswordDto } from './dtos/change-password.dto.js';
import type { ConfirmEmailChangeDto } from './dtos/confirm-email-change.dto.js';
import type { CreateSettingsDto } from './dtos/create-settings.dto.js';
import type { RequestEmailChangeDto } from './dtos/request-email-change.dto.js';
import type { UpdateProfileDto } from './dtos/update-profile.dto.js';
import type { UpdateUserDto } from './dtos/update-user.dto.js';
import type { UpdateUserSettingsDto } from './dtos/update-user-settings.dto.js';
import type { UserDto } from './dtos/user.dto.js';
import { UserEntity } from './entities/user.entity.js';
import type { UserSettingsEntity } from './entities/user-settings.entity.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserSettingsRepository } from './repositories/user-settings.repository.js';

@Injectable()
export class UserService {
  constructor(
    private readonly logger: PinoLogger,
    private userRepository: UserRepository,
    private userSettingsRepository: UserSettingsRepository,
    private validatorService: ValidatorService,
    private awsS3Service: AwsS3Service,
    private mailService: MailService,
    private readonly translationService: TranslationService,
  ) {
    this.logger.setContext(UserService.name);
  }

  findOne(findData: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOneBy(findData);
  }

  findByUsernameOrEmail(
    options: Partial<{ username: string; email: string }>,
  ): Promise<UserEntity | null> {
    return this.userRepository.findByUsernameOrEmail(options);
  }

  @Transactional()
  async createUser(
    userRegisterDto: UserRegisterDto,
    file?: Reference<IFile>,
  ): Promise<UserEntity> {
    const user = this.userRepository.create(userRegisterDto);

    if (file && !this.validatorService.isImage(file.mimetype)) {
      throw new FileNotImageException();
    }

    if (file) {
      user.avatar = await this.awsS3Service.uploadImageWithVariants(file);
    }

    await this.userRepository.save(user);

    user.settings = await this.createSettings(user.id, {
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    this.logger.info(
      { userId: user.id, email: user.email },
      'User registered successfully',
    );

    return user;
  }

  async getUsers(pageOptionsDto: PageOptionsDto): Promise<PageDto<UserDto>> {
    const queryBuilder = this.userRepository.findPaginated(pageOptionsDto);
    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    return items.toPageDto(pageMetaDto);
  }

  async getUser(userId: Uuid): Promise<UserDto> {
    const userEntity = await this.userRepository.findById(userId);

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    return userEntity.toDto();
  }

  async updateUser(
    userId: Uuid,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDto> {
    const userEntity = await this.userRepository.findById(userId);

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    Object.assign(userEntity, updateUserDto);
    await this.userRepository.save(userEntity);

    return userEntity.toDto();
  }

  async deleteUser(userId: Uuid): Promise<void> {
    const userEntity = await this.userRepository.findById(userId);

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    if (userEntity.avatar) {
      await this.awsS3Service.deleteImageWithVariants(userEntity.avatar);
    }

    await this.userRepository.remove(userEntity);
  }

  async createSettings(
    userId: Uuid,
    createSettingsDto: CreateSettingsDto,
  ): Promise<UserSettingsEntity> {
    return this.userSettingsRepository.createSettings(
      userId,
      createSettingsDto,
    );
  }

  async updatePasswordResetToken(
    userId: Uuid,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userRepository.updatePasswordResetToken(userId, token, expires);
  }

  async updatePasswordAndClearResetToken(
    userId: Uuid,
    hashedPassword: string,
  ): Promise<void> {
    await this.userRepository.updatePasswordAndClearResetToken(
      userId,
      hashedPassword,
    );
  }

  async updateTwoFactorSecret(
    userId: Uuid,
    secret: string | null,
  ): Promise<void> {
    await this.userRepository.updateTwoFactorSecret(userId, secret);
  }

  async enableTwoFactor(
    userId: Uuid,
    secret: string,
    recoveryCodes: string[],
  ): Promise<void> {
    await this.userRepository.enableTwoFactor(userId, secret, recoveryCodes);
  }

  async disableTwoFactor(userId: Uuid): Promise<void> {
    await this.userRepository.disableTwoFactor(userId);
  }

  async updateRecoveryCodes(
    userId: Uuid,
    recoveryCodes: string[],
  ): Promise<void> {
    await this.userRepository.updateRecoveryCodes(userId, recoveryCodes);
  }

  async getUserProfile(userId: Uuid): Promise<UserDto> {
    const user = await this.userRepository.findByIdWithSettings(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    return user.toDto();
  }

  async updateProfile(userId: Uuid, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.userRepository.findByIdWithSettings(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    const { language, ...profileFields } = dto;

    Object.assign(user, profileFields);
    await this.userRepository.save(user);

    if (language && user.settings) {
      user.settings.language = language;
      await this.userSettingsRepository.save(user.settings);
    }

    return user.toDto();
  }

  async uploadAvatar(userId: Uuid, file: IFile): Promise<UserDto> {
    if (!this.validatorService.isImage(file.mimetype)) {
      throw new FileNotImageException();
    }

    const user = await this.userRepository.findByIdWithSettings(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    user.avatar = await this.awsS3Service.uploadImageWithVariants(file);
    await this.userRepository.save(user);

    return user.toDto();
  }

  async deleteAvatar(userId: Uuid): Promise<UserDto> {
    const user = await this.userRepository.findByIdWithSettings(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    if (user.avatar) {
      await this.awsS3Service.deleteImageWithVariants(user.avatar);
      user.avatar = null;
      await this.userRepository.save(user);
    }

    return user.toDto();
  }

  async updateSettings(
    userId: Uuid,
    dto: UpdateUserSettingsDto,
  ): Promise<UserDto> {
    const user = await this.userRepository.findByIdWithSettings(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    if (!user.settings) {
      user.settings = await this.createSettings(userId, {
        isEmailVerified: false,
        isPhoneVerified: false,
      });
    }

    Object.assign(user.settings, dto);
    await this.userSettingsRepository.save(user.settings);

    return user.toDto();
  }

  async changePassword(userId: Uuid, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundException();
    }

    const isCurrentPasswordValid = await validateHash(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new IncorrectPasswordException();
    }

    user.password = dto.newPassword;
    await this.userRepository.save(user);
  }

  async setEmailVerified(userId: Uuid): Promise<void> {
    await this.userSettingsRepository.update(
      { userId },
      { isEmailVerified: true },
    );
  }

  async requestEmailChange(
    userId: Uuid,
    dto: RequestEmailChangeDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdWithSettings(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    if (user.email.toLowerCase() === dto.email.toLowerCase()) {
      return {
        message: this.translationService.t('auth.emailChangeRequested'),
      };
    }

    const existing = await this.userRepository.findByEmail(dto.email);

    if (existing) {
      throw new EmailAlreadyRegisteredException();
    }

    const plainToken = randomBytes(3).toString('hex').toUpperCase();
    const hashedToken = hashToken(plainToken);
    const expires = new Date(Date.now() + 24 * 3_600_000);

    await this.userRepository.setPendingEmailChange(
      userId,
      dto.email,
      hashedToken,
      expires,
    );

    await this.mailService.confirmNewEmail({
      to: dto.email,
      data: { hash: plainToken },
    });

    const message = this.translationService.t('auth.emailChangeRequested');

    return { message };
  }

  async confirmEmailChange(
    userId: Uuid,
    dto: ConfirmEmailChangeDto,
  ): Promise<UserDto> {
    const user = await this.userRepository.findByIdWithPendingEmail(userId);

    if (!user || !user.pendingEmail) {
      throw new PendingEmailChangeNotFoundException();
    }

    if (
      !user.emailVerificationToken ||
      hashToken(dto.hash) !== user.emailVerificationToken
    ) {
      throw new InvalidVerificationTokenException();
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new InvalidVerificationTokenException();
    }

    await this.userRepository.confirmEmailChange(userId, user.pendingEmail);

    const updatedUser = await this.userRepository.findByIdWithSettings(userId);

    if (!updatedUser) {
      throw new UserNotFoundException();
    }

    return updatedUser.toDto();
  }
}
