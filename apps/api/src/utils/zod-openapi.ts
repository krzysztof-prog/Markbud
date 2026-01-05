/**
 * Zod to OpenAPI Schema Converter
 *
 * Converts Zod schemas to OpenAPI 3.0 JSON Schema format
 * for use in Fastify Swagger documentation
 */

import type { ZodTypeAny } from 'zod';

/**
 * Convert a Zod schema to OpenAPI JSON Schema
 * This is a simplified converter that handles common Zod types
 */
export function zodToJsonSchema(schema: ZodTypeAny): any {
  const def = (schema as any)._def;
  const typeName = def.typeName;

  switch (typeName) {
    case 'ZodString':
      return { type: 'string' };

    case 'ZodNumber':
      return { type: 'number' };

    case 'ZodBoolean':
      return { type: 'boolean' };

    case 'ZodDate':
      return { type: 'string', format: 'date-time' };

    case 'ZodEnum':
      return { type: 'string', enum: def.values };

    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema(def.type),
      };

    case 'ZodObject': {
      const shape = def.shape();
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as ZodTypeAny);

        // Check if field is required (not optional)
        const fieldDef = (value as any)._def;
        if (fieldDef.typeName !== 'ZodOptional' && fieldDef.typeName !== 'ZodNullable') {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
      };
    }

    case 'ZodOptional':
      return zodToJsonSchema(def.innerType);

    case 'ZodNullable': {
      const innerSchema = zodToJsonSchema(def.innerType);
      return {
        ...innerSchema,
        nullable: true,
      };
    }

    case 'ZodUnion':
      return {
        oneOf: def.options.map((option: ZodTypeAny) => zodToJsonSchema(option)),
      };

    case 'ZodEffects':
      // For transforms, just return the input type
      return zodToJsonSchema(def.schema);

    default:
      // Fallback for unknown types
      return { type: 'object' };
  }
}

/**
 * Create a standard error response schema
 */
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
  },
  required: ['error'],
};

/**
 * Create a standard success response schema
 */
export const successResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

/**
 * Create a paginated response schema
 */
export function paginatedResponseSchema(itemSchema: any) {
  return {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: itemSchema,
      },
      total: { type: 'number' },
      skip: { type: 'number' },
      take: { type: 'number' },
    },
    required: ['data', 'total', 'skip', 'take'],
  };
}
