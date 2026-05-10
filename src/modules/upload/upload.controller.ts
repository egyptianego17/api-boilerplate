import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';
import { PinoLogger } from 'nestjs-pino';

import { SystemRole } from '../../constants/system-role.js';
import { ApiFile } from '../../decorators/api-file.decorator.js';
import { AuthUser } from '../../decorators/auth-user.decorator.js';
import { Protected } from '../../decorators/protected.decorator.js';
import type { IFile } from '../../interfaces/IFile.js';
import { AwsS3Service } from '../../shared/services/aws-s3.service.js';
import { ImageFileValidationPipe } from '../../validators/image-file.validator.js';
import type { UserEntity } from '../user/entities/user.entity.js';

interface UploadResponse {
  url: string;
}

@Controller('uploads')
@ApiTags('uploads')
@Throttle({
  short: { limit: 5, ttl: seconds(10) },
  medium: { limit: 20, ttl: seconds(60) },
  long: { limit: 50, ttl: seconds(300) },
})
export class UploadController {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UploadController.name);
  }

  @Post('image')
  @Protected({ systemRole: SystemRole.USER })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiFile('image', {
    description: 'Image file (PNG, JPG, WebP, max 5MB)',
  })
  @ApiOkResponse({
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'S3 URL of the uploaded image' },
      },
    },
  })
  async uploadImage(
    @UploadedFile(ImageFileValidationPipe) file: IFile,
    @AuthUser() user: UserEntity,
  ): Promise<UploadResponse> {
    this.logger.info(
      { userId: user.id, fileName: file.originalname, fileSize: file.size },
      'Uploading image',
    );

    const url = await this.awsS3Service.uploadImageWithVariants(file);

    this.logger.info({ userId: user.id, url }, 'Image uploaded successfully');

    return { url };
  }
}
