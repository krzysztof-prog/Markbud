# AKROBUD API Documentation

## Overview

The AKROBUD API is now fully documented using **Swagger/OpenAPI 3.0** specification. This provides interactive API documentation with request/response schemas, authentication requirements, and the ability to test endpoints directly from the browser.

## Accessing the Documentation

### Swagger UI (Interactive Documentation)
- **URL**: `http://localhost:3000/api/docs`
- **Features**:
  - Browse all API endpoints organized by tags
  - View request/response schemas
  - Test endpoints directly with "Try it out" functionality
  - JWT authentication support with bearer token
  - Filter endpoints by search
  - Persistent authorization across sessions

### OpenAPI JSON Specification
- **URL**: `http://localhost:3000/api/docs/json`
- **Format**: OpenAPI 3.0 JSON
- **Use Cases**:
  - Import into API clients (Postman, Insomnia)
  - Generate client SDKs
  - Automated testing tools

## API Endpoint Categories

### 1. Authentication (`/api/auth`)
- JWT-based authentication
- Token generation and validation
- Protected routes require `Authorization: Bearer <token>` header

### 2. Orders (`/api/orders`)
Production order management endpoints:
- `GET /api/orders` - List all orders with filtering
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/by-number/:orderNumber` - Get order by number
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `PATCH /api/orders/:id` - Partial update
- `DELETE /api/orders/:id` - Delete order
- `POST /api/orders/:id/archive` - Archive order
- `POST /api/orders/:id/unarchive` - Unarchive order
- `GET /api/orders/:id/has-pdf` - Check PDF availability
- `GET /api/orders/:id/pdf` - Download order PDF
- `GET /api/orders/table/:colorId` - Get orders table for color
- `GET /api/orders/requirements/totals` - Get requirement totals

### 3. Deliveries (`/api/deliveries`)
Delivery planning and pallet optimization:
- `GET /api/deliveries` - List deliveries with date filtering
- `GET /api/deliveries/:id` - Get delivery by ID
- `POST /api/deliveries` - Create new delivery
- `PUT /api/deliveries/:id` - Update delivery
- `DELETE /api/deliveries/:id` - Delete delivery
- `GET /api/deliveries/calendar` - Get calendar view
- `GET /api/deliveries/profile-requirements` - Profile requirements
- `GET /api/deliveries/stats/windows` - Monthly window statistics
- `GET /api/deliveries/stats/windows/by-weekday` - Weekday statistics
- `GET /api/deliveries/stats/profiles` - Monthly profile statistics
- `POST /api/deliveries/:id/orders` - Add order to delivery
- `DELETE /api/deliveries/:id/orders/:orderId` - Remove order
- `PUT /api/deliveries/:id/orders/reorder` - Reorder delivery orders
- `POST /api/deliveries/:id/move-order` - Move order between deliveries
- `POST /api/deliveries/:id/items` - Add item to delivery
- `DELETE /api/deliveries/:id/items/:itemId` - Remove item
- `POST /api/deliveries/:id/complete` - Mark delivery complete
- `GET /api/deliveries/:id/protocol` - Get delivery protocol
- `GET /api/deliveries/:id/protocol/pdf` - Download protocol PDF

### 4. Warehouse (`/api/warehouse`)
Warehouse stock management:
- `GET /api/warehouse/:colorId` - Get stock table for color
- `PUT /api/warehouse/:colorId/:profileId` - Update stock
- `POST /api/warehouse/monthly-update` - Monthly inventory update
- `GET /api/warehouse/history` - Stock history
- `GET /api/warehouse/history/:colorId` - Color-specific history
- `POST /api/warehouse/rollback-inventory` - Rollback last inventory
- `GET /api/warehouse/shortages` - Material shortages report
- `GET /api/warehouse/:colorId/average` - Monthly usage averages
- `POST /api/warehouse/finalize-month` - Finalize monthly remanent

### 5. Profiles (`/api/profiles`)
Aluminum profile management:
- `GET /api/profiles` - List all profiles
- `GET /api/profiles/:id` - Get profile by ID
- `POST /api/profiles` - Create new profile
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile
- `PATCH /api/profiles/update-orders` - Update display orders

### 6. Colors (`/api/colors`)
Color management:
- `GET /api/colors` - List all colors
- `GET /api/colors/:id` - Get color by ID
- `POST /api/colors` - Create new color
- `PUT /api/colors/:id` - Update color
- `DELETE /api/colors/:id` - Delete color
- `PUT /api/colors/:colorId/profiles/:profileId/visibility` - Update profile visibility

### 7. Other Endpoints
- **Warehouse Orders** (`/api/warehouse-orders`) - Warehouse order tracking
- **Pallets** (`/api/pallets`) - Pallet management
- **Imports** (`/api/imports`) - File import and processing
- **Settings** (`/api/settings`) - Application settings
- **Dashboard** (`/api/dashboard`) - Statistics and analytics
- **Working Days** (`/api/working-days`) - Calendar management
- **Schuco** (`/api/schuco`) - Schuco Connect integration
- **Currency Config** (`/api/currency-config`) - Exchange rates
- **Monthly Reports** (`/api/monthly-reports`) - Reporting
- **Profile Depths** (`/api/profile-depths`) - Profile depth management
- **Glass Orders** (`/api/glass-orders`) - Glass order tracking
- **Glass Deliveries** (`/api/glass-deliveries`) - Glass delivery management
- **Glass Validations** (`/api/glass-validations`) - Glass validation rules

### 8. Health Checks
- `GET /api/health` - Basic health check
- `GET /api/ready` - Readiness check with database connectivity

## Authentication

### Using JWT Authentication in Swagger UI

1. Navigate to `http://localhost:3000/api/docs`
2. Click the **"Authorize"** button (lock icon) at the top right
3. Enter your JWT token in the format: `Bearer <your-token>`
4. Click **"Authorize"** to apply
5. The token will persist across your session
6. All protected endpoints will now include the authentication header

### Getting a JWT Token

Use the authentication endpoint to obtain a token:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "your-username"
  }
}
```

## Common Schemas

### Order Schema
```typescript
{
  id: number;
  orderNumber: string;
  status: string;
  deliveryDate: string | null; // ISO 8601 datetime
  valuePln: number | null;
  valueEur: number | null;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}
```

### Delivery Schema
```typescript
{
  id: number;
  deliveryDate: string; // ISO 8601 datetime
  deliveryNumber: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}
```

### Profile Schema
```typescript
{
  id: number;
  number: string;
  name: string | null;
  articleNumber: string | null;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}
```

### Color Schema
```typescript
{
  id: number;
  code: string;
  name: string | null;
  hexColor: string | null;
  type: string | null;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}
```

### Error Response Schema
```typescript
{
  error: string;
  message?: string;
  statusCode?: number;
}
```

### Success Response Schema
```typescript
{
  success: boolean;
  message?: string;
}
```

## Testing Endpoints

### Using Swagger UI

1. Navigate to the endpoint you want to test
2. Click **"Try it out"** button
3. Fill in required parameters and request body
4. Click **"Execute"**
5. View the response, including:
   - Response code
   - Response body
   - Response headers
   - Request duration

### Using cURL

Example: Get all orders
```bash
curl -X GET "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Example: Create a new order
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "ORD-001",
    "deliveryDate": "2025-12-31T10:00:00Z",
    "valuePln": 15000,
    "valueEur": 3500
  }'
```

### Using Postman

1. Import OpenAPI spec from `http://localhost:3000/api/docs/json`
2. Postman will automatically create a collection with all endpoints
3. Configure authorization:
   - Type: Bearer Token
   - Token: Your JWT token
4. Execute requests

## Response Codes

### Success Codes
- `200 OK` - Successful GET, PUT, PATCH requests
- `201 Created` - Successful POST request creating a resource
- `204 No Content` - Successful DELETE request

### Client Error Codes
- `400 Bad Request` - Invalid request body or parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Authenticated but lacking permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error

### Server Error Codes
- `500 Internal Server Error` - Server-side error
- `503 Service Unavailable` - Service temporarily unavailable

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Limit**: 100 requests per 15-minute window
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets
- **Whitelist**: localhost (127.0.0.1) is whitelisted for development

## Development

### Adding New Endpoints to Swagger

When adding new routes, include the `schema` property in the route options:

```typescript
fastify.get('/api/example/:id', {
  preHandler: verifyAuth,
  schema: {
    description: 'Get example by ID',
    tags: ['example'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Example ID' },
      },
      required: ['id'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        },
      },
      404: { $ref: '#/components/schemas/Error' },
      401: { $ref: '#/components/schemas/Error' },
    },
  },
}, handler);
```

### Zod to OpenAPI Converter

A utility is available at `apps/api/src/utils/zod-openapi.ts` for converting Zod schemas to OpenAPI JSON schemas:

```typescript
import { zodToJsonSchema } from '../utils/zod-openapi.js';
import { createOrderSchema } from '../validators/order.js';

const openApiSchema = zodToJsonSchema(createOrderSchema);
```

## Resources

- **OpenAPI Specification**: https://swagger.io/specification/
- **Fastify Swagger**: https://github.com/fastify/fastify-swagger
- **Fastify Swagger UI**: https://github.com/fastify/fastify-swagger-ui

## Support

For issues or questions about the API documentation:
1. Check this documentation first
2. Review the Swagger UI at `/api/docs`
3. Check the OpenAPI spec at `/api/docs/json`
4. Contact the development team
