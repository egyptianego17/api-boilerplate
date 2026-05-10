import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';

import { AuthUser } from '../../decorators/auth-user.decorator.js';
import { Protected } from '../../decorators/protected.decorator.js';
import { ApiFile } from '../../decorators/swagger.schema.js';
import type { IFile } from '../../interfaces/IFile.js';
import type { Reference } from '../../types.js';
import { ChangePasswordDto } from './dtos/change-password.dto.js';
import { ConfirmEmailChangeDto } from './dtos/confirm-email-change.dto.js';
import { RequestEmailChangeDto } from './dtos/request-email-change.dto.js';
import { UpdateProfileDto } from './dtos/update-profile.dto.js';
import { UpdateUserSettingsDto } from './dtos/update-user-settings.dto.js';
import { UserDto } from './dtos/user.dto.js';
import type { UserEntity } from './entities/user.entity.js';
import { UserService } from './user.service.js';

@Controller('users')
@ApiTags('users')
@Throttle({
  short: { limit: 10, ttl: seconds(1) },
  medium: { limit: 60, ttl: seconds(10) },
  long: { limit: 300, ttl: seconds(60) },
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: UserDto,
    description: 'Get current user profile',
  })
  async getCurrentUser(@AuthUser() user: UserEntity): Promise<UserDto> {
    return this.userService.getUserProfile(user.id);
  }

  @Patch('me')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: UserDto,
    description: 'Update current user profile',
  })
  async updateProfile(
    @AuthUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.userService.updateProfile(user.id, dto);
  }

  @Patch('me/avatar')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiFile({ name: 'avatar' }, { isRequired: true })
  @ApiOkResponse({
    type: UserDto,
    description: 'Upload current user avatar',
  })
  async uploadAvatar(
    @AuthUser() user: UserEntity,
    @UploadedFile() file: Reference<IFile>,
  ): Promise<UserDto> {
    return this.userService.uploadAvatar(user.id, file);
  }

  @Delete('me/avatar')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserDto, description: 'Avatar deleted' })
  async deleteAvatar(@AuthUser() user: UserEntity): Promise<UserDto> {
    return this.userService.deleteAvatar(user.id);
  }

  @Patch('me/settings')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: UserDto,
    description: 'Update current user settings',
  })
  async updateSettings(
    @AuthUser() user: UserEntity,
    @Body() dto: UpdateUserSettingsDto,
  ): Promise<UserDto> {
    return this.userService.updateSettings(user.id, dto);
  }

  @Patch('me/password')
  @Protected()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Password changed successfully' })
  async changePassword(
    @AuthUser() user: UserEntity,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.userService.changePassword(user.id, dto);
  }

  @Post('me/request-email-change')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Verification email sent to new address',
  })
  async requestEmailChange(
    @AuthUser() user: UserEntity,
    @Body() dto: RequestEmailChangeDto,
  ): Promise<{ message: string }> {
    return this.userService.requestEmailChange(user.id, dto);
  }

  @Post('me/confirm-email-change')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: UserDto,
    description: 'Email changed successfully',
  })
  async confirmEmailChange(
    @AuthUser() user: UserEntity,
    @Body() dto: ConfirmEmailChangeDto,
  ): Promise<UserDto> {
    return this.userService.confirmEmailChange(user.id, dto);
  }
}
