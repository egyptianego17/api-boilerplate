import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';

import { SkipResponseWrapping } from '../../decorators/skip-response-wrapping.decorator.js';

@Controller({ version: VERSION_NEUTRAL })
@SkipThrottle()
export class MetricsController extends PrometheusController {
  @Get()
  @SkipResponseWrapping()
  override index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
