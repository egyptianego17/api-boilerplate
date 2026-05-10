import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_WRAPPING = 'skipResponseWrapping';

/**
 * Decorator to skip automatic response wrapping for specific endpoints.
 * Use this for endpoints that need to return custom formats like:
 * - Health checks (Terminus format)
 * - File downloads
 * - Streaming responses
 *
 * @example
 * ```typescript
 * @Get('health')
 * @SkipResponseWrapping()
 * async healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipResponseWrapping = () =>
  SetMetadata(SKIP_RESPONSE_WRAPPING, true);
