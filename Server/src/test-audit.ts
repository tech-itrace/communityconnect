/**
 * Test Audit Logging System
 * 
 * Tests audit service, middleware, and database integration
 */

import {
    logAction,
    logRoleChange,
    logPermissionDenial,
    logMemberAction,
    logSearch,
    logAuth,
    getAuditLogs,
    getAuditStats,
    getMostActiveUsers,
    exportAuditReport
} from './services/auditService';

async function runTests() {
    console.log('=== Audit Logging Tests ===\n');

    try {
        let testsPassed = 0;
        let testsFailed = 0;

        // Test 1: Log basic action
        console.log('1. Testing logAction()...');
        await logAction({
            phone: '+919840930854',
            userName: 'Test User',
            userRole: 'member',
            action: 'test.action',
            status: 'success'
        });
        console.log('   ✓ Action logged successfully\n');
        testsPassed++;

        // Wait a bit for database write
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 2: Log role change
        console.log('2. Testing logRoleChange()...');
        await logRoleChange(
            '+919840930854',
            'Admin User',
            'super_admin',
            '+911234567890',
            'Test Member',
            'member',
            'admin',
            '127.0.0.1'
        );
        console.log('   ✓ Role change logged\n');
        testsPassed++;

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 3: Log permission denial
        console.log('3. Testing logPermissionDenial()...');
        await logPermissionDenial(
            '+911234567890',
            'Test Member',
            'member',
            'member.delete',
            'member',
            'Member role lacks permission',
            '127.0.0.1'
        );
        console.log('   ✓ Permission denial logged\n');
        testsPassed++;

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 4: Log member action
        console.log('4. Testing logMemberAction()...');
        await logMemberAction(
            '+919840930854',
            'Admin User',
            'admin',
            'member.update',
            '+911234567890',
            { name: 'Old Name' },
            { name: 'New Name' },
            '127.0.0.1'
        );
        console.log('   ✓ Member action logged\n');
        testsPassed++;

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 5: Log search
        console.log('5. Testing logSearch()...');
        await logSearch(
            '+919840930854',
            'Test User',
            'member',
            'find developers in Chennai',
            5,
            'natural',
            '127.0.0.1'
        );
        console.log('   ✓ Search logged\n');
        testsPassed++;

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 6: Log auth event
        console.log('6. Testing logAuth()...');
        await logAuth(
            '+919840930854',
            'Test User',
            'auth.login',
            '127.0.0.1'
        );
        console.log('   ✓ Auth event logged\n');
        testsPassed++;

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 7: Get audit logs (no filter)
        console.log('7. Testing getAuditLogs() - no filter...');
        const allLogs = await getAuditLogs({ limit: 10 });
        console.log(`   ✓ Retrieved ${allLogs.length} logs\n`);
        testsPassed++;

        // Test 8: Get audit logs with filter
        console.log('8. Testing getAuditLogs() - with filter...');
        const filteredLogs = await getAuditLogs({
            phone: '+919840930854',
            limit: 10
        });
        console.log(`   ✓ Retrieved ${filteredLogs.length} logs for specific user\n`);
        testsPassed++;

        // Test 9: Get audit logs by action
        console.log('9. Testing getAuditLogs() - by action...');
        const searchLogs = await getAuditLogs({
            action: 'search.query',
            limit: 10
        });
        console.log(`   ✓ Retrieved ${searchLogs.length} search logs\n`);
        testsPassed++;

        // Test 10: Get audit logs by status
        console.log('10. Testing getAuditLogs() - by status...');
        const failedLogs = await getAuditLogs({
            status: 'failure',
            limit: 10
        });
        console.log(`    ✓ Retrieved ${failedLogs.length} failed actions\n`);
        testsPassed++;

        // Test 11: Get audit statistics
        console.log('11. Testing getAuditStats()...');
        const stats = await getAuditStats(7);
        if (stats) {
            console.log(`    ✓ Stats retrieved:`);
            console.log(`      - Total actions: ${stats.total_actions}`);
            console.log(`      - Successful: ${stats.successful_actions}`);
            console.log(`      - Failed: ${stats.failed_actions}`);
            console.log(`      - Unique users: ${stats.unique_users}`);
            console.log(`      - Searches: ${stats.searches}\n`);
            testsPassed++;
        } else {
            console.log('    ✗ Failed to get stats\n');
            testsFailed++;
        }

        // Test 12: Get most active users
        console.log('12. Testing getMostActiveUsers()...');
        const activeUsers = await getMostActiveUsers(5, 7);
        console.log(`    ✓ Retrieved ${activeUsers.length} active users`);
        if (activeUsers.length > 0) {
            console.log(`    Top user: ${activeUsers[0].user_name} (${activeUsers[0].action_count} actions)\n`);
        } else {
            console.log('    (No active users in last 7 days)\n');
        }
        testsPassed++;

        // Test 13: Export audit report
        console.log('13. Testing exportAuditReport()...');
        const csv = await exportAuditReport({ limit: 5 });
        const lines = csv.split('\n').length - 1; // -1 for empty last line
        console.log(`    ✓ Exported ${lines} rows to CSV format\n`);
        testsPassed++;

        // Test 14: Test date range filtering
        console.log('14. Testing date range filtering...');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const recentLogs = await getAuditLogs({
            startDate: yesterday,
            endDate: today,
            limit: 10
        });
        console.log(`    ✓ Retrieved ${recentLogs.length} logs from last 24 hours\n`);
        testsPassed++;

        // Test 15: Test role filtering
        console.log('15. Testing role filtering...');
        const adminLogs = await getAuditLogs({
            userRole: 'admin',
            limit: 10
        });
        console.log(`    ✓ Retrieved ${adminLogs.length} admin actions\n`);
        testsPassed++;

        // Summary
        console.log('=== Test Summary ===');
        console.log(`Total Tests: ${testsPassed + testsFailed}`);
        console.log(`Passed: ${testsPassed} ✓`);
        console.log(`Failed: ${testsFailed} ✗`);
        console.log('');

        // Display sample log entry
        if (allLogs.length > 0) {
            console.log('📋 Sample Audit Log Entry:');
            const sample = allLogs[0];
            console.log('┌─────────────────┬─────────────────────────────────┐');
            console.log(`│ Phone           │ ${(sample.phone || 'N/A').padEnd(31)} │`);
            console.log(`│ User            │ ${(sample.user_name || 'N/A').padEnd(31)} │`);
            console.log(`│ Role            │ ${(sample.user_role || 'N/A').padEnd(31)} │`);
            console.log(`│ Action          │ ${sample.action.padEnd(31)} │`);
            console.log(`│ Resource Type   │ ${(sample.resource_type || 'N/A').padEnd(31)} │`);
            console.log(`│ Status          │ ${sample.status.padEnd(31)} │`);
            console.log(`│ IP Address      │ ${(sample.ip_address || 'N/A').padEnd(31)} │`);
            console.log(`│ Timestamp       │ ${new Date(sample.created_at).toISOString().padEnd(31)} │`);
            console.log('└─────────────────┴─────────────────────────────────┘');
            console.log('');
        }

        if (testsFailed === 0) {
            console.log('=== All Tests Passed! ✓ ===\n');
            process.exit(0);
        } else {
            console.log('=== Some Tests Failed ✗ ===\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests();
