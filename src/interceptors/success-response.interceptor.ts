import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SKIP_RESPONSE_WRAPPING } from '../decorators/skip-response-wrapping.decorator.js';

/**
 * Global interceptor that wraps all successful responses in a standardized format.
 *
 * Standard format:
 * {
 *   success: true,
 *   statusCode: 200,
 *   message?: "Optional message",
 *   data: {...},
 *   timestamp: 1702234567890,
 *   path: "/v1/auth/login"
 * }
 *
 * Edge cases handled:
 * - Already wrapped responses (avoids double-wrapping)
 * - Health check responses (preserves Terminus format)
 * - 204 No Content responses (no wrapping)
 * - Streaming responses (file downloads, no wrapping)
 * - PageDto responses (wrapped as-is)
 * - Custom skip decorator (@SkipResponseWrapping)
 */
@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const skipViaDecorator =
      this.reflector.get<boolean>(
        SKIP_RESPONSE_WRAPPING,
        context.getHandler(),
      ) ?? false;

    return next.handle().pipe(
      map((data) => {
        if (this.shouldSkipWrapping(data, response, skipViaDecorator)) {
          return data;
        }

        const statusCode = response.statusCode;

        if (statusCode === HttpStatus.NO_CONTENT) {
          return data;
        }

        const message = this.extractMessage(data);
        const unwrappedData = this.unwrapData(data);

        const standardResponse: Record<string, unknown> = {
          success: true,
          statusCode,
          data: unwrappedData,
          timestamp: Date.now(),
          path: request.url,
        };

        if (message) {
          standardResponse.message = message;
        }

        return standardResponse;
      }),
    );
  }

  private shouldSkipWrapping(
    data: unknown,
    response: Response,
    skipViaDecorator: boolean,
  ): boolean {
    if (skipViaDecorator) {
      return true;
    }

    if (!data || typeof data !== 'object') {
      return false;
    }

    if (
      'success' in data &&
      'statusCode' in data &&
      'timestamp' in data &&
      'path' in data
    ) {
      return true;
    }

    if (
      'status' in data &&
      'info' in data &&
      'error' in data &&
      'details' in data
    ) {
      return true;
    }

    const contentType = response.getHeader('content-type');

    if (contentType) {
      const type = String(contentType).toLowerCase();

      return (
        type.includes('application/octet-stream') ||
        type.includes('multipart/form-data') ||
        type.includes('text/event-stream') ||
        type.includes('application/pdf') ||
        type.includes('image/') ||
        type.includes('video/') ||
        type.includes('audio/')
      );
    }

    return false;
  }

  private extractMessage(data: unknown): string | undefined {
    if (
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as Record<string, unknown>).message === 'string'
    ) {
      return (data as Record<string, unknown>).message as string;
    }

    return undefined;
  }

  private unwrapData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return null;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (this.isPageDto(data)) {
      return data;
    }

    const dataObj = data as Record<string, unknown>;

    if (
      'message' in dataObj &&
      typeof dataObj.message === 'string' &&
      Object.keys(dataObj).length > 1
    ) {
      const { message: _message, ...rest } = dataObj;

      return Object.keys(rest).length > 0 ? rest : null;
    }

    if (
      'message' in dataObj &&
      typeof dataObj.message === 'string' &&
      Object.keys(dataObj).length === 1
    ) {
      return null;
    }

    return data;
  }

  private isPageDto(data: unknown): boolean {
    return (
      data !== null &&
      typeof data === 'object' &&
      'data' in data &&
      'meta' in data &&
      Array.isArray((data as Record<string, unknown>).data)
    );
  }
}
