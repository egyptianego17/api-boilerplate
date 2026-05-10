import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import sharp from 'sharp';

import {
  IMAGE_VARIANT_CONFIGS,
  ImageVariant,
} from '../../constants/image-variants.js';

@Injectable()
export class ImageProcessingService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ImageProcessingService.name);
  }

  async generateVariants(buffer: Buffer): Promise<Map<ImageVariant, Buffer>> {
    const variants = new Map<ImageVariant, Buffer>();

    const entries = [...IMAGE_VARIANT_CONFIGS.entries()];

    const results = await Promise.allSettled(
      entries.map(async ([variant, config]) => {
        const resized = await sharp(buffer)
          .resize(config.width, config.height, { fit: 'cover' })
          .webp({ quality: config.quality })
          .toBuffer();

        return { variant, buffer: resized };
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        variants.set(result.value.variant, result.value.buffer);
      } else {
        this.logger.error(
          { error: result.reason },
          'Failed to generate image variant',
        );
      }
    }

    return variants;
  }
}
