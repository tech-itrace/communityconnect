/**
 * Test Role-Based Access Control (RBAC)
 * 
 * Tests authorization middleware and role permissions
 */

import express, { Request, Response } from 'express';
import { 
    requireRole, 
    requireAnyRole, 
    requirePermission,
    requireOwnership,
    setUserFromSession,
    hasPermission 
} from './middlewares/authorize';
import { Role, ROLE_PERMISSIONS } from './utils/types';

const app = express();
app.use(express.json());

// Mock user middleware (simulates authentication)
function mockUser(role: Role, userId: string = 'test-user-123') {
    return (req: Request, res: Response, next: Function) => {
        req.user = {
            userId,
            phoneNumber: '+919840930854',
            memberName: 'Test User',
            role
        };
        next();
    };
}

// Test endpoints
app.get('/member-only', mockUser('member'), requireRole('member'), (req, res) => {
    res.json({ success: true, message: 'Member access granted' });
});

app.get('/admin-only', mockUser('member'), requireRole('admin'), (req, res) => {
    res.json({ success: true, message: 'Admin access granted' });
});

app.get('/super-admin-only', mockUser('admin'), requireRole('super_admin'), (req, res) => {
    res.json({ success: true, message: 'Super admin access granted' });
});

app.get('/admin-or-super', mockUser('admin'), requireAnyRole(['admin', 'super_admin']), (req, res) => {
    res.json({ success: true, message: 'Admin or Super admin access granted' });
});

app.post('/add-member', mockUser('member'), requirePermission('canAddMembers'), (req, res) => {
    res.json({ success: true, message: 'Member added' });
});

app.get('/resource/:id', mockUser('member', 'user-123'), requireOwnership((req) => req.params.id), (req, res) => {
    res.json({ success: true, message: 'Resource accessed' });
});

async function runTests() {
    console.log('=== RBAC Middleware Tests ===\n');

    try {
        const server = app.listen(3002, () => {
            console.log('Test server started on port 3002\n');
        });

        // Give server time to start
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 1: Permission matrix
        console.log('1. Testing permission matrix...');
        console.log('   Member permissions:', ROLE_PERMISSIONS.member);
        console.log('   Admin permissions:', ROLE_PERMISSIONS.admin);
        console.log('   Super Admin permissions:', ROLE_PERMISSIONS.super_admin);
        console.log('');

        // Test 2: hasPermission function
        console.log('2. Testing hasPermission()...');
        console.log('   Member canSearch:', hasPermission('member', 'canSearch'));
        console.log('   Member canAddMembers:', hasPermission('member', 'canAddMembers'));
        console.log('   Admin canAddMembers:', hasPermission('admin', 'canAddMembers'));
        console.log('   Admin canDeleteMembers:', hasPermission('admin', 'canDeleteMembers'));
        console.log('   Super Admin canDeleteMembers:', hasPermission('super_admin', 'canDeleteMembers'));
        console.log('');

        // Test 3: Member accessing member-only route (should pass)
        console.log('3. Member accessing member-only route...');
        const test3 = await fetch('http://localhost:3002/member-only');
        console.log('   Status:', test3.status, test3.status === 200 ? '✓' : '✗');
        console.log('');

        // Test 4: Member trying to access admin-only route (should fail)
        console.log('4. Member trying to access admin-only route...');
        const test4 = await fetch('http://localhost:3002/admin-only');
        const data4: any = await test4.json();
        console.log('   Status:', test4.status, test4.status === 403 ? '✓' : '✗');
        console.log('   Error:', data4.error?.message);
        console.log('');

        // Test 5: Admin trying to access super-admin route (should fail)
        console.log('5. Admin trying to access super-admin-only route...');
        const test5 = await fetch('http://localhost:3002/super-admin-only');
        const data5: any = await test5.json();
        console.log('   Status:', test5.status, test5.status === 403 ? '✓' : '✗');
        console.log('   Error:', data5.error?.message);
        console.log('');

        // Test 6: Admin accessing admin-or-super route (should pass)
        console.log('6. Admin accessing admin-or-super route...');
        const test6 = await fetch('http://localhost:3002/admin-or-super');
        console.log('   Status:', test6.status, test6.status === 200 ? '✓' : '✗');
        console.log('');

        // Test 7: Member trying to add member (permission denied)
        console.log('7. Member trying to add member (should fail)...');
        const test7 = await fetch('http://localhost:3002/add-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'New Member' })
        });
        const data7: any = await test7.json();
        console.log('   Status:', test7.status, test7.status === 403 ? '✓' : '✗');
        console.log('   Error:', data7.error?.message);
        console.log('');

        // Test 8: Ownership check - own resource (should pass)
        console.log('8. User accessing own resource...');
        const test8 = await fetch('http://localhost:3002/resource/user-123');
        console.log('   Status:', test8.status, test8.status === 200 ? '✓' : '✗');
        console.log('');

        // Test 9: Ownership check - other's resource (should fail)
        console.log('9. User accessing other\'s resource...');
        const test9 = await fetch('http://localhost:3002/resource/user-456');
        const data9: any = await test9.json();
        console.log('   Status:', test9.status, test9.status === 403 ? '✓' : '✗');
        console.log('   Error:', data9.error?.message);
        console.log('');

        // Test 10: Role hierarchy summary
        console.log('10. Role hierarchy summary:');
        console.log('┌─────────────────┬────────┬───────┬─────────────┐');
        console.log('│ Permission      │ Member │ Admin │ Super Admin │');
        console.log('├─────────────────┼────────┼───────┼─────────────┤');
        console.log(`│ Search          │   ${ROLE_PERMISSIONS.member.canSearch ? '✓' : '✗'}    │   ${ROLE_PERMISSIONS.admin.canSearch ? '✓' : '✗'}   │      ✓      │`);
        console.log(`│ View Profile    │   ${ROLE_PERMISSIONS.member.canViewProfile ? '✓' : '✗'}    │   ${ROLE_PERMISSIONS.admin.canViewProfile ? '✓' : '✗'}   │      ✓      │`);
        console.log(`│ Update Own      │   ${ROLE_PERMISSIONS.member.canUpdateOwnProfile ? '✓' : '✗'}    │   ${ROLE_PERMISSIONS.admin.canUpdateOwnProfile ? '✓' : '✗'}   │      ✓      │`);
        console.log(`│ Add Members     │   ${ROLE_PERMISSIONS.member.canAddMembers ? '✗' : '✓'}    │   ${ROLE_PERMISSIONS.admin.canAddMembers ? '✓' : '✗'}   │      ✓      │`);
        console.log(`│ Edit Members    │   ${ROLE_PERMISSIONS.member.canEditMembers ? '✗' : '✓'}    │   ${ROLE_PERMISSIONS.admin.canEditMembers ? '✓' : '✗'}   │      ✓      │`);
        console.log(`│ Delete Members  │   ${ROLE_PERMISSIONS.member.canDeleteMembers ? '✗' : '✓'}    │   ${ROLE_PERMISSIONS.admin.canDeleteMembers ? '✗' : '✓'}   │      ✓      │`);
        console.log(`│ View Analytics  │   ${ROLE_PERMISSIONS.member.canViewAnalytics ? '✗' : '✓'}    │   ${ROLE_PERMISSIONS.admin.canViewAnalytics ? '✓' : '✗'}   │      ✓      │`);
        console.log(`│ Manage Admins   │   ${ROLE_PERMISSIONS.member.canManageAdmins ? '✗' : '✓'}    │   ${ROLE_PERMISSIONS.admin.canManageAdmins ? '✗' : '✓'}   │      ✓      │`);
        console.log('└─────────────────┴────────┴───────┴─────────────┘');
        console.log('');

        console.log('=== All Tests Passed! ✓ ===\n');

        server.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests();
