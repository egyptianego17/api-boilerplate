# End-to-End (E2E) Testing Guide

This document provides comprehensive guidance for writing, organizing, and maintaining E2E tests in this NestJS application.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Test Utilities](#test-utilities)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is E2E Testing?

End-to-end testing validates your application from the user's perspective by making real HTTP requests against a running server. Unlike unit tests, E2E tests:

- Test the full request/response cycle
- Include database interactions
- Validate authentication flows
- Test API contracts

### Technology Stack

| Tool           | Purpose                    |
| -------------- | -------------------------- |
| **Jest**       | Test runner and assertions |
| **Supertest**  | HTTP request library       |
| **TypeScript** | Type-safe test code        |

### Prerequisites

```bash
# Ensure the API server is running
npm run start:dev

# The API should be accessible at
http://localhost:3000
```

---

## Quick Start

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- --testPathPattern=auth

# Run with verbose output
npm run test:e2e -- --verbose

# Run in watch mode (development)
npm run test:e2e -- --watch
```

### Creating Your First Test

```typescript
import request from 'supertest';
import { API_URL, endpoints } from './utils/test-helpers.js';

describe('MyFeature (e2e)', () => {
  it('should do something', async () => {
    const response = await request(API_URL).get(endpoints.health.status).expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
  });
});
```

---

## Project Structure

```
test/
├── utils/
│   └── test-helpers.ts     # Shared utilities, factories, and helpers
├── auth.e2e-spec.ts        # Authentication tests
├── user.e2e-spec.ts        # User management tests
├── health.e2e-spec.ts      # Health check tests
└── jest-e2e.json           # Jest E2E configuration
```

### Naming Conventions

| Pattern                                  | Usage            |
| ---------------------------------------- | ---------------- |
| `*.e2e-spec.ts`                          | E2E test files   |
| `describe('FeatureName (e2e)', ...)`     | Test suite names |
| `it('should <action> when <condition>')` | Test case names  |

---

## Test Utilities

### Configuration

```typescript
import { API_URL, API_PREFIX, endpoints } from './utils/test-helpers.js';

// API_URL: Base URL (default: http://localhost:3000)
// API_PREFIX: Version prefix (/v1)
// endpoints: Typed endpoint paths
```

### Available Endpoints

```typescript
endpoints.auth.register; // POST /v1/auth/register
endpoints.auth.login; // POST /v1/auth/login
endpoints.auth.me; // GET /v1/auth/me

endpoints.users.list; // GET /v1/users
endpoints.users.byId(id); // GET /v1/users/:id

endpoints.health.status; // GET /v1/health
endpoints.health.i18nHello; // GET /v1/health/i18n-hello
```

### Test User Factory

```typescript
import { createTestUser, generateTestEmail, testUserRegistry } from './utils/test-helpers.js';

// Generate unique email for tests
const email = generateTestEmail('mytest');
// Result: mytest-1234567890-abc123@test.local

// Create a test user (registers via API)
const { user, password, token } = await createTestUser({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.local',
  password: 'SecurePassword123!',
});

// Cleanup all test users (in afterAll)
await testUserRegistry.cleanup();
```

### Authenticated Requests

```typescript
import { authenticatedRequest } from './utils/test-helpers.js';

// Make authenticated request
const response = await authenticatedRequest(token).get(endpoints.auth.me).expect(200);
```

---

## Writing Tests

### Test File Template

```typescript
import request from 'supertest';
import { API_URL, endpoints, createTestUser, generateTestEmail, testUserRegistry, authenticatedRequest } from './utils/test-helpers.js';

describe('FeatureName (e2e)', () => {
  // Test-scoped variables
  let testUser: { user: any; password: string; token: string };

  // Setup: runs once before all tests in this file
  beforeAll(async () => {
    // Create test data
    testUser = await createTestUser({
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail('feature'),
      password: 'TestPassword123!',
    });
  });

  // Teardown: runs once after all tests in this file
  afterAll(async () => {
    // Clean up ALL test users created in this file
    await testUserRegistry.cleanup();
  });

  // Group related tests
  describe('POST /v1/feature/action', () => {
    it('should succeed with valid input', async () => {
      const response = await authenticatedRequest(testUser.token).post(endpoints.feature.action).send({ data: 'valid' }).expect(201);

      expect(response.body).toMatchObject({
        success: true,
      });
    });

    it('should fail with invalid input', async () => {
      const response = await authenticatedRequest(testUser.token).post(endpoints.feature.action).send({ data: '' }).expect(422); // Validation error

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /v1/feature/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(API_URL).get(endpoints.feature.byId('123')).expect(401);
    });
  });
});
```

### Status Code Reference

| Code  | Meaning              | When Used                                |
| ----- | -------------------- | ---------------------------------------- |
| `200` | OK                   | Successful GET, PUT, PATCH               |
| `201` | Created              | Successful POST (resource created)       |
| `204` | No Content           | Successful DELETE                        |
| `400` | Bad Request          | Malformed request                        |
| `401` | Unauthorized         | Missing or invalid token                 |
| `403` | Forbidden            | Valid token but insufficient permissions |
| `404` | Not Found            | Resource doesn't exist                   |
| `422` | Unprocessable Entity | Validation errors                        |
| `500` | Server Error         | Unexpected server errors                 |

> ⚠️ **Important**: This API returns `422` for validation errors, not `400`.

---

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on other tests:

```typescript
// ✅ Good: Each test creates its own data
describe('User Creation', () => {
  it('should create user with valid data', async () => {
    const email = generateTestEmail('create');
    const response = await request(API_URL)
      .post(endpoints.auth.register)
      .send({
        firstName: 'Test',
        lastName: 'User',
        email,
        password: 'Password123!',
      })
      .expect(201);
  });
});

// ❌ Bad: Tests depend on each other
let userId: string;

it('should create user', async () => {
  const response = await createUser();
  userId = response.body.id; // Other tests depend on this
});

it('should get user', async () => {
  await getUser(userId); // Fails if previous test fails
});
```

### 2. Proper Cleanup

Always clean up test data to prevent test pollution:

```typescript
// ✅ Good: Use registry for automatic cleanup
beforeAll(async () => {
  testUser = await createTestUser({...});
});

afterAll(async () => {
  await testUserRegistry.cleanup();
});

// ❌ Bad: No cleanup
beforeAll(async () => {
  testUser = await createTestUser({...});
});
// Test users accumulate in database!
```

### 3. Descriptive Test Names

Test names should describe the behavior being tested:

```typescript
// ✅ Good: Clear and descriptive
it('should return 401 when no token is provided', async () => {});
it('should return user profile when valid token is provided', async () => {});
it('should return 422 when email format is invalid', async () => {});

// ❌ Bad: Vague names
it('test login', async () => {});
it('works', async () => {});
it('error case', async () => {});
```

### 4. Test One Thing Per Test

Each test should verify a single behavior:

```typescript
// ✅ Good: One assertion per concept
it('should return 200 status', async () => {
  const response = await request(API_URL).get(endpoint);
  expect(response.status).toBe(200);
});

it('should return user data with correct structure', async () => {
  const response = await request(API_URL).get(endpoint);
  expect(response.body).toHaveProperty('id');
  expect(response.body).toHaveProperty('email');
});

// ❌ Bad: Testing multiple unrelated things
it('should work', async () => {
  const response = await request(API_URL).get(endpoint);
  expect(response.status).toBe(200);
  expect(response.body.id).toBeDefined();
  // Also test error case here...
  const errorResponse = await request(API_URL).get('/invalid');
  expect(errorResponse.status).toBe(404);
});
```

### 5. Use Meaningful Assertions

```typescript
// ✅ Good: Specific assertions
expect(response.body).toMatchObject({
  firstName: 'John',
  lastName: 'Doe',
});
expect(response.body.email).toMatch(/@test\.local$/);
expect(response.body.createdAt).toBeDefined();

// ❌ Bad: Weak assertions
expect(response.body).toBeTruthy();
expect(response.body.firstName).toBeDefined();
```

### 6. Group Related Tests

Use `describe` blocks to organize tests logically:

```typescript
describe('Auth (e2e)', () => {
  describe('POST /v1/auth/register', () => {
    describe('validation', () => {
      it('should reject empty firstName', async () => {});
      it('should reject invalid email format', async () => {});
      it('should reject weak password', async () => {});
    });

    describe('success cases', () => {
      it('should create user with valid data', async () => {});
      it('should return JWT token', async () => {});
    });
  });

  describe('POST /v1/auth/login', () => {
    // Login tests...
  });
});
```

---

## Common Patterns

### Pattern: Testing Validation Errors

```typescript
describe('validation', () => {
  const invalidCases = [
    {
      name: 'empty firstName',
      payload: { firstName: '', lastName: 'Doe', email: 'test@test.com', password: 'Password123!' },
      expectedField: 'firstName',
    },
    {
      name: 'invalid email',
      payload: { firstName: 'John', lastName: 'Doe', email: 'invalid', password: 'Password123!' },
      expectedField: 'email',
    },
  ];

  it.each(invalidCases)('should reject $name', async ({ payload }) => {
    const response = await request(API_URL).post(endpoints.auth.register).send(payload).expect(422);

    expect(response.body).toHaveProperty('message');
  });
});
```

### Pattern: Testing Authentication

```typescript
describe('protected endpoints', () => {
  it('should return 401 without token', async () => {
    await request(API_URL).get(endpoints.auth.me).expect(401);
  });

  it('should return 401 with invalid token', async () => {
    await request(API_URL).get(endpoints.auth.me).set('Authorization', 'Bearer invalid-token').expect(401);
  });

  it('should return 200 with valid token', async () => {
    const response = await authenticatedRequest(testUser.token).get(endpoints.auth.me).expect(200);

    expect(response.body).toHaveProperty('id');
  });
});
```

### Pattern: Testing CRUD Operations

```typescript
describe('Resource CRUD (e2e)', () => {
  let resourceId: string;

  describe('CREATE', () => {
    it('should create resource', async () => {
      const response = await authenticatedRequest(token).post(endpoints.resources.list).send({ name: 'Test Resource' }).expect(201);

      resourceId = response.body.id;
      expect(response.body.name).toBe('Test Resource');
    });
  });

  describe('READ', () => {
    it('should get resource by id', async () => {
      const response = await authenticatedRequest(token).get(endpoints.resources.byId(resourceId)).expect(200);

      expect(response.body.id).toBe(resourceId);
    });

    it('should list all resources', async () => {
      const response = await authenticatedRequest(token).get(endpoints.resources.list).expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('UPDATE', () => {
    it('should update resource', async () => {
      const response = await authenticatedRequest(token).patch(endpoints.resources.byId(resourceId)).send({ name: 'Updated Name' }).expect(200);

      expect(response.body.name).toBe('Updated Name');
    });
  });

  describe('DELETE', () => {
    it('should delete resource', async () => {
      await authenticatedRequest(token).delete(endpoints.resources.byId(resourceId)).expect(204);
    });

    it('should return 404 for deleted resource', async () => {
      await authenticatedRequest(token).get(endpoints.resources.byId(resourceId)).expect(404);
    });
  });
});
```

### Pattern: Testing Pagination

```typescript
describe('pagination', () => {
  it('should return paginated results', async () => {
    const response = await authenticatedRequest(token).get(endpoints.resources.list).query({ page: 1, limit: 10 }).expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      meta: {
        page: 1,
        take: 10,
        itemCount: expect.any(Number),
        pageCount: expect.any(Number),
      },
    });
  });
});
```

---

## Troubleshooting

### Common Issues

#### 404 Not Found on All Endpoints

**Problem**: All API requests return 404.

**Solution**: This API uses URI versioning. All endpoints must include the `/v1` prefix:

```typescript
// ❌ Wrong
request(API_URL).get('/auth/me');

// ✅ Correct
request(API_URL).get('/v1/auth/me');
// Or use endpoints helper
request(API_URL).get(endpoints.auth.me);
```

#### 422 Instead of 400 for Validation

**Problem**: Expected 400 but got 422.

**Solution**: This API returns 422 for validation errors:

```typescript
// ❌ Wrong
.expect(400)

// ✅ Correct
.expect(422)
```

#### Tests Failing Intermittently

**Problem**: Some tests pass sometimes but fail other times.

**Possible Causes**:

1. Tests are not isolated (shared state)
2. Test data not cleaned up properly
3. Race conditions

**Solutions**:

```typescript
// Use unique emails for each test
const email = generateTestEmail('unique-prefix');

// Always clean up in afterAll
afterAll(async () => {
  await testUserRegistry.cleanup();
});

// Add delays for time-sensitive operations
await wait(100); // From test-helpers.ts
```

#### Import Errors with .js Extensions

**Problem**: Jest can't resolve `.js` imports.

**Solution**: Ensure `jest-e2e.json` has the moduleNameMapper:

```json
{
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
}
```

#### Connection Refused

**Problem**: `ECONNREFUSED` error.

**Solution**: Ensure the API server is running:

```bash
npm run start:dev
```

Or set the correct API URL:

```bash
API_URL=http://localhost:3001 npm run test:e2e
```

---

## Checklist for New Tests

Before submitting new tests, verify:

- [ ] Tests run independently (can run in isolation)
- [ ] Test data is created in `beforeAll`
- [ ] Test data is cleaned up in `afterAll`
- [ ] Unique emails are generated using `generateTestEmail()`
- [ ] Endpoints use the `endpoints` helper (not hardcoded strings)
- [ ] Status codes match API behavior (422 for validation)
- [ ] Test names are descriptive
- [ ] Related tests are grouped in `describe` blocks
- [ ] Authentication is handled using `authenticatedRequest()`

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

---

_Last updated: $(date +%Y-%m-%d)_
