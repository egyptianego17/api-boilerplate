/**
 * Single source of truth for auth token TTLs, byte lengths, and TOTP timing.
 * Tune here to change session lifetimes or token entropy across the auth flow.
 */

/* Temp token issued between password and 2FA verification */
export const TEMP_TOKEN_TTL = '5m';
export const TEMP_TOKEN_TTL_SECONDS = 300;

/* Email-delivered short-lived tokens (password reset, email verification) */
export const SHORT_LIVED_TOKEN_BYTES = 8;
export const PASSWORD_RESET_TTL_MS = 3_600_000;
export const EMAIL_VERIFICATION_TTL_MS = 24 * 3_600_000;

/* Refresh tokens */
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const REFRESH_TOKEN_SECRET_BYTES = 32;

/* OAuth fallback session id when the client doesn't supply one */
export const OAUTH_SESSION_ID_BYTES = 32;

/* TOTP step window (RFC 6238 default) */
export const TOTP_STEP_SECONDS = 30;
