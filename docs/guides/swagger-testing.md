# Swagger/OpenAPI Testing Guide

## Quick Start

### 1. Start the API Server
```bash
cd /c/Users/Krzysztof/Desktop/AKROBUD
pnpm dev:api
```

Wait for the server to start. You should see:
```
Server started { url: 'http://127.0.0.1:3000', environment: 'development' }
Swagger documentation available at /api/docs
```

### 2. Access Swagger UI
Open your browser and navigate to:
```
http://localhost:3000/api/docs
```

You should see the interactive Swagger UI with all documented endpoints.

### 3. Test Basic Endpoints (No Auth Required)

#### Health Check
1. Expand the **health** tag section
2. Click on `GET /api/health`
3. Click **"Try it out"**
4. Click **"Execute"**
5. Verify you get a 200 response with:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-12-18T...",
     "uptime": 123.456,
     "environment": "development"
   }
   ```

#### Readiness Check
1. Click on `GET /api/ready`
2. Click **"Try it out"**
3. Click **"Execute"**
4. Verify you get a 200 response with database status

### 4. Test Authenticated Endpoints

#### Get Authentication Token
If you have authentication set up:
1. Use your login endpoint or get a test token
2. Click the **"Authorize"** button (lock icon) at the top right of Swagger UI
3. In the dialog, enter: `Bearer YOUR_TOKEN_HERE`
4. Click **"Authorize"**
5. Click **"Close"**

Now all requests will include the Authorization header.

#### Test Orders Endpoint
1. Expand the **orders** tag section
2. Click on `GET /api/orders`
3. Click **"Try it out"**
4. Optionally fill in query parameters (status, archived, colorId)
5. Click **"Execute"**
6. Verify the response shows order data or an empty array

#### Create a New Order
1. Click on `POST /api/orders`
2. Click **"Try it out"**
3. Edit the request body JSON:
   ```json
   {
     "orderNumber": "TEST-001",
     "deliveryDate": "2025-12-31T10:00:00Z",
     "valuePln": 15000,
     "valueEur": 3500
   }
   ```
4. Click **"Execute"**
5. Verify you get a 201 response with the created order

### 5. Test Deliveries Endpoints

#### Get All Deliveries
1. Expand the **deliveries** tag
2. Click on `GET /api/deliveries`
3. Click **"Try it out"**
4. Optionally add date range filters
5. Click **"Execute"**

#### Create a Delivery
1. Click on `POST /api/deliveries`
2. Click **"Try it out"**
3. Edit the request body:
   ```json
   {
     "deliveryDate": "2025-12-25T08:00:00Z",
     "deliveryNumber": "DEL-001",
     "notes": "Test delivery"
   }
   ```
4. Click **"Execute"**

### 6. Test Warehouse Endpoints

#### Get Warehouse Stock
1. Expand the **warehouse** tag
2. Click on `GET /api/warehouse/{colorId}`
3. Click **"Try it out"**
4. Enter a valid color ID (e.g., "1")
5. Click **"Execute"**
6. Verify warehouse stock data is returned

### 7. Verify OpenAPI JSON Spec

Navigate to:
```
http://localhost:3000/api/docs/json
```

You should see the complete OpenAPI specification in JSON format. This can be:
- Imported into Postman or Insomnia
- Used to generate client SDKs
- Used for automated testing

## Verification Checklist

- [ ] Swagger UI loads at `/api/docs`
- [ ] All endpoint tags are visible (auth, orders, deliveries, warehouse, profiles, colors, etc.)
- [ ] Health check endpoints work without authentication
- [ ] Authorization button is available
- [ ] Can test authenticated endpoints with JWT token
- [ ] Request/response schemas are displayed correctly
- [ ] "Try it out" functionality works for all endpoints
- [ ] Error responses (400, 401, 404) are properly documented
- [ ] OpenAPI JSON spec is available at `/api/docs/json`

## Common Issues and Solutions

### Issue: Swagger UI doesn't load
**Solution**:
- Verify API server is running on port 3000
- Check browser console for errors
- Ensure `@fastify/swagger` and `@fastify/swagger-ui` are installed

### Issue: 401 Unauthorized errors
**Solution**:
- Click "Authorize" button
- Enter valid JWT token with "Bearer " prefix
- Ensure token hasn't expired

### Issue: Schema validation errors
**Solution**:
- Check request body matches the schema
- Ensure required fields are provided
- Verify data types are correct (string, number, boolean)

### Issue: Missing endpoints in Swagger
**Solution**:
- Verify route files have `schema` property in route options
- Check that route is registered in `apps/api/src/index.ts`
- Restart the API server

## Testing with Postman

### Import Collection
1. Open Postman
2. Click **"Import"**
3. Select **"Link"**
4. Enter: `http://localhost:3000/api/docs/json`
5. Click **"Continue"** and **"Import"**

### Configure Authentication
1. Select the imported collection
2. Go to **"Authorization"** tab
3. Type: **"Bearer Token"**
4. Token: Enter your JWT token
5. This will apply to all requests in the collection

### Test Endpoints
All endpoints from Swagger are now available in Postman with:
- Pre-configured request methods
- URL paths
- Request/response schemas
- Example values

## Testing with cURL

### Without Authentication
```bash
# Health check
curl http://localhost:3000/api/health

# Readiness check
curl http://localhost:3000/api/ready
```

### With Authentication
```bash
# Get all orders
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "TEST-001",
    "deliveryDate": "2025-12-31T10:00:00Z"
  }'

# Get delivery by ID
curl -X GET http://localhost:3000/api/deliveries/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Next Steps

Once testing is complete:

1. **Share documentation** with frontend developers
2. **Import into API client** (Postman/Insomnia) for development
3. **Generate client SDK** if needed using OpenAPI generators
4. **Set up automated tests** using the OpenAPI spec
5. **Document any custom endpoints** that were added after this implementation

## Documentation Maintenance

When adding new endpoints:

1. **Always include schema** in route options
2. **Add appropriate tags** for organization
3. **Document parameters** with descriptions
4. **Include all response codes** (200, 400, 401, 404, etc.)
5. **Use schema references** for common models (`$ref: '#/components/schemas/...'`)
6. **Test in Swagger UI** to verify documentation is correct

## Resources

- API Documentation: `docs/API_DOCUMENTATION.md`
- Swagger Plugin: `apps/api/src/plugins/swagger.ts`
- Zod to OpenAPI Converter: `apps/api/src/utils/zod-openapi.ts`
- Route Examples:
  - `apps/api/src/routes/orders.ts`
  - `apps/api/src/routes/deliveries.ts`
  - `apps/api/src/routes/warehouse.ts`
  - `apps/api/src/routes/profiles.ts`
  - `apps/api/src/routes/colors.ts`
