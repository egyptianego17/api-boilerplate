export enum AuditEvent {
  AuthLoginSucceeded = 'auth.login_succeeded',
  AuthPasswordResetRequested = 'auth.password_reset_requested',
  AuthPasswordResetCompleted = 'auth.password_reset_completed',
  AuthEmailVerified = 'auth.email_verified',
  AuthTwoFactorEnabled = 'auth.two_factor_enabled',
  AuthTwoFactorDisabled = 'auth.two_factor_disabled',
  AuthRecoveryCodesRegenerated = 'auth.recovery_codes_regenerated',
}

export const AUDIT_EVENT_NAMESPACE: Record<AuditEvent, string> = {
  [AuditEvent.AuthLoginSucceeded]: 'auth',
  [AuditEvent.AuthPasswordResetRequested]: 'auth',
  [AuditEvent.AuthPasswordResetCompleted]: 'auth',
  [AuditEvent.AuthEmailVerified]: 'auth',
  [AuditEvent.AuthTwoFactorEnabled]: 'auth',
  [AuditEvent.AuthTwoFactorDisabled]: 'auth',
  [AuditEvent.AuthRecoveryCodesRegenerated]: 'auth',
};
