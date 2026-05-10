import { Module } from '@nestjs/common';

import { SharedModule } from '../../shared/shared.module.js';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [SharedModule],
  controllers: [UploadController],
})
export class UploadModule {}
