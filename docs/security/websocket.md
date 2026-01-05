# WebSocket Security Implementation

## Overview
This document describes the security enhancements added to the WebSocket real-time synchronization system in the AKROBUD application.

## Security Features Implemented

### 1. Authentication Token Validation

**Location:** `apps/api/src/plugins/websocket.ts`

**Implementation:**
- JWT token validation on WebSocket handshake
- Token can be provided via query parameter (`?token=...`) or Authorization header
- Connections without valid tokens are rejected immediately
- User information (userId, email) is attached to each authenticated connection

**Key Functions:**
- `extractWebSocketToken()`: Extracts token from URL or headers
- Token validation using existing `decodeToken()` from `utils/jwt.ts`

**Security Logging:**
- Failed authentication attempts are logged with IP address
- Successful connections are logged with user info and connection ID

### 2. Data Sanitization

**Location:** `apps/api/src/plugins/websocket.ts`

**Implementation:**
- All data is sanitized before being sent over WebSocket
- Sensitive fields are removed (password, token, secret, jwt)
- String lengths are limited to 10,000 characters to prevent buffer overflow
- Recursive sanitization for nested objects and arrays

**Key Function:**
- `sanitizeWebSocketData()`: Cleans data before transmission

**Applied to:**
- Event listener broadcasts (`eventEmitter.onAnyChange`)
- Manual broadcasts (`fastify.broadcastToClients`)

### 3. Rate Limiting

**Location:** `apps/api/src/plugins/websocket.ts`

**Implementation:**
- Per-connection rate limiting (100 messages per minute)
- 60-second sliding window
- Rate limit violations are logged but don't close the connection
- Automatic cleanup when connections close

**Key Function:**
- `checkRateLimit()`: Validates message rate per connection ID

**Configuration:**
```typescript
const MAX_MESSAGES_PER_MINUTE = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
```

### 4. Connection Security

**Features:**
- Maximum 100 concurrent connections
- Unique connection IDs generated per connection
- Automatic cleanup of rate limit data on disconnect
- Comprehensive error logging with user context

## Frontend Changes

### 1. Authentication Token Utility

**Location:** `apps/web/src/lib/auth-token.ts`

**Features:**
- Token storage in localStorage
- Automatic token retrieval from demo endpoint (development only)
- Async and sync token getters
- Token management functions (set, clear)

**Key Functions:**
```typescript
getAuthToken(): Promise<string | null>  // Async with auto-fetch
getAuthTokenSync(): string | null       // Sync from storage
setAuthToken(token: string): void
clearAuthToken(): void
```

### 2. WebSocket Hook Update

**Location:** `apps/web/src/hooks/useRealtimeSync.ts`

**Changes:**
- Imports `getAuthToken` utility
- Fetches token before establishing WebSocket connection
- Includes token in WebSocket URL as query parameter
- Connection fails gracefully if no token is available

**Code:**
```typescript
const token = await getAuthToken();
const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
```

## Backend API Changes

### 1. Demo Token Endpoint (Development Only)

**Location:** `apps/api/src/routes/auth.ts`

**Endpoint:** `POST /api/auth/demo-token`

**Features:**
- Generates a demo JWT token for development
- Automatically disabled in production
- Returns token with 24-hour expiration
- Logs all token generation requests

**Security:**
- Production check: Returns 403 if `NODE_ENV === 'production'`
- IP address logging for audit trail

### 2. Server Integration

**Location:** `apps/api/src/index.ts`

**Changes:**
- Imported and registered `authRoutes`
- Auth routes registered before other routes

## Security Considerations

### Development vs Production

**Development:**
- Demo token endpoint is enabled
- Tokens generated automatically on first connection
- Default JWT secret: `dev-secret-key-change-in-production`

**Production:**
- Demo token endpoint returns 403
- Must implement proper user authentication
- JWT_SECRET must be set in environment variables
- Tokens should come from secure login flow

### Best Practices

1. **Token Storage:**
   - Tokens stored in localStorage (client-side)
   - Consider migrating to httpOnly cookies for production

2. **Token Expiration:**
   - Demo tokens expire in 24 hours
   - Production tokens should have shorter expiration (recommended: 1-4 hours)
   - Implement token refresh mechanism

3. **HTTPS:**
   - Always use WSS (WebSocket Secure) in production
   - Never send tokens over unencrypted connections

4. **Rate Limiting:**
   - Current limit: 100 messages/minute per connection
   - Adjust based on application needs
   - Consider implementing IP-based rate limiting

## Testing

### Manual Testing Steps

1. **Test Authentication:**
   ```bash
   # Start backend
   cd apps/api
   pnpm dev

   # Start frontend
   cd apps/web
   pnpm dev
   ```

2. **Verify Token Generation:**
   - Open browser DevTools > Network
   - Should see POST to `/api/auth/demo-token`
   - Token should be stored in localStorage

3. **Verify WebSocket Connection:**
   - Check Console for "Connected" message
   - Network tab should show WebSocket connection with token parameter
   - Backend logs should show authenticated connection

4. **Test Rate Limiting:**
   - Trigger many data changes rapidly
   - Check backend logs for rate limit warnings

5. **Test Reconnection:**
   - Stop backend server
   - Frontend should attempt reconnection
   - When backend restarts, new token should be fetched if needed

### Security Testing

1. **Test without token:**
   ```javascript
   // In browser console
   localStorage.removeItem('akrobud_auth_token');
   // Reload page - should fail to connect
   ```

2. **Test with invalid token:**
   ```javascript
   localStorage.setItem('akrobud_auth_token', 'invalid-token');
   // Reload page - should fail and fetch new token
   ```

3. **Test data sanitization:**
   - Add console.log in frontend to inspect received data
   - Verify no password/token fields are present

## Migration Path to Production

### Required Changes:

1. **Implement User Authentication:**
   - Create user registration/login endpoints
   - Add user table to Prisma schema
   - Implement password hashing (bcrypt)

2. **Secure Token Management:**
   - Use httpOnly cookies instead of localStorage
   - Implement token refresh mechanism
   - Add CSRF protection

3. **Environment Configuration:**
   - Set strong JWT_SECRET in production
   - Configure WSS (WebSocket Secure)
   - Set up proper CORS origins

4. **Remove Demo Endpoint:**
   - Disable `/api/auth/demo-token` in production
   - Or completely remove the endpoint

5. **Add Authorization:**
   - Implement role-based access control
   - Restrict WebSocket events based on user permissions
   - Filter data based on user access level

## Files Changed

### Backend:
- `apps/api/src/plugins/websocket.ts` - Security enhancements
- `apps/api/src/routes/auth.ts` - New demo token endpoint
- `apps/api/src/index.ts` - Route registration

### Frontend:
- `apps/web/src/lib/auth-token.ts` - New token utility
- `apps/web/src/hooks/useRealtimeSync.ts` - Token integration

## Additional Security Recommendations

1. **Implement Connection Limits per User:**
   - Track connections by userId
   - Prevent single user from consuming all connections

2. **Add Message Type Validation:**
   - Validate incoming WebSocket messages
   - Implement schema validation for client messages

3. **Add Monitoring:**
   - Track failed authentication attempts
   - Monitor rate limit violations
   - Alert on suspicious patterns

4. **Implement Heartbeat Validation:**
   - Verify client sends pong responses
   - Close connections that don't respond to ping

5. **Add Encryption:**
   - Encrypt sensitive data in WebSocket messages
   - Use end-to-end encryption for critical data

## Conclusion

The WebSocket system now has:
- ✅ Authentication on connection
- ✅ Data sanitization
- ✅ Rate limiting per connection
- ✅ Comprehensive security logging
- ✅ Production-ready error handling

For production deployment, implement proper user authentication and follow the migration path outlined above.
