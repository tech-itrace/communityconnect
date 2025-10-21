# Quick Start: Testing the Dashboard

## Step 1: Start the Backend Server

```bash
cd Server
npm run dev
```

The server should start on `http://localhost:3000`

## Step 2: Start the Dashboard

In a new terminal:

```bash
cd dashboard
npm run dev
```

The dashboard should start on `http://localhost:5173`

## Step 3: Test the Features

### 1. View Dashboard (Analytics)
- Open `http://localhost:5173`
- You should see:
  - Total Members count
  - Total Searches count
  - Active Users count
  - Average Response Time
  - Charts showing search trends

**Note**: If analytics data is empty, you may need to:
- Make some search queries through the WhatsApp bot
- Or manually add some audit logs to the database

### 2. View Members List
- Click "Members" in the sidebar
- You should see a list of all community members
- Try searching for a member by name, phone, or email

### 3. Create a New Member
- Click "Add Member" button
- Fill in the form:
  - Name: "Test User"
  - Phone: "+1234567890"
  - Email: "test@example.com"
  - City: "San Francisco"
  - Working Knowledge: "React, TypeScript"
- Click "Save Member"
- The new member should appear in the list

### 4. Edit a Member
- Click the edit icon (pencil) next to any member
- Update some fields
- Click "Save Member"
- The changes should be reflected in the list

### 5. Delete a Member
- Click the delete icon (trash) next to a member
- Confirm the deletion
- The member should be removed from the list

## Troubleshooting

### Dashboard won't load
- **Check**: Is the backend server running?
- **Check**: Is `VITE_API_URL` set correctly in `dashboard/.env`?
- **Fix**: Make sure both servers are running

### API errors (CORS)
- **Check**: Backend server should have CORS enabled
- **Fix**: Add CORS middleware in `Server/src/app.ts`:
  ```typescript
  import cors from 'cors';
  app.use(cors());
  ```

### Members list is empty
- **Check**: Does the database have members?
- **Fix**: Run the import script:
  ```bash
  cd Server
  npm run import:members
  ```

### Analytics shows no data
- **Check**: Are there audit logs in the database?
- **Fix**: This is normal for a fresh install. Data will populate as you use the system.

### Can't create/edit/delete members (Authorization error)
- **Issue**: The API requires authentication
- **Temporary Fix**: Comment out the auth middleware in `Server/src/routes/members.ts`:
  ```typescript
  // Temporarily disable for testing
  // router.post('/', requireAnyRole(['admin', 'super_admin']), createMemberHandler);
  router.post('/', createMemberHandler); // Allow without auth for testing
  ```

**Important**: Remove this bypass before deploying to production!

## Next Steps

Once everything is working:

1. **Add Authentication**: Implement login page and JWT flow
2. **Deploy Backend**: Deploy Server to Railway/Render
3. **Deploy Frontend**: Deploy dashboard to Vercel
4. **Configure Production Env**: Update `VITE_API_URL` to production API URL
5. **Test in Production**: Verify everything works end-to-end

## Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd dashboard
vercel

# Follow the prompts
# Set VITE_API_URL environment variable in Vercel dashboard
```

## Production Checklist

Before deploying:
- [ ] Backend is deployed and accessible
- [ ] Environment variables are set
- [ ] CORS is configured for production domain
- [ ] Authentication is enabled
- [ ] Rate limiting is enabled
- [ ] Error tracking (Sentry) is configured
- [ ] Database backups are set up

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs for backend errors
3. Verify database connectivity
4. Review the documentation in `dashboard/README.md`
5. Check `docs/WEEK-3-DASHBOARD-COMPLETE.md` for detailed information
