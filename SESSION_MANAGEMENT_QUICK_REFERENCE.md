# Session Management - Quick Reference Card

## 🚀 Quick Start

### Backend Setup
```bash
# Environment variables are already configured in server/.env
cd server
npm start
```

### Test the Implementation
```bash
cd server
node test-session-management.js
```

## 📡 API Endpoints

### 1. Login with Session
```bash
POST /api/auth/login-session
Content-Type: application/json

{
  "username": "radiologist1",
  "password": "password123"
}

Response:
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "sessionId": "abc123...",
  "expiresAt": "2024-01-01T12:00:00Z",
  "user": { ... },
  "role": "radiologist"
}
```

### 2. Refresh Access Token
```bash
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "expiresIn": 1800,
  "sessionId": "abc123..."
}
```

### 3. Get Session Status
```bash
GET /api/auth/session-status
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "status": "active",
  "expiresIn": 1500000,
  "expiresAt": "2024-01-01T12:00:00Z",
  "lastActivity": "2024-01-01T11:30:00Z",
  "isExpiringSoon": false,
  "isInactive": false
}
```

### 4. Extend Session
```bash
POST /api/auth/extend-session
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "extensionSeconds": 1800
}

Response:
{
  "success": true,
  "sessionId": "abc123...",
  "expiresAt": "2024-01-01T12:30:00Z",
  "expiresIn": 1800
}
```

### 5. Get All Sessions
```bash
GET /api/auth/sessions
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "sessions": [
    {
      "id": "abc123...",
      "deviceInfo": { ... },
      "lastActivity": "2024-01-01T11:30:00Z",
      "status": "active"
    }
  ],
  "count": 1
}
```

### 6. Revoke Session
```bash
DELETE /api/auth/sessions/:sessionId
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "Session revoked successfully"
}
```

### 7. Logout
```bash
POST /api/auth/logout
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🔧 Using the Session Service

### In Your Code
```javascript
const SessionService = require('./src/services/session-service');
const sessionService = new SessionService();

// Create session
const session = await sessionService.createSession(userId, {
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
  deviceId: 'device-123'
});

// Validate session
const validation = await sessionService.validateSession(accessToken);
if (validation.valid) {
  console.log('User:', validation.user);
}

// Refresh token
const newToken = await sessionService.refreshAccessToken(refreshToken);

// Extend session
await sessionService.extendSession(sessionId, 1800);

// Get user sessions
const sessions = await sessionService.getUserSessions(userId);

// Revoke session
await sessionService.revokeSession(sessionId, 'User logout');
```

## 🛡️ Using Session Middleware

### In Your Routes
```javascript
const { validateSession, rateLimit, csrfProtection } = require('./middleware/session-middleware');

// Protect route with session validation
router.get('/protected', validateSession(), (req, res) => {
  // req.user and req.session are available
  res.json({ user: req.user });
});

// Add rate limiting
router.post('/api/data', rateLimit({ maxRequests: 10, windowMs: 60000 }), handler);

// Add CSRF protection
router.post('/api/update', validateSession(), csrfProtection(), handler);
```

## ⚙️ Configuration

### Environment Variables
```env
# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=dev_jwt_secret_change_in_production_2024
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_change_in_production_2024

# Session Settings
SESSION_TIMEOUT_MS=1800000              # 30 minutes
MAX_CONCURRENT_SESSIONS=3               # Max sessions per user

# Security Settings
STRICT_IP_VALIDATION=false              # Enable in production
STRICT_DEVICE_VALIDATION=false          # Enable in production
```

### Session Service Configuration
```javascript
// In session-service.js
this.ACCESS_TOKEN_EXPIRY = 30 * 60;           // 30 minutes
this.REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
this.SESSION_TIMEOUT = 30 * 60 * 1000;        // 30 minutes
this.MAX_CONCURRENT_SESSIONS = 3;             // 3 sessions
```

## 🔍 Monitoring

### Session Status Headers
Every authenticated request includes:
```
X-Session-Expires-In: 1500        # Seconds until expiration
X-Session-Expires-At: 2024-01-01T12:00:00Z
X-Session-Warning: false          # true if < 5 minutes remaining
```

### Rate Limit Headers
Rate-limited endpoints include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T12:00:00Z
Retry-After: 60                   # If rate limit exceeded
```

## 🧪 Testing

### Manual Testing
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login-session \
  -H "Content-Type: application/json" \
  -d '{"username":"radiologist1","password":"password123"}' \
  | jq -r '.accessToken')

# 2. Check session status
curl http://localhost:8001/api/auth/session-status \
  -H "Authorization: Bearer $TOKEN"

# 3. Get all sessions
curl http://localhost:8001/api/auth/sessions \
  -H "Authorization: Bearer $TOKEN"

# 4. Logout
curl -X POST http://localhost:8001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

### Automated Testing
```bash
node test-session-management.js
```

## 🚨 Common Issues

### Issue: "Invalid access token"
**Solution**: Token may have expired. Use refresh token to get new access token.

### Issue: "Session not found"
**Solution**: Session may have been revoked or expired. User needs to login again.

### Issue: "Concurrent session limit exceeded"
**Solution**: User has too many active sessions. Revoke old sessions or increase limit.

### Issue: "Session timed out"
**Solution**: No activity for 30 minutes. User needs to login again.

## 📚 Key Concepts

### Token Types
- **Access Token**: Short-lived (30 min), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Session States
- **active**: Session is valid and can be used
- **expired**: Session has passed expiration time
- **revoked**: Session was manually terminated

### Security Features
- ✅ JWT-based authentication
- ✅ Token rotation on refresh
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ IP validation
- ✅ Device fingerprinting
- ✅ Concurrent session limits

## 📖 Documentation

- **Full Guide**: `server/SESSION_MANAGEMENT_IMPLEMENTATION.md`
- **Design**: `.kiro/specs/production-features/design.md`
- **Requirements**: `.kiro/specs/production-features/requirements.md`
- **Completion Summary**: `SESSION_MANAGEMENT_COMPLETE.md`

## 🎯 Next Steps

1. **Frontend Integration** (Week 2):
   - Create session management hooks
   - Implement timeout warning component
   - Add automatic token refresh

2. **WebSocket Integration** (Week 3):
   - Real-time session updates
   - Session timeout warnings

3. **Production Deployment**:
   - Update JWT secrets
   - Enable strict validation
   - Set up monitoring

---

**Status**: ✅ Backend Complete | 🔄 Frontend Pending | 📅 Week 1 Complete
