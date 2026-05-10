import type { SystemRole } from '../../../constants/system-role.js';
import type { TokenType } from '../../../constants/token-type.js';

export interface JwtPayload {
  userId: Uuid;
  email: string;
  systemRole: SystemRole;
  type: TokenType;
}
