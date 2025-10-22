# Frontend API Integration - Smart Auth Update ✅

**Date**: October 22, 2025  
**Status**: Complete and Ready for Testing

## Summary

Updated the dashboard frontend to integrate with the new smart auth middleware. The frontend now automatically sends phone numbers with every request, and the backend validates roles from the database.

## Files Modified/Created

### 1. **`/dashboard/src/lib/api.ts`** - API Client (Modified)

**Changes**:
- ✅ Added `getUserPhone()` helper function
- ✅ Updated request interceptor to add phone number automatically
- ✅ GET/DELETE: Phone in query params
- ✅ POST/PUT/PATCH: Phone in request body
- ✅ Improved error handling for 401/403 responses
- ✅ Maintained backward compatibility with token-based auth

**Key Features**:
```typescript
// Automatically adds phone number to all requests
api.interceptors.request.use((config) => {
    const phoneNumber = getUserPhone();
    
    if (phoneNumber) {
        // GET/DELETE: Add to query params
        if (config.method === 'get' || config.method === 'delete') {
            config.params = { ...config.params, phoneNumber };
        }
        
        // POST/PUT/PATCH: Add to body
        if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
            config.data = { ...config.data, phoneNumber };
        }
    }
    
    return config;
});
```

### 2. **`/dashboard/src/lib/auth.ts`** - Auth Utilities (Created)

**New Helper Functions**:
- `getUserPhone()` - Get current user's phone number
- `setUserPhone(phone)` - Set phone number in localStorage
- `clearUserPhone()` - Remove phone number
- `getUserContext()` - Get full user context (phone, role, name)
- `setUserContext(context)` - Set user context
- `clearUserContext()` - Clear all user data
- `isAuthenticated()` - Check if user has phone set
- `formatPhone(phone)` - Format phone for display (+91 98765 43210)
- `normalizePhone(phone)` - Normalize phone (remove formatting)

### 3. **`/dashboard/src/components/PhoneSetter.tsx`** - Testing Component (Created)

**Purpose**: Development tool to set phone number before proper login is built

**Features**:
- Modal that appears if no phone is set
- Phone number input with validation
- Sets phone in localStorage
- Shows current phone in top-right corner
- Can clear and change phone number
- Will be replaced with login page in Week 4

### 4. **`/dashboard/src/App.tsx`** - Main App (Modified)

**Changes**:
- ✅ Integrated PhoneSetter component
- ✅ Shows phone setter if no phone is set
- ✅ Tracks authentication state

### 5. **`/dashboard/src/components/Layout.tsx`** - Layout (Modified)

**Changes**:
- ✅ Displays current phone number in header
- ✅ Updated logout to clear phone context
- ✅ Shows formatted phone number with icon

### 6. **Environment Files** (Modified)

**`/dashboard/.env`**:
```bash
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=9876543210
```

**`/dashboard/.env.example`**:
```bash
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=your_admin_phone_number
```

## How It Works

### Authentication Flow

```
1. User opens dashboard
   ↓
2. App checks if phone number exists (localStorage or env)
   ↓
3a. No phone → Show PhoneSetter modal
   ↓
3b. Yes phone → Show dashboard
   ↓
4. API call made (e.g., GET /api/members)
   ↓
5. Interceptor adds phoneNumber to request
   ↓
6. Backend middleware validates:
   - Extracts phone from request
   - Queries database for user
   - Validates role
   - Grants/denies access
   ↓
7. Frontend receives response:
   - 200: Success
   - 401: User not found/no phone
   - 403: Insufficient permissions
```

### Request Examples

#### Before (Week 3)
```typescript
// Had to manually manage everything
const response = await axios.get('/api/members');
// ❌ No authentication, would fail
```

#### After (Smart Auth)
```typescript
// Set phone once
localStorage.setItem('userPhone', '9876543210');

// Make request - phone added automatically
const response = await axios.get('/api/members');
// ✅ Interceptor adds: ?phoneNumber=9876543210
// ✅ Backend validates role from database
```

## Testing Instructions

### Step 1: Set Up Test Phone in Database

```sql
-- Check if test user exists
SELECT phone, name, role FROM community_members WHERE phone = '9876543210';

-- If not exists, create one
INSERT INTO community_members (phone, name, email, role)
VALUES ('9876543210', 'Test Admin', 'admin@test.com', 'admin');

-- Or update existing user to admin
UPDATE community_members 
SET role = 'admin' 
WHERE phone = '9876543210';
```

### Step 2: Update Environment Variable

```bash
# /dashboard/.env
VITE_TEST_PHONE_NUMBER=9876543210
```

### Step 3: Start Servers

```bash
# Terminal 1: Backend
cd Server
npm run dev

# Terminal 2: Dashboard
cd dashboard
npm run dev
```

### Step 4: Test Dashboard

1. **Open** `http://localhost:5173`
2. **PhoneSetter modal appears**
3. **Enter** phone number: `9876543210`
4. **Click** "Set Phone Number"
5. **Dashboard loads** with data
6. **Check** top-right corner for phone display

### Step 5: Test API Calls

**Browser Console**:
```javascript
// Check what's stored
console.log('Phone:', localStorage.getItem('userPhone'));

// Test API call
fetch('http://localhost:3000/api/members?phoneNumber=9876543210')
  .then(r => r.json())
  .then(d => console.log('Members:', d));
```

## Error Handling

### Error 1: 401 Unauthorized

**When**: No phone provided or user not in database

**Frontend Response**:
```javascript
// Interceptor logs error and clears auth
console.error('Authentication failed:', error.response.data);
// Shows: "Please set phone number for testing..."
```

**User Action**: Set valid phone number via PhoneSetter

### Error 2: 403 Forbidden

**When**: User doesn't have required role/permission

**Frontend Response**:
```javascript
// Interceptor logs detailed error
console.error('Access denied:', {
    message: "Access denied. This action requires one of: admin, super_admin",
    userRole: "member",
    requiredRoles: ["admin", "super_admin"]
});
```

**User Action**: Use phone number with correct role

### Error 3: Phone Setter Not Appearing

**Cause**: Phone already set in localStorage or environment

**Solution**:
```javascript
// Clear phone to trigger setter
localStorage.removeItem('userPhone');
// Reload page
location.reload();
```

## UI Components

### PhoneSetter Modal

**Appearance**: Full-screen overlay with centered card

**Features**:
- Phone input with validation
- Enter key support
- Error messages
- Help text with tips
- Default suggestions

**Validation**:
- Must be 10 or 12 digits
- Normalizes to 10 digits
- Removes country code if present

### User Info Display (Header)

**Appearance**: Blue card in top-right corner

**Shows**:
- Phone icon
- Formatted phone number
- Close button to change phone

**Interaction**:
- Click X to clear phone
- Reopens PhoneSetter modal

## API Calls Reference

### Members API

```typescript
// Get all members
memberAPI.getAll()
// Request: GET /api/members?phoneNumber=9876543210

// Get by ID
memberAPI.getById('123')
// Request: GET /api/members/123?phoneNumber=9876543210

// Create member
memberAPI.create({ name: 'John', email: 'john@example.com' })
// Request: POST /api/members
// Body: { name: 'John', email: 'john@example.com', phoneNumber: '9876543210' }

// Update member
memberAPI.update('123', { name: 'Jane' })
// Request: PUT /api/members/123
// Body: { name: 'Jane', phoneNumber: '9876543210' }

// Delete member
memberAPI.delete('123')
// Request: DELETE /api/members/123?phoneNumber=9876543210
```

### Analytics API

```typescript
// Get overview
analyticsAPI.getOverview()
// Request: GET /api/analytics/overview?phoneNumber=9876543210
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| PhoneSetter doesn't appear | Phone in localStorage/env | Clear localStorage and reload |
| 401 errors | Phone not in database | Add user to database with SQL |
| 403 errors | User has wrong role | Update role to 'admin' in database |
| Dashboard blank | API errors | Check browser console and server logs |
| Phone not sending | Interceptor issue | Check Network tab, verify phone in request |

### Debug Commands

```javascript
// Browser Console

// Check current state
console.log('Phone:', localStorage.getItem('userPhone'));
console.log('Env phone:', import.meta.env.VITE_TEST_PHONE_NUMBER);

// Test phone functions
import { getUserPhone, formatPhone } from '@/lib/auth';
console.log('Current phone:', getUserPhone());
console.log('Formatted:', formatPhone('9876543210'));

// Clear and reset
localStorage.clear();
location.reload();

// Manually set phone
localStorage.setItem('userPhone', '9876543210');
location.reload();
```

## Development Workflow

### Daily Development

1. **Start with phone set** in `.env`:
   ```bash
   VITE_TEST_PHONE_NUMBER=your_phone
   ```

2. **Dashboard loads automatically** (no modal)

3. **All API calls work** with your phone/role

4. **Change phone** by clicking X in header

### Testing Different Roles

```javascript
// Test as admin
localStorage.setItem('userPhone', '9876543210'); // admin phone
location.reload();

// Test as member
localStorage.setItem('userPhone', '1111111111'); // member phone
location.reload();

// Test as super_admin
localStorage.setItem('userPhone', '5555555555'); // super_admin phone
location.reload();
```

## Next Steps

### Week 4 Tasks
1. ✅ Frontend integrated with smart auth
2. 🔄 Test end-to-end with backend
3. 📋 Build proper login page (Week 4)
4. 📋 Add OTP verification (Week 4)
5. 📋 Replace PhoneSetter with real auth (Week 4)

### Future Enhancements
1. Add role display in header
2. Add user profile dropdown
3. Add session timeout handling
4. Add "Remember me" functionality
5. Add JWT token support

## Benefits

### For Developers
- ✅ No manual phone management
- ✅ Automatic authentication
- ✅ Clear error messages
- ✅ Easy testing with multiple roles

### For Testing
- ✅ Quick role switching
- ✅ No complex auth setup needed
- ✅ Environment variable support
- ✅ Clear visual feedback

### For Users (Future)
- ✅ Simple phone-based login
- ✅ No passwords to remember
- ✅ Quick OTP verification
- ✅ Secure role-based access

## Summary Checklist

- [x] API client updated with phone interceptors
- [x] Auth utility functions created
- [x] PhoneSetter component created
- [x] Layout updated with phone display
- [x] Environment variables configured
- [x] Error handling improved
- [x] Documentation complete
- [ ] Backend server running
- [ ] Test with real API calls
- [ ] Verify all CRUD operations work

---

**Ready to Test!** 🚀

1. Set `VITE_TEST_PHONE_NUMBER` in `.env`
2. Start backend: `cd Server && npm run dev`
3. Start dashboard: `cd dashboard && npm run dev`
4. Open `http://localhost:5173`
5. Enter your admin phone number
6. Start testing!
