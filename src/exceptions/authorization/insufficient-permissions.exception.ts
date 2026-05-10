import { ForbiddenException } from '@nestjs/common';

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(resource: string, action: string, details?: string) {
    const message = details
      ? `Insufficient permissions to ${action} ${resource}: ${details}`
      : `Insufficient permissions to ${action} ${resource}`;
    super(message);
  }
}
