import type { Provider } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';

import { ApiConfigService } from './services/api-config.service.js';
import { AwsS3Service } from './services/aws-s3.service.js';
import { CryptoService } from './services/crypto.service.js';
import { GeneratorService } from './services/generator.service.js';
import { ImageProcessingService } from './services/image-processing.service.js';
import { TranslationService } from './services/translation.service.js';
import { ValidatorService } from './services/validator.service.js';

const providers: Provider[] = [
  ApiConfigService,
  ValidatorService,
  AwsS3Service,
  CryptoService,
  GeneratorService,
  ImageProcessingService,
  TranslationService,
];

@Global()
@Module({
  providers,
  exports: [...providers],
})
export class SharedModule {}
