# User Management - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Start the Backend
```bash
cd server
npm start
```

### 2. Start the Frontend
```bash
cd viewer
npm run dev
```

### 3. Access User Management
```
http://localhost:5173/users
```

---

## 🔑 Default Admin Credentials

```
Username: admin
Password: admin123
```

**⚠️ Change this immediately in production!**

---

## 📋 Common Tasks

### Create a New User

**Via UI:**
1. Navigate to `/users`
2. Click "Add User" button
3. Fill in the form:
   - First Name, Last Name
   - Username (unique)
   - Email (unique)
   - Password (min 6 chars)
   - Select roles
4. Click "Add User"

**Via API:**
```bash
curl -X POST http://localhost:8001/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jdoe",
    "email": "jdoe@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["radiologist"]
  }'
```

---

### Update User

**Via UI:**
1. Navigate to `/users`
2. Click edit icon next to user
3. Modify fields
4. Click "Save Changes"

**Via API:**
```bash
curl -X PUT http://localhost:8001/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "roles": ["radiologist", "admin"]
  }'
```

---

### Toggle User Status

**Via UI:**
1. Navigate to `/users`
2. Click on the status chip (Active/Inactive)

**Via API:**
```bash
curl -X POST http://localhost:8001/api/users/USER_ID/toggle-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Delete User (Soft Delete)

**Via UI:**
1. Navigate to `/users`
2. Click delete icon
3. Confirm deletion

**Via API:**
```bash
curl -X DELETE http://localhost:8001/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Reset User Password (Admin Only)

**Via API:**
```bash
curl -X PUT http://localhost:8001/api/users/USER_ID/password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewSecurePass123"
  }'
```

---

## 🎭 Available Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `radiologist` | Radiologist/Provider | Read/Write reports, View studies |
| `provider` | Healthcare Provider | Read/Write reports, View studies |
| `doctor` | Doctor | Read/Write reports, View studies |
| `technician` | Radiology Technician | Upload studies, View reports |
| `staff` | General Staff | View studies, Basic operations |
| `nurse` | Nurse | View studies, Basic operations |
| `receptionist` | Receptionist | Patient management, Scheduling |
| `admin` | Administrator | User management, System config |
| `system:admin` | System Administrator | Full access, Password resets |

---

## 🔒 Required Permissions

| Action | Required Permission |
|--------|-------------------|
| View users | `users:read` or `system:admin` |
| Create user | `users:write` or `system:admin` |
| Update user | `users:write` or `system:admin` |
| Delete user | `users:write` or `system:admin` |
| Reset password | `system:admin` only |

---

## 🐛 Troubleshooting

### "CSRF token required" Error

**Fixed!** The user management API is now excluded from CSRF protection since it uses JWT authentication.

If you still see this error:
1. Check that JWT token is valid
2. Ensure token is in Authorization header
3. Verify backend is running latest version

### "Unauthorized" Error (401)

**Cause:** Missing or invalid JWT token

**Solution:**
1. Login again to get fresh token
2. Check token in localStorage/sessionStorage
3. Verify token hasn't expired

### "Forbidden" Error (403)

**Cause:** Insufficient permissions

**Solution:**
1. Check your user roles
2. Ensure you have `users:read` or `users:write` permission
3. Contact admin to update your roles

### "User already exists" Error

**Cause:** Username or email already in use

**Solution:**
1. Choose different username
2. Use different email address
3. Check if user was previously created

---

## 🧪 Testing

### Test User Creation
```bash
# 1. Login to get token
TOKEN=$(curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# 2. Create test user
curl -X POST http://localhost:8001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123",
    "firstName": "Test",
    "lastName": "User",
    "roles": ["staff"]
  }'
```

### Test User Listing
```bash
curl -X GET http://localhost:8001/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### Test User Update
```bash
curl -X PUT http://localhost:8001/api/users/USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Updated"}'
```

---

## 📊 Monitoring

### Check User Activity
```bash
# View audit logs
tail -f server/logs/audit.log | grep "users"

# View admin actions
tail -f server/logs/admin-actions.log
```

### Database Queries
```javascript
// MongoDB shell
use dicomdb

// Count users
db.users.count()

// List active users
db.users.find({ isActive: true })

// Find users by role
db.users.find({ roles: "radiologist" })

// Check last login
db.users.find().sort({ lastLogin: -1 }).limit(10)
```

---

## 🔐 Security Best Practices

1. **Change Default Password**
   ```bash
   # First login, change admin password
   curl -X PUT http://localhost:8001/api/users/ADMIN_ID/password \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"newPassword":"StrongPassword123!"}'
   ```

2. **Use Strong Passwords**
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - No common words or patterns

3. **Principle of Least Privilege**
   - Only assign necessary roles
   - Review permissions regularly
   - Remove unused accounts

4. **Regular Audits**
   - Review user list monthly
   - Check for inactive accounts
   - Verify role assignments

5. **Monitor Failed Logins**
   - Check audit logs for failed attempts
   - Investigate suspicious activity
   - Lock accounts after multiple failures

---

## 🚀 Production Deployment

### Environment Variables
```bash
# .env file
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db:27017/dicomdb
JWT_SECRET=your-very-secure-secret-key-here
CSRF_SECRET=your-csrf-secret-here
```

### Security Checklist
- [ ] Change default admin password
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Enable audit logging
- [ ] Configure backup strategy
- [ ] Test disaster recovery
- [ ] Document admin procedures

---

## 📞 Support

### Documentation
- [Full Security Audit](./USER_MANAGEMENT_SECURITY_AUDIT.md)
- [API Documentation](./CONSOLIDATED_ENDPOINT_DOCUMENTATION.md)
- [RBAC Guide](./TASK_17_AUTHENTICATION_AUTHORIZATION_COMPLETE.md)

### Common Issues
- CSRF errors → Fixed in latest version
- Permission errors → Check user roles
- Login issues → Verify credentials and token

---

## ✅ Quick Verification

Run this to verify everything is working:

```bash
# Test backend health
curl http://localhost:8001/health

# Test authentication
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test user listing (with token from above)
curl -X GET http://localhost:8001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** All requests return 200 OK with valid JSON responses.

---

**Last Updated:** November 5, 2025  
**Version:** 1.0.0 (Production Ready)
