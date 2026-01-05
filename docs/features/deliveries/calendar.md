# Deliveries Module - Calendar

Documentation for delivery calendar integration.

## Purpose

Calendar-based delivery planning:
- Visual monthly view
- Date selection
- Google Calendar sync
- Status color coding

## Features

### 1. Calendar View

**Monthly Grid:**
- Shows all deliveries for month
- Color by status (planned/loading/shipped/delivered)
- Click date → see deliveries
- Quick create from calendar

### 2. Google Calendar Integration

**Setup:**
```typescript
// apps/api/src/services/googleCalendarService.ts
export class GoogleCalendarService {
  async createEvent(delivery) {
    // Create calendar event
  }
  
  async updateEvent(deliveryId, newDate) {
    // Update existing event
  }
  
  async deleteEvent(deliveryId) {
    // Remove event
  }
}
```

**Sync Strategy:**
- Create delivery → Create calendar event
- Update date → Update event
- Delete delivery → Delete event
- One-way sync (AKROBUD → Google)

### 3. Status Colors

```typescript
const statusColors = {
  planned: '#3B82F6',     // Blue
  loading: '#EAB308',     // Yellow
  shipped: '#10B981',     // Green
  delivered: '#6B7280'    // Gray
};
```

## Frontend Components

**DeliveryCalendar**
- `apps/web/src/app/dostawy/components/DeliveryCalendar.tsx`
- Uses React Big Calendar
- Click handlers for date/delivery

## API

```http
GET /api/deliveries/calendar?month=2025-01
```

Response:
```json
{
  "events": [
    {
      "date": "2025-01-15",
      "deliveries": [
        { "id": "uuid", "status": "planned", "orderCount": 3 }
      ]
    }
  ]
}
```

---

*Last updated: 2025-12-30*
