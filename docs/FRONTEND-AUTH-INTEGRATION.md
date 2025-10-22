# Frontend Integration Guide - Smart Auth Middleware

## Quick Start

The backend now automatically handles role validation from the database. You just need to include the phone number in your requests!

## How to Use

### Option 1: Query Parameter (Recommended for GET requests)

```typescript
// Dashboard: Get all members
const response = await axios.get('/api/members', {
    params: {
        phoneNumber: '9876543210'  // ✅ That's it!
    }
});
```

### Option 2: Request Body (Recommended for POST/PUT requests)

```typescript
// Dashboard: Create member
const response = await axios.post('/api/members', {
    phoneNumber: '9876543210',  // ✅ Backend validates role automatically
    name: 'John Doe',
    email: 'john@example.com',
    // ... other fields
});
```

### Option 3: Both (Safest)

```typescript
// Dashboard: Update member
const response = await axios.put(`/api/members/${id}`, {
    phoneNumber: '9876543210',  // In body
    name: 'Updated Name',
}, {
    params: {
        phoneNumber: '9876543210'  // In query
    }
});
```

## Update Your API Client

### Before (Week 3 Version) ❌

```typescript
// /dashboard/src/lib/api.ts
export const memberAPI = {
    getAll: () => api.get<Member[]>('/api/members'),
    create: (member: Partial<Member>) => api.post<Member>('/api/members', member),
};
```

### After (Smart Auth Version) ✅

```typescript
// /dashboard/src/lib/api.ts

// Get user phone number from localStorage or environment
const getUserPhone = () => {
    return localStorage.getItem('userPhone') || 
           import.meta.env.VITE_TEST_PHONE_NUMBER || 
           '9876543210'; // Default for testing
};

export const memberAPI = {
    getAll: () => api.get<Member[]>('/api/members', {
        params: { phoneNumber: getUserPhone() }
    }),
    
    getById: (id: string) => api.get<Member>(`/api/members/${id}`, {
        params: { phoneNumber: getUserPhone() }
    }),
    
    create: (member: Partial<Member>) => api.post<Member>('/api/members', {
        ...member,
        phoneNumber: getUserPhone()
    }),
    
    update: (id: string, member: Partial<Member>) => 
        api.put<Member>(`/api/members/${id}`, {
            ...member,
            phoneNumber: getUserPhone()
        }),
    
    delete: (id: string) => api.delete(`/api/members/${id}`, {
        params: { phoneNumber: getUserPhone() }
    })
};

export const analyticsAPI = {
    getOverview: () => api.get<AnalyticsData>('/api/analytics/overview', {
        params: { phoneNumber: getUserPhone() }
    })
};
```

## Environment Setup

### Add to `/dashboard/.env`

```bash
# Testing phone number (should be an admin in the database)
VITE_TEST_PHONE_NUMBER=9876543210
```

### Add to `/dashboard/.env.example`

```bash
# API Configuration
VITE_API_URL=http://localhost:3000

# Testing phone number (use an admin account for testing)
VITE_TEST_PHONE_NUMBER=your_admin_phone_number
```

## Using with Axios Interceptors

### Update `/dashboard/src/lib/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 10000,
});

// Add phone number to every request automatically
api.interceptors.request.use((config) => {
    const userPhone = localStorage.getItem('userPhone') || 
                     import.meta.env.VITE_TEST_PHONE_NUMBER;
    
    if (userPhone) {
        // Add to query params for GET requests
        if (config.method === 'get') {
            config.params = {
                ...config.params,
                phoneNumber: userPhone
            };
        }
        
        // Add to body for POST/PUT requests
        if (config.method === 'post' || config.method === 'put') {
            config.data = {
                ...config.data,
                phoneNumber: userPhone
            };
        }
    }
    
    return config;
});

// Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // User not authenticated
            console.error('Authentication failed:', error.response.data);
            // Redirect to login or show error
        } else if (error.response?.status === 403) {
            // User doesn't have permission
            console.error('Access denied:', error.response.data);
            // Show permission error
        }
        return Promise.reject(error);
    }
);

export default api;
```

## Response Handling

### Success Responses

```typescript
// All responses remain the same
{
    "data": [...],
    "pagination": {...}
}
```

### Error Responses

#### 401 Unauthorized (No phone or user not found)

```json
{
    "success": false,
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Authentication required: No user or phone number provided"
    }
}
```

**Frontend Handling**:
```typescript
if (error.response?.status === 401) {
    // Redirect to login or show "Please provide phone number"
    navigate('/login');
}
```

#### 403 Forbidden (Wrong role)

```json
{
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "Access denied. This action requires one of: admin, super_admin",
        "userRole": "member",
        "allowedRoles": ["admin", "super_admin"]
    }
}
```

**Frontend Handling**:
```typescript
if (error.response?.status === 403) {
    const { userRole, allowedRoles } = error.response.data.error;
    toast.error(`You need ${allowedRoles.join(' or ')} role. Current role: ${userRole}`);
}
```

## Testing Without Login Page

### Quick Test Setup

1. **Add phone number to localStorage** (browser console):
```javascript
localStorage.setItem('userPhone', '9876543210');
```

2. **Or use environment variable** (`.env`):
```bash
VITE_TEST_PHONE_NUMBER=9876543210
```

3. **Verify in database** that this phone has admin role:
```sql
-- Check your role
SELECT name, phone, role FROM community_members WHERE phone = '9876543210';

-- Update to admin if needed
UPDATE community_members SET role = 'admin' WHERE phone = '9876543210';
```

## Common Scenarios

### Scenario 1: Dashboard Load

```typescript
// Dashboard.tsx
const { data: analytics, error } = useQuery(['analytics'], 
    () => analyticsAPI.getOverview()
    // phoneNumber automatically added by interceptor
);

if (error?.response?.status === 403) {
    return <div>You need admin access to view this dashboard</div>;
}
```

### Scenario 2: Create Member

```typescript
// MemberForm.tsx
const createMutation = useMutation(
    (newMember) => memberAPI.create(newMember),
    // phoneNumber automatically added by interceptor
    {
        onError: (error) => {
            if (error.response?.status === 403) {
                toast.error('You need admin role to create members');
            }
        }
    }
);
```

### Scenario 3: Delete Member

```typescript
// Members.tsx
const deleteMutation = useMutation(
    (id) => memberAPI.delete(id),
    // phoneNumber automatically added by interceptor
    {
        onError: (error) => {
            if (error.response?.status === 403) {
                const { allowedRoles } = error.response.data.error;
                toast.error(`Only ${allowedRoles.join(', ')} can delete members`);
            }
        }
    }
);
```

## Role Requirements by Endpoint

| Endpoint | Required Role | Your Phone Should Have |
|----------|--------------|----------------------|
| GET /api/members | admin, super_admin | admin or super_admin |
| GET /api/members/:id | any (member+) | any role |
| POST /api/members | admin, super_admin | admin or super_admin |
| PUT /api/members/:id | admin, super_admin | admin or super_admin |
| DELETE /api/members/:id | super_admin | super_admin only |
| GET /api/analytics/overview | admin, super_admin | admin or super_admin |

## Troubleshooting

### Issue 1: Getting 401 Errors

**Problem**: No phone number being sent

**Solution**:
```typescript
// Check if phone number is set
console.log('User phone:', localStorage.getItem('userPhone'));
console.log('Env phone:', import.meta.env.VITE_TEST_PHONE_NUMBER);

// Set manually if needed
localStorage.setItem('userPhone', '9876543210');
```

### Issue 2: Getting 403 Errors (Wrong Role)

**Problem**: Your phone number doesn't have the right role in database

**Solution**:
```sql
-- Check your role in database
SELECT phone, name, role FROM community_members WHERE phone = '9876543210';

-- Update to admin
UPDATE community_members SET role = 'admin' WHERE phone = '9876543210';
```

### Issue 3: User Not Found

**Problem**: Phone number not in database

**Solution**:
```sql
-- Insert yourself into database
INSERT INTO community_members (phone, name, email, role)
VALUES ('9876543210', 'Your Name', 'your@email.com', 'admin');
```

### Issue 4: Phone Number Format Mismatch

**Problem**: Database has phone with country code, but sending without (or vice versa)

**Solution**:
```typescript
// Normalize phone number format
const normalizePhone = (phone: string) => {
    return phone.replace(/^\+91/, '').replace(/^91/, '');
};

localStorage.setItem('userPhone', normalizePhone('9876543210'));
```

## Migration Checklist

- [ ] Update API client to include phone number
- [ ] Add axios interceptors for automatic phone number
- [ ] Set up environment variable `VITE_TEST_PHONE_NUMBER`
- [ ] Verify test phone number exists in database with admin role
- [ ] Add error handling for 401/403 responses
- [ ] Test all CRUD operations
- [ ] Update error messages to show role requirements
- [ ] Clear old auth tokens/sessions if any

## Next Steps

1. **Week 4**: Build proper login page
2. **Week 5**: Add JWT token authentication
3. **Week 6**: Implement role management UI

---

**Ready to test!** 🚀  
Just add a phone number and the backend handles the rest!
