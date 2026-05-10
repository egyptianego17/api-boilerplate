import { SetMetadata } from '@nestjs/common';

import type { SystemRole } from '../constants/system-role.js';

export const SYSTEM_ROLES_KEY = 'systemRoles';
export const SystemRoles = (...roles: SystemRole[]) =>
  SetMetadata(SYSTEM_ROLES_KEY, roles);
