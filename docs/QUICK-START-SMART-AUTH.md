# 🚀 Quick Start Guide - Smart Auth Dashboard

## 5-Minute Setup

### 1. Database Setup (2 min)
```sql
-- Create test admin
INSERT INTO community_members (phone, name, email, role)
VALUES ('9876543210', 'Test Admin', 'admin@test.com', 'admin');
```

### 2. Environment Setup (1 min)
```bash
# /dashboard/.env
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=9876543210
```

### 3. Start Servers (2 min)
```bash
# Terminal 1: Backend
cd Server
npm run dev

# Terminal 2: Dashboard
cd dashboard
npm run dev
```

### 4. Open & Test
- Open: `http://localhost:5173`
- Enter phone: `9876543210`
- ✅ Done!

---

## Key Features

| Feature | How It Works |
|---------|--------------|
| **Auto Auth** | Phone sent with every request |
| **Role Validation** | Backend checks DB automatically |
| **Phone Display** | Shows in top-right corner |
| **Easy Testing** | Set phone once, test all features |

---

## Quick Commands

### Browser Console

```javascript
// Check current phone
localStorage.getItem('userPhone')

// Set phone
localStorage.setItem('userPhone', '9876543210')

// Clear auth
localStorage.clear()

// Reload
location.reload()
```

### Database Queries

```sql
-- Check roles
SELECT phone, name, role FROM community_members;

-- Update to admin
UPDATE community_members SET role = 'admin' WHERE phone = '9876543210';

-- Add new admin
INSERT INTO community_members (phone, name, email, role)
VALUES ('1234567890', 'New Admin', 'new@admin.com', 'admin');
```

---

## Testing Different Roles

```javascript
// Test as admin (can view, create, edit)
localStorage.setItem('userPhone', '9876543210');

// Test as super_admin (can delete)
localStorage.setItem('userPhone', '5555555555');

// Test as member (limited access)
localStorage.setItem('userPhone', '1111111111');

// Reload after each change
location.reload();
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Modal doesn't show | `localStorage.clear()` then reload |
| 401 errors | Add user to database |
| 403 errors | Update role to 'admin' |
| Blank dashboard | Check console & backend logs |

---

## API Calls Reference

```typescript
// All automatically include phoneNumber

memberAPI.getAll()           // GET with ?phoneNumber=...
memberAPI.create(data)       // POST with phoneNumber in body
memberAPI.update(id, data)   // PUT with phoneNumber in body
memberAPI.delete(id)         // DELETE with ?phoneNumber=...
```

---

## File Locations

```
dashboard/
├── src/
│   ├── lib/
│   │   ├── api.ts          ← API client with interceptors
│   │   └── auth.ts         ← Phone management helpers
│   ├── components/
│   │   ├── PhoneSetter.tsx ← Test phone input
│   │   └── Layout.tsx      ← Shows phone in header
│   └── App.tsx             ← Integrates PhoneSetter
└── .env                    ← Phone config
```

---

## What Changed?

### Backend
- Middleware validates role from DB automatically
- No need to send role from frontend
- Accepts phone from body/query/WhatsApp

### Frontend
- Interceptor adds phone to all requests
- PhoneSetter for easy testing
- Phone displayed in header
- Smart error handling

---

## Next Steps

- [ ] Test all CRUD operations
- [ ] Try different roles
- [ ] Verify error handling
- [ ] Check backend logs
- [ ] Week 4: Build real login page

---

## Documentation

- `/docs/WEEK-3-FRONTEND-AUTH-COMPLETE.md` - Full frontend guide
- `/docs/SMART-AUTH-COMPLETE.md` - Backend overview
- `/docs/MIDDLEWARE-SMART-AUTH-UPDATE.md` - Technical details
- `/docs/FRONTEND-AUTH-INTEGRATION.md` - Integration guide

---

## Success Criteria ✅

You're ready when:
- ✅ Dashboard loads without errors
- ✅ Members list shows data
- ✅ Can create new member
- ✅ Can edit existing member
- ✅ Phone shows in header
- ✅ Console shows no errors

---

**Need Help?** Check the docs or search logs for error messages.

**Working?** 🎉 Congratulations! Week 3 complete!
