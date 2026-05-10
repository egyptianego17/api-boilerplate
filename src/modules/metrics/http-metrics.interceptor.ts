import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Request, Response } from 'express';
import type { Counter, Histogram } from 'prom-client';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(request, response, startTime);
        },
        error: () => {
          this.recordMetrics(request, response, startTime);
        },
      }),
    );
  }

  private recordMetrics(
    request: Request,
    response: Response,
    startTime: bigint,
  ): void {
    const route = this.normalizeRoute(request);
    const method = request.method;
    const statusCode = String(response.statusCode);
    const durationInSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;

    const labels = { method, route, status_code: statusCode };

    this.requestCounter.inc(labels);
    this.requestDuration.observe(labels, durationInSeconds);
  }

  private normalizeRoute(request: Request): string {
    // Use the matched route pattern (e.g. /v1/users/:id) instead of the actual
    // URL to prevent high-cardinality labels from dynamic path params
    const routePath = (request as unknown as { route?: { path?: string } })
      .route?.path;

    if (routePath) {
      const baseUrl = request.baseUrl || '';

      return `${baseUrl}${routePath}`;
    }

    return request.path || request.url;
  }
}
