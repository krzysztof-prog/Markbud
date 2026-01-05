# Orders Module - API Reference

Complete API documentation for Orders endpoints.

## Base URL

```
http://localhost:3001/api/orders
```

## Endpoints

### List Orders

```http
GET /api/orders
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: new, in_progress, completed, archived |
| `clientName` | string | Filter by client name (partial match) |
| `deliveryId` | string | Filter by assigned delivery |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": "53456",
      "orderDate": "2025-01-15T00:00:00Z",
      "clientName": "Kowalski Jan",
      "status": "new",
      "totalValue": 15000.50,
      "deliveryId": "uuid",
      "requirements": [...],
      "windows": [...]
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

### Get Order Details

```http
GET /api/orders/:id
```

**Response:**
```json
{
  "id": "uuid",
  "orderNumber": "53456",
  "orderDate": "2025-01-15T00:00:00Z",
  "clientName": "Kowalski Jan",
  "clientPhone": "+48 123 456 789",
  "clientEmail": "kowalski@example.com",
  "status": "new",
  "totalValue": 15000.50,
  "deliveryId": "uuid",
  "delivery": {
    "id": "uuid",
    "deliveryDate": "2025-01-20T00:00:00Z"
  },
  "requirements": [
    {
      "id": "uuid",
      "profileId": "uuid",
      "colorId": "uuid",
      "length": 5000,
      "quantity": 2,
      "profile": { "name": "Profile 65mm" },
      "color": { "name": "RAL 9016" }
    }
  ],
  "windows": [
    {
      "id": "uuid",
      "position": 1,
      "type": "Uchylne",
      "width": 800,
      "height": 1200,
      "quantity": 2
    }
  ],
  "variants": [...],
  "pendingPrices": [...]
}
```

### Create Order

```http
POST /api/orders
```

**Request Body:**
```json
{
  "orderNumber": "53456",
  "orderDate": "2025-01-15",
  "clientName": "Kowalski Jan",
  "clientPhone": "+48 123 456 789",
  "clientEmail": "kowalski@example.com",
  "totalValue": 15000.50,
  "windows": [
    {
      "position": 1,
      "type": "Uchylne",
      "width": 800,
      "height": 1200,
      "quantity": 2
    }
  ],
  "requirements": [
    {
      "profileId": "uuid",
      "colorId": "uuid",
      "length": 5000,
      "quantity": 2
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "orderNumber": "53456",
  "status": "new",
  ...
}
```

### Update Order

```http
PATCH /api/orders/:id
```

**Request Body:** (partial update)
```json
{
  "status": "in_progress",
  "deliveryId": "uuid",
  "totalValue": 16000.00
}
```

**Response:** `200 OK`

### Delete Order

```http
DELETE /api/orders/:id
```

**Response:** `204 No Content`

**Errors:**
- `409` - Order assigned to delivery (unassign first)
- `404` - Order not found

### Import from PDF

```http
POST /api/orders/import
Content-Type: multipart/form-data
```

**Request:**
```
file: <PDF file>
```

**Response:** `200 OK`
```json
{
  "data": {
    "orderNumber": "53456",
    "clientName": "Kowalski Jan",
    "windows": [...],
    "requirements": [...]
  },
  "variants": [
    {
      "variantId": 1,
      "description": "RAL 9016 variant",
      "windows": [...],
      "requirements": [...]
    }
  ],
  "hasPendingPrice": true
}
```

### Confirm Import with Variants

```http
POST /api/orders/import/confirm
```

**Request Body:**
```json
{
  "data": {...},
  "selectedVariants": [1, 2],
  "acceptPendingPrice": true
}
```

**Response:** `201 Created`
```json
{
  "orders": [
    { "id": "uuid", "orderNumber": "53456" }
  ]
}
```

## Error Responses

### Validation Error (400)
```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": [
    {
      "field": "orderNumber",
      "message": "Order number is required"
    }
  ]
}
```

### Not Found (404)
```json
{
  "error": "NotFoundError",
  "message": "Order with ID 'uuid' not found"
}
```

### Conflict (409)
```json
{
  "error": "ConflictError",
  "message": "Order already exists with this number"
}
```

## Validation Rules

**Order Number:**
- Required
- Unique
- String, max 50 chars

**Client Name:**
- Required
- String, 2-200 chars

**Total Value:**
- Optional
- Decimal, >= 0

**Windows:**
- At least 1 window required
- Width: 100-5000 mm
- Height: 100-5000 mm
- Quantity: >= 1

**Requirements:**
- Calculated automatically from windows
- Can be overridden manually

---

*Last updated: 2025-12-30*
