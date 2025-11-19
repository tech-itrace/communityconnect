# Authentication Bypass Feature Flag

## Overview

A feature flag system has been implemented to bypass authentication during development and testing. This is particularly useful for testing with Postman or other API clients without needing to manage authentication tokens or phone numbers.

## Configuration

The feature is controlled by two environment variables in your `.env` file:

### 1. SKIP_AUTHENTICATION

Enables or disables the authentication bypass.

- **Values**: `true` or `false`
- **Default**: `false`
- **Usage**: Set to `true` to bypass all authentication checks

```env
SKIP_AUTHENTICATION=true
```

### 2. DEFAULT_TEST_ROLE

Specifies the role to use when authentication is bypassed.

- **Values**: `member`, `admin`, or `super_admin`
- **Default**: `super_admin`
- **Usage**: Set the role that will be assigned to the test user

```env
DEFAULT_TEST_ROLE=super_admin
```

## How It Works

When `SKIP_AUTHENTICATION=true`, all authentication middleware functions will:

1. Skip all authentication checks
2. Create a test user with these properties:
   - `userId`: `test-user-id`
   - `phoneNumber`: `0000000000`
   - `memberName`: `Test User`
   - `role`: Value from `DEFAULT_TEST_ROLE`
3. Attach the test user to `req.user`
4. Allow the request to proceed

## Affected Middleware

The following middleware functions respect the `SKIP_AUTHENTICATION` flag:

- `requireRole(role)` - Bypasses role-specific checks
- `requireAnyRole(roles[])` - Bypasses multi-role checks
- `requirePermission(permission)` - Bypasses permission checks
- `requireOwnership(getResourceOwnerId)` - Bypasses ownership verification

## Usage Examples

### Example 1: Testing Community Creation

With authentication bypass enabled, you can create a community without providing phone numbers:

```bash
POST http://localhost:3000/api/community
Content-Type: application/json

{
  "name": "Test Community",
  "description": "A test community"
}
```

No `phoneNumber` field is required in the request body.

### Example 2: Testing Member Operations

Add members, search, and perform other operations without authentication:

```bash
POST http://localhost:3000/api/community/:id/members
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "1234567890",
  "profile": {
    "city": "New York"
  }
}
```

### Example 3: Testing with Different Roles

To test with different permission levels, change the `DEFAULT_TEST_ROLE`:

**As Admin:**
```env
SKIP_AUTHENTICATION=true
DEFAULT_TEST_ROLE=admin
```

**As Member:**
```env
SKIP_AUTHENTICATION=true
DEFAULT_TEST_ROLE=member
```

**As Super Admin:**
```env
SKIP_AUTHENTICATION=true
DEFAULT_TEST_ROLE=super_admin
```

## Role Permissions

Different roles have different permissions:

| Permission | member | admin | super_admin |
|-----------|--------|-------|-------------|
| canSearch | ✓ | ✓ | ✓ |
| canViewProfile | ✓ | ✓ | ✓ |
| canUpdateOwnProfile | ✓ | ✓ | ✓ |
| canAddMembers | ✗ | ✓ | ✓ |
| canEditMembers | ✗ | ✓ | ✓ |
| canDeleteMembers | ✗ | ✗ | ✓ |
| canViewAnalytics | ✗ | ✓ | ✓ |
| canManageAdmins | ✗ | ✗ | ✓ |

## Logs

When authentication bypass is active, you'll see warning logs in the console:

```
[Authorize] ⚠️  SKIP_AUTHENTICATION enabled - bypassing auth with role: super_admin
```

This helps you remember that authentication is disabled.

## Security Warnings

### ⚠️ CRITICAL: Never Enable in Production

**NEVER** set `SKIP_AUTHENTICATION=true` in production environments. This completely disables all authentication and authorization checks, allowing anyone to access all endpoints with full permissions.

### Best Practices

1. **Only use in local development** - Never commit `.env` with `SKIP_AUTHENTICATION=true`
2. **Default to false** - Keep it disabled by default in `.env.example`
3. **Environment check** - Consider adding NODE_ENV check to prevent accidental production use
4. **Remove before deployment** - Ensure this flag is set to `false` or removed before deploying

### Additional Safeguards

Consider adding this check to your server startup in [server.ts](Server/src/server.ts):

```typescript
if (process.env.NODE_ENV === 'production' && SKIP_AUTHENTICATION) {
  console.error('❌ FATAL: SKIP_AUTHENTICATION cannot be enabled in production!');
  process.exit(1);
}
```

## Testing Your Setup

1. **Enable the feature flag** in `.env`:
   ```env
   SKIP_AUTHENTICATION=true
   DEFAULT_TEST_ROLE=super_admin
   ```

2. **Restart your server**:
   ```bash
   npm run dev
   ```

3. **Test with Postman**:
   - Import your Postman collection
   - Remove any `phoneNumber` fields from request bodies
   - Send requests to authenticated endpoints
   - You should see success responses

4. **Check the logs**:
   - Look for warning messages indicating bypass is active
   - Verify the test user role is being used

## Disabling the Feature

To disable authentication bypass:

1. **Update `.env`**:
   ```env
   SKIP_AUTHENTICATION=false
   ```

2. **Restart the server**

3. **Update Postman requests** to include proper authentication (phone numbers)

## Related Files

- Configuration: [src/config/index.ts](Server/src/config/index.ts)
- Middleware: [src/middlewares/authorize.ts](Server/src/middlewares/authorize.ts)
- Environment template: [.env.example](Server/.env.example)
- Types: [src/utils/types.ts](Server/src/utils/types.ts)

## Troubleshooting

### Issue: Still getting authentication errors

**Solution**:
- Verify `SKIP_AUTHENTICATION=true` in `.env` (not `.env.example`)
- Restart the server after changing `.env`
- Check console logs for the bypass warning message

### Issue: Getting permission denied errors

**Solution**:
- Check your `DEFAULT_TEST_ROLE` setting
- Ensure it has sufficient permissions for the operation
- Use `super_admin` for full access

### Issue: Feature not working in production

**Solution**:
- This is intentional - never use this in production
- Use proper authentication mechanisms instead
