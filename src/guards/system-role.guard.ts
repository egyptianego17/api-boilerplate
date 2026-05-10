import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { SystemRole } from '../constants/system-role.js';
import type { UserEntity } from '../modules/user/entities/user.entity.js';

@Injectable()
export class SystemRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<SystemRole[]>(
      'systemRoles',
      context.getHandler(),
    );

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserEntity;

    return roles.includes(user.systemRole);
  }
}
