# User Folder Settings API Implementation

## Overview
Created per-user folder settings API endpoints that allow each user to have their own imports base path with automatic fallback to global settings.

## Implementation Summary

### New API Endpoints

#### 1. GET /api/settings/user-folder-path
**Description:** Get the user's folder path (with automatic fallback to global settings)

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "importsBasePath": "C:\\Users\\Admin\\Documents\\Imports"
}
```

**Status Codes:**
- `200 OK` - Settings found (user-specific or global)
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - No folder settings configured

**Logic:**
1. Check for user-specific settings
2. If not found or inactive, fallback to global settings (userId = null)
3. If neither exists, return 404

---

#### 2. PUT /api/settings/user-folder-path
**Description:** Update the user's folder path

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "importsBasePath": "C:\\Users\\Admin\\Documents\\MyImports"
}
```

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "importsBasePath": "C:\\Users\\Admin\\Documents\\MyImports",
  "isActive": true,
  "createdAt": "2025-12-29T10:00:00.000Z",
  "updatedAt": "2025-12-29T10:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Settings updated successfully
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Failed to update settings

**Validation:**
- Path must be between 1-500 characters
- Path is required (non-empty)

---

#### 3. POST /api/settings/validate-folder
**Description:** Validate that a folder path exists and is readable (already exists, kept for compatibility)

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "path": "C:\\Users\\Admin\\Documents"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "path": "C:\\Users\\Admin\\Documents"
}
```

**Response (Error):**
```json
{
  "valid": false,
  "error": "Folder nie istnieje lub brak uprawnień"
}
```

---

## Database Schema

Uses existing `UserFolderSettings` model in Prisma:

```prisma
model UserFolderSettings {
  id              Int      @id @default(autoincrement())
  userId          Int?     @unique @map("user_id")
  importsBasePath String   @map("imports_base_path")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
  @@index([userId, isActive])
  @@map("user_folder_settings")
}
```

**Key Features:**
- `userId` can be NULL for global settings
- Unique constraint on `userId` ensures one setting per user
- Cascade delete when user is removed
- `isActive` flag for soft disabling settings

---

## Architecture

Following the layered architecture pattern used throughout the project:

### 1. Validators (`apps/api/src/validators/settings.ts`)
```typescript
// Zod schemas for request validation
export const updateUserFolderPathSchema = z.object({
  body: z.object({
    importsBasePath: z.string().min(1).max(500),
  }),
});

export const validateFolderSchema = z.object({
  body: z.object({
    path: z.string().min(1),
  }),
});
```

### 2. Repository (`apps/api/src/repositories/SettingsRepository.ts`)
```typescript
// Database access methods
async findUserFolderSettings(userId: number)
async findGlobalFolderSettings()
async upsertUserFolderSettings(userId: number, importsBasePath: string)
async upsertGlobalFolderSettings(importsBasePath: string)
```

### 3. Service (`apps/api/src/services/settingsService.ts`)
```typescript
// Business logic with fallback
async getUserFolderPath(userId: number) {
  // 1. Try user-specific settings
  // 2. Fallback to global settings
  // 3. Throw NotFoundError if neither exists
}

async updateUserFolderPath(userId: number, importsBasePath: string)
async updateGlobalFolderPath(importsBasePath: string)
```

### 4. Handler (`apps/api/src/handlers/settingsHandler.ts`)
```typescript
// HTTP request/response handling
async getUserFolderPath(request, reply)
async updateUserFolderPath(request, reply)
```

### 5. Routes (`apps/api/src/routes/settings.ts`)
```typescript
// Endpoint definitions
fastify.get('/user-folder-path', { preHandler: verifyAuth }, handler.getUserFolderPath.bind(handler));
fastify.put('/user-folder-path', { preHandler: verifyAuth }, handler.updateUserFolderPath.bind(handler));
```

---

## Files Modified

1. **apps/api/src/validators/settings.ts**
   - Added `updateUserFolderPathSchema`
   - Added `validateFolderSchema`
   - Added type exports

2. **apps/api/src/repositories/SettingsRepository.ts**
   - Added `findUserFolderSettings()`
   - Added `findGlobalFolderSettings()`
   - Added `upsertUserFolderSettings()`
   - Added `upsertGlobalFolderSettings()`

3. **apps/api/src/services/settingsService.ts**
   - Added `getUserFolderPath()` with fallback logic
   - Added `updateUserFolderPath()`
   - Added `updateGlobalFolderPath()`

4. **apps/api/src/handlers/settingsHandler.ts**
   - Added `getUserFolderPath()` handler
   - Added `updateUserFolderPath()` handler

5. **apps/api/src/routes/settings.ts**
   - Added GET `/user-folder-path` route
   - Added PUT `/user-folder-path` route

---

## Usage Examples

### Frontend Integration

```typescript
// Get current user's folder path
const response = await fetch('/api/settings/user-folder-path', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { importsBasePath } = await response.json();

// Update user's folder path
await fetch('/api/settings/user-folder-path', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    importsBasePath: 'C:\\NewPath'
  })
});

// Validate folder before saving
const validation = await fetch('/api/settings/validate-folder', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    path: 'C:\\NewPath'
  })
});
const { valid, error } = await validation.json();
```

---

## Security

- All endpoints require JWT authentication via `verifyAuth` middleware
- User ID is extracted from JWT token, not from request parameters
- Prevents users from accessing/modifying other users' settings
- Folder path validation checks:
  - Path exists
  - Path is a directory
  - Read permissions are available

---

## Error Handling

All endpoints follow consistent error handling patterns:

- **401 Unauthorized**: Missing or invalid JWT token
- **404 Not Found**: Settings not configured
- **500 Internal Server Error**: Database or filesystem errors
- Detailed error messages in response body

---

## Testing Recommendations

1. **Unit Tests:**
   - Repository methods for CRUD operations
   - Service fallback logic
   - Handler authentication checks

2. **Integration Tests:**
   - GET endpoint returns user settings
   - GET endpoint falls back to global settings
   - PUT endpoint creates/updates user settings
   - Validate-folder checks permissions correctly

3. **E2E Tests:**
   - User can set their own folder path
   - User without settings gets global settings
   - Invalid paths are rejected
   - Unauthorized requests are blocked

---

## Future Enhancements

1. **Admin Endpoints:**
   - GET/PUT for global settings (admin only)
   - List all users' folder settings

2. **Audit Trail:**
   - Track who changed settings and when
   - History of path changes

3. **Validation Improvements:**
   - Check disk space availability
   - Verify write permissions
   - Suggest default paths based on OS

4. **Multi-Path Support:**
   - Allow multiple import paths per user
   - Path aliases/shortcuts

---

## Notes

- The `validate-folder` endpoint already existed and was kept for compatibility
- Global settings use `userId = null` to differentiate from user-specific settings
- The `isActive` flag allows soft-disabling settings without deletion
- All folder paths are normalized using Node.js `path.normalize()`
