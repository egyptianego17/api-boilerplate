import { applyDecorators, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { SystemRole } from '../constants/system-role.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { SystemRoleGuard } from '../guards/system-role.guard.js';
import { AuthUserInterceptor } from '../interceptors/auth-user-interceptor.service.js';
import { PublicRoute } from './public-route.decorator.js';
import { SystemRoles } from './system-roles.decorator.js';

export interface ProtectedOptions {
  systemRole?: SystemRole | SystemRole[];
}

export function Protected(options?: ProtectedOptions) {
  const decorators = [
    ApiBearerAuth(),
    UseInterceptors(AuthUserInterceptor),
    PublicRoute(false),
    ApiUnauthorizedResponse({ description: 'Not authenticated' }),
    UseGuards(AuthGuard()),
  ];

  if (options?.systemRole) {
    const roles = Array.isArray(options.systemRole)
      ? options.systemRole
      : [options.systemRole];

    decorators.push(
      SystemRoles(...roles),
      UseGuards(SystemRoleGuard),
      ApiForbiddenResponse({
        description: `Requires system role: ${roles.join(' or ')}`,
      }),
    );
  }

  return applyDecorators(...decorators);
}
