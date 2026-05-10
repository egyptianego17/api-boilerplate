import { S3 } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import mime from 'mime-types';
import { PinoLogger } from 'nestjs-pino';

import {
  IMAGE_VARIANT_CONFIGS,
  ImageVariant,
} from '../../constants/image-variants.js';
import type { IFile } from './../../interfaces/IFile.js';
import { ApiConfigService } from './api-config.service.js';
import { GeneratorService } from './generator.service.js';
import { ImageProcessingService } from './image-processing.service.js';

@Injectable()
export class AwsS3Service {
  private readonly s3: S3;

  constructor(
    public configService: ApiConfigService,
    public generatorService: GeneratorService,
    private imageProcessingService: ImageProcessingService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AwsS3Service.name);

    const config = configService.awsS3Config;

    const s3Config: ConstructorParameters<typeof S3>[0] = {
      apiVersion: config.bucketApiVersion,
      region: config.bucketRegion,
      forcePathStyle: config.forcePathStyle,
    };

    if (config.endpoint) {
      s3Config.endpoint = config.endpoint;
    }

    if (config.accessKeyId && config.secretAccessKey) {
      s3Config.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.s3 = new S3(s3Config);
  }

  async uploadImage(file: IFile): Promise<string> {
    const fileName = this.generatorService.fileName(
      mime.extension(file.mimetype) as string,
    );
    const key = `images/${fileName}`;
    await this.s3.putObject({
      Bucket: this.configService.awsS3Config.bucketName,
      Body: file.buffer,
      Key: key,
      ContentType: file.mimetype,
    });

    const config = this.configService.awsS3Config;
    const baseUrl =
      config.publicUrl ||
      config.endpoint ||
      `https://s3.${config.bucketRegion}.amazonaws.com`;
    const url = `${baseUrl}/${config.bucketName}/${key}`;

    return url;
  }

  async uploadImageWithVariants(file: IFile): Promise<string> {
    const uuid = this.generatorService.uuid();
    const ext = mime.extension(file.mimetype) as string;
    const bucketName = this.configService.awsS3Config.bucketName;
    const originalKey = `images/${uuid}/original.${ext}`;

    await this.s3.putObject({
      Bucket: bucketName,
      Body: file.buffer,
      Key: originalKey,
      ContentType: file.mimetype,
    });

    const config = this.configService.awsS3Config;
    const baseUrl =
      config.publicUrl ||
      config.endpoint ||
      `https://s3.${config.bucketRegion}.amazonaws.com`;
    const originalUrl = `${baseUrl}/${bucketName}/${originalKey}`;

    try {
      const variants = await this.imageProcessingService.generateVariants(
        file.buffer,
      );

      const uploads = [...variants.entries()].map(async ([variant, buffer]) => {
        const variantKey = `images/${uuid}/${variant}.webp`;
        await this.s3.putObject({
          Bucket: bucketName,
          Body: buffer,
          Key: variantKey,
          ContentType: 'image/webp',
        });
      });

      await Promise.all(uploads);
    } catch (error) {
      this.logger.error(
        { error, uuid },
        'Failed to generate/upload image variants, original still stored',
      );
    }

    return originalUrl;
  }

  async deleteImage(url: string): Promise<void> {
    const bucketName = this.configService.awsS3Config.bucketName;
    const key = url.split(`/${bucketName}/`)[1];
    if (!key) return;
    await this.s3.deleteObject({ Bucket: bucketName, Key: key });
  }

  async deleteImageWithVariants(url: string): Promise<void> {
    const bucketName = this.configService.awsS3Config.bucketName;
    const key = url.split(`/${bucketName}/`)[1];
    if (!key) return;

    const uuidMatch = key.match(/^images\/([^/]+)\//);

    if (!uuidMatch) {
      await this.s3.deleteObject({ Bucket: bucketName, Key: key });
      return;
    }

    const uuid = uuidMatch[1];
    const variantKeys = [...IMAGE_VARIANT_CONFIGS.keys()].map(
      (variant) => `images/${uuid}/${variant}.webp`,
    );

    const allKeys = [key, ...variantKeys];

    await Promise.all(
      allKeys.map((k) =>
        this.s3
          .deleteObject({ Bucket: bucketName, Key: k })
          .catch((error) =>
            this.logger.warn(
              { error, key: k },
              'Failed to delete image variant',
            ),
          ),
      ),
    );
  }
}

export function deriveVariantUrl(
  originalUrl: string,
  variant: ImageVariant,
): string {
  const match = originalUrl.match(/\/original\.[^.]+$/);

  if (!match) {
    return originalUrl;
  }

  return originalUrl.replace(/\/original\.[^.]+$/, `/${variant}.webp`);
}
