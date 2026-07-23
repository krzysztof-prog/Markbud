#!/usr/bin/env node

/**
 * Scaffold generator for new API endpoints
 *
 * Usage: node scripts/new-endpoint.js <name>
 * Example: node scripts/new-endpoint.js invoices
 *
 * Generates:
 *   apps/api/src/routes/{name}.ts
 *   apps/api/src/handlers/{name}Handler.ts
 *   apps/api/src/services/{name}Service.ts
 *   apps/api/src/repositories/{Name}Repository.ts
 *   apps/api/src/validators/{name}.ts
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert kebab-case or plain name to camelCase
 * e.g. "glass-orders" -> "glassOrders"
 */
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert kebab-case or plain name to PascalCase
 * e.g. "glass-orders" -> "GlassOrders"
 */
function toPascalCase(str) {
  return capitalize(toCamelCase(str));
}

/**
 * Singularize a simple English plural (basic heuristic).
 * "invoices" -> "invoice", "orders" -> "order", "deliveries" -> "delivery"
 */
function singularize(str) {
  if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
  if (str.endsWith('ses') || str.endsWith('xes') || str.endsWith('zes')) return str.slice(0, -2);
  if (str.endsWith('s') && !str.endsWith('ss')) return str.slice(0, -1);
  return str;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const rawName = process.argv[2];

if (!rawName) {
  console.error('Usage: node scripts/new-endpoint.js <name>');
  console.error('Example: node scripts/new-endpoint.js invoices');
  process.exit(1);
}

// Normalize: lowercase, allow kebab-case
const name = rawName.toLowerCase();
const camel = toCamelCase(name);                    // e.g. "glassOrders"
const Pascal = toPascalCase(name);                  // e.g. "GlassOrders"
const singular = singularize(camel);                // e.g. "glassOrder"
const Singular = capitalize(singular);              // e.g. "GlassOrder"

const ROOT = path.resolve(__dirname, '..');
const API_SRC = path.join(ROOT, 'apps', 'api', 'src');

const files = {
  route:      path.join(API_SRC, 'routes', `${name}.ts`),
  handler:    path.join(API_SRC, 'handlers', `${camel}Handler.ts`),
  service:    path.join(API_SRC, 'services', `${camel}Service.ts`),
  repository: path.join(API_SRC, 'repositories', `${Pascal}Repository.ts`),
  validator:  path.join(API_SRC, 'validators', `${name}.ts`),
};

// Abort if any file already exists
const existing = Object.entries(files).filter(([, fp]) => fs.existsSync(fp));
if (existing.length > 0) {
  console.error('ABORT: The following files already exist:');
  existing.forEach(([label, fp]) => console.error(`  [${label}] ${fp}`));
  console.error('\nRemove them first or choose a different name.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Template: Route
// ---------------------------------------------------------------------------

function routeTemplate() {
  return `import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { ${Pascal}Repository } from '../repositories/${Pascal}Repository.js';
import { ${Singular}Service } from '../services/${camel}Service.js';
import { ${Singular}Handler } from '../handlers/${camel}Handler.js';
import { verifyAuth } from '../middleware/auth.js';


export const ${camel}Routes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new ${Pascal}Repository(prisma);
  const service = new ${Singular}Service(repository);
  const handler = new ${Singular}Handler(service);

  // Routes - only routing, delegate to handlers - all require authentication
  fastify.get<{ Querystring: { search?: string } }>('/', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.getAll(request, reply));

  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.getById(request, reply));

  fastify.post<{ Body: Record<string, unknown> }>('/', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.create(request, reply));

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.update(request, reply));

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.delete(request, reply));
};
`;
}

// ---------------------------------------------------------------------------
// Template: Handler
// ---------------------------------------------------------------------------

function handlerTemplate() {
  return `/**
 * ${Singular} Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ${Singular}Service } from '../services/${camel}Service.js';
import {
  create${Singular}Schema,
  update${Singular}Schema,
  ${singular}ParamsSchema,
  type Create${Singular}Input,
  type Update${Singular}Input,
} from '../validators/${name}.js';

export class ${Singular}Handler {
  constructor(private service: ${Singular}Service) {}

  async getAll(
    request: FastifyRequest<{ Querystring: { search?: string } }>,
    reply: FastifyReply
  ) {
    const items = await this.service.getAll();
    return reply.send(items);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = ${singular}ParamsSchema.parse(request.params);
    const item = await this.service.getById(parseInt(id));
    return reply.send(item);
  }

  async create(
    request: FastifyRequest<{ Body: Create${Singular}Input }>,
    reply: FastifyReply
  ) {
    const validated = create${Singular}Schema.parse(request.body);
    const item = await this.service.create(validated);
    return reply.status(201).send(item);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: Update${Singular}Input }>,
    reply: FastifyReply
  ) {
    const { id } = ${singular}ParamsSchema.parse(request.params);
    const validated = update${Singular}Schema.parse(request.body);
    const item = await this.service.update(parseInt(id), validated);
    return reply.send(item);
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = ${singular}ParamsSchema.parse(request.params);
    await this.service.delete(parseInt(id));
    return reply.status(204).send();
  }
}
`;
}

// ---------------------------------------------------------------------------
// Template: Service
// ---------------------------------------------------------------------------

function serviceTemplate() {
  return `/**
 * ${Singular} Service - Business logic layer
 */

import { ${Pascal}Repository } from '../repositories/${Pascal}Repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { Create${Singular}Input, Update${Singular}Input } from '../validators/${name}.js';

export class ${Singular}Service {
  constructor(private repository: ${Pascal}Repository) {}

  async getAll() {
    return this.repository.findAll();
  }

  async getById(id: number) {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new NotFoundError('${Singular}');
    }

    return item;
  }

  async create(data: Create${Singular}Input) {
    return this.repository.create(data);
  }

  async update(id: number, data: Update${Singular}Input) {
    // Verify item exists
    await this.getById(id);

    return this.repository.update(id, data);
  }

  async delete(id: number) {
    // Verify item exists
    await this.getById(id);

    await this.repository.softDelete(id);
  }
}
`;
}

// ---------------------------------------------------------------------------
// Template: Repository
// ---------------------------------------------------------------------------

function repositoryTemplate() {
  return `/**
 * ${Singular} Repository - Database access layer
 */

import { PrismaClient } from '@prisma/client';

export class ${Pascal}Repository {
  constructor(private prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.${singular}.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.${singular}.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: Record<string, unknown>) {
    return this.prisma.${singular}.create({
      data: data as any,
    });
  }

  async update(id: number, data: Record<string, unknown>) {
    return this.prisma.${singular}.update({
      where: { id },
      data: data as any,
    });
  }

  /**
   * Soft delete - sets deletedAt timestamp instead of removing the row
   */
  async softDelete(id: number) {
    await this.prisma.${singular}.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
`;
}

// ---------------------------------------------------------------------------
// Template: Validator
// ---------------------------------------------------------------------------

function validatorTemplate() {
  return `/**
 * ${Singular} validation schemas
 */

import { z } from 'zod';
import { idParamsSchema } from './common.js';

export const create${Singular}Schema = z.object({
  name: z.string().min(1).max(255),
  // TODO: Add fields matching your Prisma model
});

export const update${Singular}Schema = z.object({
  name: z.string().min(1).max(255).optional(),
  // TODO: Add fields matching your Prisma model
});

export const ${singular}ParamsSchema = idParamsSchema('${singular}');

export type Create${Singular}Input = z.infer<typeof create${Singular}Schema>;
export type Update${Singular}Input = z.infer<typeof update${Singular}Schema>;
export type ${Singular}Params = z.infer<typeof ${singular}ParamsSchema>;
`;
}

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------

const templates = {
  route:      routeTemplate,
  handler:    handlerTemplate,
  service:    serviceTemplate,
  repository: repositoryTemplate,
  validator:  validatorTemplate,
};

Object.entries(templates).forEach(([key, fn]) => {
  const fp = files[key];
  fs.writeFileSync(fp, fn(), 'utf-8');
  console.log(`  Created: ${path.relative(ROOT, fp)}`);
});

// ---------------------------------------------------------------------------
// Post-generation instructions
// ---------------------------------------------------------------------------

const routePrefix = name.replace(/([A-Z])/g, '-$1').toLowerCase(); // kebab-case for URL

console.log(`
===================================================
  Scaffold complete for "${name}"
===================================================

Manual steps remaining:

1. Register routes in apps/api/src/index.ts:

   // Import at top:
   import { ${camel}Routes } from './routes/${name}.js';

   // Register with other routes:
   await fastify.register(${camel}Routes, { prefix: '/api/${name}' });

2. Create Prisma model in prisma/schema.prisma:

   model ${Singular} {
     id        Int       @id @default(autoincrement())
     name      String
     deletedAt DateTime?
     createdAt DateTime  @default(now())
     updatedAt DateTime  @updatedAt
   }

3. Run Prisma migration:

   npx prisma migrate dev --name add-${name}

4. Update the generated validator schemas in:
   ${path.relative(ROOT, files.validator)}
   to match your Prisma model fields.

5. Update the repository select/include if you need relations.
===================================================
`);
