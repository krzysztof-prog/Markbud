---
name: backend-dev-guidelines
description: Comprehensive backend development guide for Node.js/Fastify/TypeScript with Prisma, Zod validation, error tracking, and async patterns. Use when creating routes, handlers, services, repositories, middleware, or working with Fastify APIs, Prisma database access, error handling, and configuration management. Covers layered architecture (routes → handlers → services → repositories), error handling, performance monitoring, testing strategies.
---

# Backend Development Guidelines

## Purpose

Establish consistency and best practices across AKROBUD backend services using modern Node.js/Fastify/TypeScript patterns.

## When to Use This Skill

Automatically activates when working on:
- Creating or modifying routes, endpoints, APIs
- Building handlers, services, repositories
- Implementing middleware (auth, validation, error handling)
- Database operations with Prisma
- Input validation with Zod
- Configuration management
- Backend testing and refactoring
- WebSocket operations

---

## Quick Start

### New Backend Feature Checklist

- [ ] **Route**: Clean definition, delegate to handler
- [ ] **Handler**: Business logic extraction
- [ ] **Service**: Encapsulated business logic
- [ ] **Repository**: Database access (if complex)
- [ ] **Validation**: Zod schema
- [ ] **Error Handling**: Try-catch with proper error types
- [ ] **Tests**: Unit + integration tests
- [ ] **Config**: Use environment-based config

### New Service Checklist

- [ ] Directory structure (see [architecture-overview.md](resources/architecture-overview.md))
- [ ] Main entry point (src/index.ts)
- [ ] Error handling middleware
- [ ] Fastify plugins setup
- [ ] Database connection (Prisma)
- [ ] WebSocket support (if needed)
- [ ] Testing framework

---

## Architecture Overview

### Layered Architecture

```
HTTP Request / WebSocket
    ↓
Routes (routing only)
    ↓
Handlers (request handling)
    ↓
Services (business logic)
    ↓
Repositories (data access)
    ↓
Database (Prisma)
```

**Key Principle:** Each layer has ONE responsibility.

See [architecture-overview.md](resources/architecture-overview.md) for complete details.

---

## Directory Structure

```
apps/api/src/
├── config/              # Configuration
├── handlers/            # Route handlers
├── services/            # Business logic
├── repositories/        # Data access
├── routes/              # Route definitions
├── middleware/          # Fastify middleware
├── types/               # TypeScript types
├── validators/          # Zod schemas
├── plugins/             # Fastify plugins
├── utils/               # Utilities
├── tests/               # Tests
├── index.ts             # Entry point
└── app.ts               # Fastify setup
```

**Naming Conventions:**
- Handlers: `camelCase + Handler` - `deliveryHandler.ts`
- Services: `camelCase + Service` - `deliveryService.ts`
- Routes: `camelCase + Routes` - `deliveryRoutes.ts`
- Repositories: `PascalCase + Repository` - `DeliveryRepository.ts`

---

## Core Principles (7 Key Rules)

### 1. Routes Only Route, Handlers Control

```typescript
// ❌ NEVER: Business logic in routes
fastify.post('/submit', async (request, reply) => {
    // 200 lines of logic
});

// ✅ ALWAYS: Delegate to handler
fastify.post('/submit', handler.submit);
```

### 2. Handlers Extract Business Logic

```typescript
export const deliveryHandler = {
    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const validated = deliverySchema.parse(request.body);
            const delivery = await deliveryService.create(validated);
            return reply.status(201).send(delivery);
        } catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    }
};
```

### 3. All Errors with Proper Handling

```typescript
try {
    await operation();
} catch (error) {
    logger.error('Operation failed', error);
    throw new AppError('Operation failed', 500);
}
```

### 4. Use Zod for All Validation

```typescript
const deliverySchema = z.object({
    locationId: z.string(),
    itemCount: z.number().positive()
});
const validated = deliverySchema.parse(req.body);
```

### 5. Repository Pattern for Data Access

```typescript
// Handler → Service → Repository → Database
const deliveries = await deliveryRepository.findActive();
```

### 6. Centralized Error Handling

```typescript
fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError) {
        return reply.status(400).send(error);
    }
    logger.error('Unhandled error', error);
    return reply.status(500).send({ error: 'Internal server error' });
});
```

### 7. Comprehensive Testing Required

```typescript
describe('DeliveryService', () => {
    it('should create delivery', async () => {
        expect(delivery).toBeDefined();
    });
});
```

---

## Common Imports

```typescript
// Fastify
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';

// Validation
import { z } from 'zod';

// Database
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Utilities
import { logger } from './utils/logger';
import { AppError } from './utils/errors';
```

---

## Quick Reference

### HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

### Fastify Key Points

- Hooks: onRequest, onRoute, preHandler, preValidation
- Decorators: fastify.decorate() for shared utilities
- Plugins: Encapsulate features with plugins
- WebSockets: Use @fastify/websocket for real-time

---

## Anti-Patterns to Avoid

❌ Business logic in routes/handlers
❌ No input validation
❌ Missing error handling
❌ Direct Prisma everywhere
❌ console.log instead of structured logging
❌ No TypeScript types
❌ Blocking operations

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Understand architecture | [architecture-overview.md](resources/architecture-overview.md) |
| Create routes/handlers | [routing-and-controllers.md](resources/routing-and-controllers.md) |
| Organize business logic | [services-and-repositories.md](resources/services-and-repositories.md) |
| Validate input | [validation-patterns.md](resources/validation-patterns.md) |
| Handle errors | [async-and-errors.md](resources/async-and-errors.md) |
| Create middleware | [middleware-guide.md](resources/middleware-guide.md) |
| Database access | [database-patterns.md](resources/database-patterns.md) |
| Manage config | [configuration.md](resources/configuration.md) |
| Write tests | [testing-guide.md](resources/testing-guide.md) |
| See examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [architecture-overview.md](resources/architecture-overview.md)
Layered architecture, request lifecycle, separation of concerns

### [routing-and-controllers.md](resources/routing-and-controllers.md)
Route definitions, handlers, error handling, examples

### [services-and-repositories.md](resources/services-and-repositories.md)
Service patterns, DI, repository pattern, caching

### [validation-patterns.md](resources/validation-patterns.md)
Zod schemas, validation, DTO pattern

### [middleware-guide.md](resources/middleware-guide.md)
Auth, audit, error boundaries, AsyncLocalStorage

### [database-patterns.md](resources/database-patterns.md)
PrismaService, repositories, transactions, optimization

### [configuration.md](resources/configuration.md)
Environment configs, secrets, app settings

### [async-and-errors.md](resources/async-and-errors.md)
Async patterns, custom errors, error handling

### [testing-guide.md](resources/testing-guide.md)
Unit/integration tests, mocking, coverage

### [complete-examples.md](resources/complete-examples.md)
Full examples, refactoring guide

---

## Related Skills

- **error-tracking** - Error monitoring and logging patterns
- **skill-developer** - Meta-skill for creating and managing skills

---

**Skill Status**: COMPLETE ✅
**Stack**: Node.js/Fastify/TypeScript/Prisma ✅
**Progressive Disclosure**: 10 resource files ✅
