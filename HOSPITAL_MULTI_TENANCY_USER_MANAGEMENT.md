# Hospital Multi-Tenancy User Management

## Overview
Hospital-based multi-tenancy ensures that each hospital can only manage and view their own staff members. Super admins can see and manage all users across all hospitals.

## Key Features

### 1. **Automatic Hospital Assignment**
- When a hospital admin creates a user, the `hospitalId` is automatically assigned from their own account
- Super admins can specify any `hospitalId` or leave it null

### 2. **Hospital-Scoped Visibility**
- Hospital admins only see users from their hospital
- Super admins see all users across all hospitals
- Users cannot view or access staff from other hospitals

### 3. **Protected Operations**
All user management operations are hospital-scoped:
- ✅ **GET /api/users** - List users (filtered by hospital)
- ✅ **GET /api/users/:id** - View user details (hospital check)
- ✅ **POST /api/users** - Create user (auto-assign hospitalId)
- ✅ **PUT /api/users/:id** - Update user (hospital check)
- ✅ **DELETE /api/users/:id** - Deactivate user (hospital check)
- ✅ **POST /api/users/:id/activate** - Activate user (hospital check)
- ✅ **POST /api/users/:id/toggle-status** - Toggle status (hospital check)

## How It Works

### For Hospital Admins
```javascript
// When hospital admin logs in
{
  id: "user123",
  username: "hospital_admin",
  hospitalId: "hospital_abc",
  roles: ["hospital_admin"]
}

// Creating a new user
POST /api/users
{
  "username": "dr_smith",
  "email": "smith@hospital.com",
  "password": "secure123",
  "roles": ["doctor"]
  // hospitalId is automatically set to "hospital_abc"
}

// Listing users - only sees hospital_abc users
GET /api/users
// Returns only users where hospitalId === "hospital_abc"
```

### For Super Admins
```javascript
// When super admin logs in
{
  id: "admin123",
  username: "super_admin",
  roles: ["system:admin"]
  // No hospitalId restriction
}

// Creating a user for a specific hospital
POST /api/users
{
  "username": "dr_jones",
  "email": "jones@hospital.com",
  "password": "secure123",
  "hospitalId": "hospital_xyz",  // Can specify any hospital
  "roles": ["doctor"]
}

// Listing users - sees ALL users
GET /api/users
// Returns users from all hospitals
```

## Security Checks

### Multi-Tenancy Validation
```javascript
// Check if user is super admin
const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                     req.user.roles?.includes('super_admin');

// If not super admin, enforce hospital filtering
if (!isSuperAdmin && req.user.hospitalId) {
  // Only allow access to same hospital's data
  if (targetUser.hospitalId !== req.user.hospitalId) {
    return res.status(403).json({ 
      message: 'Access denied: You can only manage users from your hospital' 
    });
  }
}
```

## API Response Examples

### Hospital Admin - List Users
```json
GET /api/users

Response:
{
  "success": true,
  "data": [
    {
      "_id": "user1",
      "username": "dr_smith",
      "email": "smith@hospital.com",
      "hospitalId": "hospital_abc",
      "roles": ["doctor"],
      "isActive": true
    },
    {
      "_id": "user2",
      "username": "nurse_jane",
      "email": "jane@hospital.com",
      "hospitalId": "hospital_abc",
      "roles": ["nurse"],
      "isActive": true
    }
  ],
  "total": 2
}
```

### Attempting Cross-Hospital Access
```json
GET /api/users/user_from_different_hospital

Response (403):
{
  "success": false,
  "message": "Access denied: You can only view users from your hospital"
}
```

## Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  password: String,
  hospitalId: String,  // Links user to hospital
  roles: [String],
  isActive: Boolean,
  firstName: String,
  lastName: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Testing Multi-Tenancy

### Test Scenario 1: Hospital Admin Creates User
```bash
# Login as hospital admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "hospital_admin", "password": "password123"}'

# Create user (hospitalId auto-assigned)
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new_doctor",
    "email": "doctor@hospital.com",
    "password": "secure123",
    "roles": ["doctor"]
  }'
```

### Test Scenario 2: Hospital Admin Lists Users
```bash
# List users (only sees own hospital)
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Scenario 3: Cross-Hospital Access Denied
```bash
# Try to view user from different hospital
curl -X GET http://localhost:5000/api/users/OTHER_HOSPITAL_USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 403 Forbidden
```

## Benefits

1. **Data Isolation**: Each hospital's data is completely isolated
2. **Security**: Prevents unauthorized access to other hospitals' staff
3. **Automatic Assignment**: No manual hospitalId entry needed for hospital admins
4. **Flexible Admin Control**: Super admins can manage all hospitals
5. **Audit Trail**: All operations logged with hospital context

## Migration Notes

If you have existing users without `hospitalId`:
1. Super admins will see all users (including those without hospitalId)
2. Hospital admins will only see users with matching hospitalId
3. Run a migration script to assign hospitalId to existing users

## Next Steps

- ✅ Multi-tenancy implemented for user management
- 🔄 Apply same pattern to patients, studies, and reports
- 🔄 Add hospital management endpoints
- 🔄 Create hospital dashboard with statistics
- 🔄 Implement hospital-level settings and configurations
