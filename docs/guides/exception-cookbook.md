# Exception Cookbook

Which exception to throw when, with the i18n key map. Source of truth: every file under [`src/exceptions/`](../../src/exceptions/).

---

## Pattern recap

Every throw must extend [`BaseI18nException`](../../src/exceptions/base-i18n.exception.ts). The base class:

```typescript
export abstract class BaseI18nException extends HttpException {
  readonly errorCode: string;
  readonly i18nArgs?: Record<string, string | number>;

  constructor(
    errorCode: string,
    statusCode: HttpStatus,
    i18nArgs?: Record<string, string | number>,
  ) {
    super(errorCode, statusCode);
    this.errorCode = errorCode;
    this.i18nArgs = i18nArgs;
  }
}
```

The global [`HttpExceptionFilter`](../../src/filters/http-exception.filter.ts) catches these, looks up the `errorCode` (e.g., `error.userNotFound`) in the active locale's i18n bundle, and emits the standard `ErrorResponseDto` envelope ([see `api-responses.md`](../conventions/api-responses.md)).

**Never** throw raw `HttpException`, raw `BadRequestException`, etc. — those bypass i18n.

---

## HTTP status → exception mapping

Every existing exception, grouped by status. Pick from this list before adding a new class.

### 400 Bad Request

| Class | i18n key | When to throw |
|---|---|---|
| `EmailAlreadyVerifiedException` | `error.emailAlreadyVerified` | User clicks the resend-verification link but their email is already verified |
| `FileInvalidTypeException` | `error.fileInvalidType` | Upload's MIME type isn't on the allow list |
| `FileNotImageException` | `error.fileNotImage` | Endpoint expects an image and got something else |
| `FileRequiredException` | `error.fileRequired` | Multipart form is missing the expected file part |
| `FileTooLargeException` | `error.fileTooLarge` | Upload exceeds the configured size cap |
| `IncorrectPasswordException` | `error.incorrectPassword` | `change-password` flow: current password didn't match |
| `InvalidResetTokenException` | `error.invalidResetToken` | Reset-password token is missing, malformed, or expired |
| `InvalidTurnstileException` | `error.invalidTurnstile` | Cloudflare Turnstile token verification failed |
| `InvalidVerificationTokenException` | `error.invalidVerificationToken` | Email-verification or email-change token is missing, malformed, or expired |
| `PendingEmailChangeNotFoundException` | `error.noPendingEmailChange` | User confirms email change but no pending change exists |
| `TwoFactorNotEnabledException` | `error.twoFactorNotEnabled` | User tries to use a 2FA-only flow without 2FA enabled |

### 401 Unauthorized

| Class | i18n key | When to throw |
|---|---|---|
| `ExpiredRefreshTokenException` | `error.expiredRefreshToken` | Refresh token's TTL has passed |
| `InvalidCredentialsException` | `error.invalidCredentials` | Login: email/password mismatch |
| `InvalidGoogleTokenException` | `error.invalidGoogleToken` | Google OAuth ID token verification failed |
| `InvalidRefreshTokenException` | `error.invalidRefreshToken` | Refresh token doesn't match what's stored |
| `InvalidTokenException` | `error.invalidToken` | Generic catch-all for malformed JWTs / temp tokens |
| `InvalidTwoFactorCodeException` | `error.invalidTwoFactorCode` | TOTP / recovery code didn't match |

### 403 Forbidden

| Class | i18n key | When to throw |
|---|---|---|
| `EmailNotVerifiedException` | `error.emailNotVerified` | User tries to access something gated behind a verified email |
| `RegistrationClosedException` | `error.registrationClosed` | Registration endpoint is disabled |
| `InsufficientPermissionsException` | *(non-i18n; see note)* | User authenticated but lacks permission for this action |

> **Note on `InsufficientPermissionsException`:** this class extends NestJS's `ForbiddenException` directly with a hard-coded English message (constructor: `(resource, action, details?)`). It does *not* yet extend `BaseI18nException`, so its message bypasses i18n. If you need locale-aware permission errors, refactor it before relying on the message.

### 404 Not Found

| Class | i18n key | When to throw |
|---|---|---|
| `UserNotFoundException` | `error.userNotFound` | Lookup by id / email returned `null` and the caller expects an existing user |

### 409 Conflict

| Class | i18n key | When to throw |
|---|---|---|
| `EmailAlreadyRegisteredException` | `error.emailAlreadyRegistered` | Registration: email already in use |

> Other conflict-style keys (`error.emailAlreadyExists`, `error.userAlreadyExists`) are present in `error.json` but currently have no exception class. If you need them, create the exception following the recipe below.

---

## i18n key map (full)

Every key referenced by a current exception class. Located in [`src/i18n/{en,ar,fr}/error.json`](../../src/i18n/en/error.json).

| Key | Exception | Status |
|---|---|---|
| `error.emailAlreadyRegistered` | `EmailAlreadyRegisteredException` | 409 |
| `error.emailAlreadyVerified` | `EmailAlreadyVerifiedException` | 400 |
| `error.emailNotVerified` | `EmailNotVerifiedException` | 403 |
| `error.expiredRefreshToken` | `ExpiredRefreshTokenException` | 401 |
| `error.fileInvalidType` | `FileInvalidTypeException` | 400 |
| `error.fileNotImage` | `FileNotImageException` | 400 |
| `error.fileRequired` | `FileRequiredException` | 400 |
| `error.fileTooLarge` | `FileTooLargeException` | 400 |
| `error.incorrectPassword` | `IncorrectPasswordException` | 400 |
| `error.invalidCredentials` | `InvalidCredentialsException` | 401 |
| `error.invalidGoogleToken` | `InvalidGoogleTokenException` | 401 |
| `error.invalidRefreshToken` | `InvalidRefreshTokenException` | 401 |
| `error.invalidResetToken` | `InvalidResetTokenException` | 400 |
| `error.invalidToken` | `InvalidTokenException` | 401 |
| `error.invalidTurnstile` | `InvalidTurnstileException` | 400 |
| `error.invalidTwoFactorCode` | `InvalidTwoFactorCodeException` | 401 |
| `error.invalidVerificationToken` | `InvalidVerificationTokenException` | 400 |
| `error.noPendingEmailChange` | `PendingEmailChangeNotFoundException` | 400 |
| `error.registrationClosed` | `RegistrationClosedException` | 403 |
| `error.twoFactorNotEnabled` | `TwoFactorNotEnabledException` | 400 |
| `error.userNotFound` | `UserNotFoundException` | 404 |

The remaining keys in `error.json` (`error.unauthorized`, `error.forbidden`, `error.notFound`, `error.conflict`, `error.badRequest`, `error.internalServerError`, `error.tooManyRequests`, `error.validationFailed`, `error.unknown`, `error.unique.email`, `error.userAlreadyExists`, `error.emailAlreadyExists`) are referenced by filters or available for new exception classes.

---

## Adding a new exception

Recipe — five steps from "I need to throw something specific" to a working PR.

### 1. Pick the HTTP status

Use `HttpStatus.*` from `@nestjs/common`. Don't invent a number. Common picks:

| Situation | Status |
|---|---|
| Resource not found | 404 |
| Caller authenticated but not authorized | 403 |
| Caller not authenticated / token problem | 401 |
| Bad request body / state | 400 |
| Resource already exists | 409 |
| Required precondition missing (e.g. 2FA gate) | 428 |

### 2. Choose an `error.*` key

- Look at the i18n key map above. Reuse an existing key if the new exception is just a typed wrapper for the same condition.
- Otherwise, pick a new key with the format `error.<camelCaseDescriptive>` — e.g., `error.postNotFound`, `error.commentLocked`.

### 3. Add the i18n string to all locales

Append to `src/i18n/en/error.json`:
```json
{
  "postNotFound": "Post not found"
}
```
Then add equivalents to `src/i18n/ar/error.json` and `src/i18n/fr/error.json`. (English is the fallback — if you only update `en`, requests in other locales fall back, which is acceptable for new keys.)

### 4. Create the exception class

For domain modules, create a folder under `src/exceptions/`:

```typescript
// src/exceptions/post/post-not-found.exception.ts
import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class PostNotFoundException extends BaseI18nException {
  constructor() {
    super('error.postNotFound', HttpStatus.NOT_FOUND);
  }
}
```

If the message needs interpolation, pass `i18nArgs`:

```typescript
// src/exceptions/post/post-comment-locked.exception.ts
export class PostCommentLockedException extends BaseI18nException {
  constructor(postId: Uuid) {
    super('error.postCommentLocked', HttpStatus.FORBIDDEN, { postId });
  }
}
```

The `i18nArgs` are forwarded to `i18n.t(...)` and substituted into placeholders like `{postId}` in the JSON value.

### 5. Throw from the service

```typescript
async findPost(id: Uuid): Promise<PostEntity> {
  const post = await this.postRepository.findById(id);
  if (!post) {
    throw new PostNotFoundException();
  }
  return post;
}
```

The global exception filter handles translation and envelope formatting. **Don't** wrap the throw in a try/catch.

---

## Where exceptions get translated

[`src/filters/http-exception.filter.ts`](../../src/filters/http-exception.filter.ts) catches every `HttpException`. For instances of `BaseI18nException`, it looks up `errorCode` via `nestjs-i18n` using the language resolved by the request context (`?lang=`, `x-lang` header, `Accept-Language`, falling back to `FALLBACK_LANGUAGE`). The translated message + structured `errorCode` go into the `ErrorResponseDto` envelope.

Validation errors (from `I18nValidationPipe`) are caught by [`src/filters/i18n-validation-exception.filter.ts`](../../src/filters/i18n-validation-exception.filter.ts) — the `validation.*` keys in `src/i18n/{locale}/validation.json` drive those.

DB constraint violations are caught by [`src/filters/query-failed.filter.ts`](../../src/filters/query-failed.filter.ts), which maps Postgres error codes to user-friendly messages via `src/filters/constraint-errors.ts`.

---

## See also

- [`../conventions/coding-standards.md`](../conventions/coding-standards.md) §9 — exception rules
- [`../conventions/api-responses.md`](../conventions/api-responses.md) — error envelope shape
- [`add-a-module.md`](./add-a-module.md) Step 6 — where exceptions fit in module creation
