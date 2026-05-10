# API Response Standards

This document defines the standardized response formats for all API endpoints.

## Table of Contents

- [Success Responses](#success-responses)
- [Error Responses](#error-responses)
- [Internationalization (i18n)](#internationalization-i18n)
- [Exception Handling](#exception-handling)
- [Available Error Codes](#available-error-codes)

## Success Responses

### Message Response

Used for operations that don't return data, like password reset or 2FA operations.

```typescript
interface MessageResponseDto {
  success: true;
  message: string;
  timestamp: number;
}
```

**Example:**

```json
{
  "success": true,
  "message": "Password reset email sent successfully",
  "timestamp": 1702234567890
}
```

### Data Response

Used for operations that return data.

```typescript
interface SuccessResponseDto<T> {
  success: true;
  message: string;
  data?: T;
  timestamp: number;
}
```

**Example:**

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "timestamp": 1702234567890
}
```

### Entity DTOs

Used for operations that return a single entity (user, post, etc.).

**Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Paginated Response

Used for list endpoints with pagination.

```typescript
interface PageDto<T> {
  data: T[];
  meta: PageMetaDto;
}

interface PageMetaDto {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
```

**Example:**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  ],
  "meta": {
    "page": 1,
    "take": 10,
    "itemCount": 50,
    "pageCount": 5,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

### Custom Response DTOs

Some endpoints return custom structured data with proper DTOs:

#### Two-Factor Enabled Response

```typescript
interface TwoFactorEnabledResponseDto {
  message: string;
  recoveryCodes: string[];
}
```

**Example:**

```json
{
  "message": "Two-factor authentication enabled successfully",
  "recoveryCodes": ["1A2B-3C4D", "5E6F-7G8H", "9I0J-1K2L", "3M4N-5O6P", "7Q8R-9S0T"]
}
```

#### Recovery Codes Response

```typescript
interface RecoveryCodesResponseDto {
  recoveryCodes: string[];
}
```

**Example:**

```json
{
  "recoveryCodes": ["1A2B-3C4D", "5E6F-7G8H", "9I0J-1K2L"]
}
```

#### Login Payload Response

```typescript
interface LoginPayloadDto {
  user: UserDto;
  accessToken?: TokenPayloadDto;
  tempToken?: string;
  requiresTwoFactor?: boolean;
}
```

**Example (Normal Login):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Example (2FA Required):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresTwoFactor": true
}
```

## Error Responses

All errors follow a consistent format:

```typescript
interface ErrorResponseDto {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: Record<string, string>[];
  timestamp: number;
  path?: string;
}
```

**Example:**

```json
{
  "success": false,
  "statusCode": 401,
  "errorCode": "error.invalidCredentials",
  "message": "Invalid email or password",
  "timestamp": 1702234567890,
  "path": "/v1/auth/login"
}
```

### Validation Errors (422)

```json
{
  "success": false,
  "statusCode": 422,
  "errorCode": "Unprocessable Entity",
  "message": "Validation failed",
  "errors": [
    {
      "property": "email",
      "constraints": {
        "isEmail": "email must be a valid email address"
      }
    }
  ],
  "timestamp": 1702234567890,
  "path": "/v1/auth/register"
}
```

## Internationalization (i18n)

All messages support internationalization. The language is determined by:

1. `lang` query parameter: `?lang=ar`
2. `Accept-Language` header: `Accept-Language: ar`
3. `x-lang` header: `x-lang: ar`
4. Fallback to default language (English)

### Supported Languages

- `en` - English (default)
- `ar` - Arabic
- `fr` - French

### Translation Files Structure

```
src/i18n/
├── en/
│   ├── auth.json       # Authentication messages
│   ├── error.json      # Error messages
│   ├── validation.json # Validation messages
│   └── common.json     # Common messages
├── ar/
│   └── ...
└── fr/
    └── ...
```

## Exception Handling

### Creating Custom Exceptions

All custom exceptions should extend `BaseI18nException`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { BaseI18nException } from './base-i18n.exception.js';

export class CustomException extends BaseI18nException {
  constructor() {
    super('error.customError', HttpStatus.BAD_REQUEST);
  }
}
```

### Available Base Exceptions

| Exception Class                 | HTTP Status | Error Code                   |
| ------------------------------- | ----------- | ---------------------------- |
| `InvalidCredentialsException`   | 401         | `error.invalidCredentials`   |
| `UserNotFoundException`         | 404         | `error.userNotFound`         |
| `EmailAlreadyExistsException`   | 409         | `error.emailAlreadyExists`   |
| `UserAlreadyExistsException`    | 409         | `error.userAlreadyExists`    |
| `FileNotImageException`         | 400         | `error.fileNotImage`         |
| `InvalidResetTokenException`    | 400         | `error.invalidResetToken`    |
| `InvalidTokenException`         | 401         | `error.invalidToken`         |
| `InvalidTwoFactorCodeException` | 401         | `error.invalidTwoFactorCode` |
| `TwoFactorRequiredException`    | 428         | `error.twoFactorRequired`    |
| `TwoFactorNotEnabledException`  | 400         | `error.twoFactorNotEnabled`  |

## Available Error Codes

### Authentication Errors

| Error Code                   | English Message                          | HTTP Status |
| ---------------------------- | ---------------------------------------- | ----------- |
| `error.invalidCredentials`   | Invalid email or password                | 401         |
| `error.invalidToken`         | Invalid or expired token                 | 401         |
| `error.invalidTwoFactorCode` | Invalid two-factor authentication code   | 401         |
| `error.twoFactorRequired`    | Two-factor authentication is required    | 428         |
| `error.twoFactorNotEnabled`  | Two-factor authentication is not enabled | 400         |
| `error.invalidResetToken`    | Invalid or expired reset token           | 400         |

### User Errors

| Error Code                 | English Message                     | HTTP Status |
| -------------------------- | ----------------------------------- | ----------- |
| `error.userNotFound`       | User not found                      | 404         |
| `error.emailAlreadyExists` | Email address is already registered | 409         |
| `error.userAlreadyExists`  | User already exists                 | 409         |

### General Errors

| Error Code                  | English Message                               | HTTP Status |
| --------------------------- | --------------------------------------------- | ----------- |
| `error.unauthorized`        | You are not authorized to perform this action | 401         |
| `error.forbidden`           | Access forbidden                              | 403         |
| `error.notFound`            | Resource not found                            | 404         |
| `error.conflict`            | Resource already exists                       | 409         |
| `error.badRequest`          | Bad request                                   | 400         |
| `error.internalServerError` | An unexpected error occurred                  | 500         |

### Auth Success Messages

| Message Code                    | English Message                                 |
| ------------------------------- | ----------------------------------------------- |
| `auth.passwordResetEmailSent`   | Password reset email sent successfully          |
| `auth.passwordResetSuccess`     | Password reset successfully                     |
| `auth.twoFactorEnabled`         | Two-factor authentication enabled successfully  |
| `auth.twoFactorDisabled`        | Two-factor authentication disabled successfully |
| `auth.twoFactorVerified`        | Two-factor verification successful              |
| `auth.recoveryCodesRegenerated` | Recovery codes regenerated successfully         |
| `auth.loginSuccess`             | Login successful                                |
| `auth.registerSuccess`          | Registration successful                         |
| `auth.logoutSuccess`            | Logout successful                               |

## Response Standards Compliance

### CRITICAL RULES

1. **NEVER return raw objects from controllers** - Always use proper DTOs
2. **ALWAYS specify response type in @ApiOkResponse()** - Required for Swagger documentation
3. **Use consistent i18n pattern** - Check for null before calling `i18n.t()`
4. **Return DTOs from services** - Not raw objects or inline types

### Anti-Patterns (DO NOT USE)

```typescript
// ❌ WRONG: Raw object return type
async enableTwoFactor(): Promise<{ message: string; recoveryCodes: string[] }> {
  return { message: '...', recoveryCodes: [...] };
}

// ❌ WRONG: Incomplete Swagger docs
@ApiOkResponse({ description: '2FA enabled successfully' })  // Missing type!

// ❌ WRONG: Unsafe i18n access
return new MessageResponseDto(i18n?.t('key') || 'fallback');
```

### Correct Patterns (USE THESE)

```typescript
// ✅ CORRECT: Proper DTO return type
async enableTwoFactor(): Promise<TwoFactorEnabledResponseDto> {
  const i18n = I18nContext.current();
  const message = (i18n ? await i18n.t('auth.twoFactorEnabled') : null) || '2FA enabled successfully';
  return new TwoFactorEnabledResponseDto(message, recoveryCodes);
}

// ✅ CORRECT: Complete Swagger docs with type
@ApiOkResponse({
  type: TwoFactorEnabledResponseDto,
  description: '2FA enabled successfully',
})

// ✅ CORRECT: Safe i18n pattern
const i18n = I18nContext.current();
const message = (i18n ? await i18n.t('key') : null) || 'fallback';
```

## Usage Examples

### Service Layer - Message Response

```typescript
import { I18nContext } from 'nestjs-i18n';
import { MessageResponseDto } from '../../common/dto/success-response.dto.js';
import { InvalidCredentialsException } from '../../exceptions/invalid-credentials.exception.js';

async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
  // ... validation logic

  if (!isValid) {
    throw new InvalidCredentialsException();
  }

  // ... business logic

  const i18n = I18nContext.current();
  const message = (i18n ? await i18n.t('auth.passwordResetSuccess') : null) || 'Password reset successfully';

  return new MessageResponseDto(message);
}
```

### Service Layer - Custom Response DTO

```typescript
import { TwoFactorEnabledResponseDto } from './dto/two-factor-enabled-response.dto.js';

async enableTwoFactor(userId: Uuid, dto: EnableTwoFactorDto): Promise<TwoFactorEnabledResponseDto> {
  // ... validation and business logic

  const recoveryCodes = await this.twoFactorService.generateRecoveryCodes();

  const i18n = I18nContext.current();
  const message = (i18n ? await i18n.t('auth.twoFactorEnabled') : null) || '2FA enabled successfully';

  return new TwoFactorEnabledResponseDto(message, recoveryCodes);
}
```

### Controller Layer - Message Response

```typescript
@Post('reset-password')
@HttpCode(HttpStatus.OK)
@ApiOkResponse({
  type: MessageResponseDto,
  description: 'Password reset successfully',
})
async resetPassword(
  @Body() resetPasswordDto: ResetPasswordDto,
): Promise<MessageResponseDto> {
  return this.authService.resetPassword(resetPasswordDto);
}
```

### Controller Layer - Custom Response DTO

```typescript
@Post('2fa/enable')
@Auth([])
@HttpCode(HttpStatus.OK)
@ApiOkResponse({
  type: TwoFactorEnabledResponseDto,
  description: '2FA enabled successfully',
})
async enableTwoFactor(
  @AuthUser() user: UserEntity,
  @Body() dto: EnableTwoFactorDto,
): Promise<TwoFactorEnabledResponseDto> {
  return this.authService.enableTwoFactor(user.id, dto);
}
```

### Controller Layer - Entity DTO Response

```typescript
@Get('me')
@Auth([])
@HttpCode(HttpStatus.OK)
@ApiOkResponse({
  type: UserDto,
  description: 'Get current user info',
})
getCurrentUser(@AuthUser() user: UserEntity): UserDto {
  return user.toDto();
}
```

### Controller Layer - Paginated Response

```typescript
@Get()
@Auth([SystemRole.ADMIN])
@HttpCode(HttpStatus.OK)
@ApiPageResponse({
  description: 'Get users list',
  type: PageDto,
})
getUsers(
  @Query(new ValidationPipe({ transform: true }))
  pageOptionsDto: UsersPageOptionsDto,
): Promise<PageDto<UserDto>> {
  return this.userService.getUsers(pageOptionsDto);
}
```

### Controller Layer - No Content Response

```typescript
@Delete(':id')
@Auth([SystemRole.ADMIN])
@HttpCode(HttpStatus.NO_CONTENT)
@ApiResponse({
  status: HttpStatus.NO_CONTENT,
  description: 'User deleted successfully',
})
async deleteUser(@UUIDParam('id') userId: Uuid): Promise<void> {
  await this.userService.deleteUser(userId);
}
```
