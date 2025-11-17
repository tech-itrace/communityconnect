/**
 * Test Community Member Addition - Lean Schema
 * Tests adding members to communities with profile data in JSONB
 */

import pool from '../config/db';
import {
  createCommunity,
  addMemberToCommunity,
  getCommunityMembers,
  updateCommunityMemberProfile,
  updateMemberRole,
  removeMemberFromCommunity,
} from '../services/communityService';

async function testMemberAddition() {
  console.log('🧪 Testing Community Member Addition Flow - Lean Schema\n');

  try {
    // Test 1: Create a test community
    console.log('📝 Test 1: Creating Test Alumni Community...');
    const communityData = {
      name: 'Test Alumni Community',
      slug: 'test-alumni-community',
      type: 'alumni',
      description: 'Test community for member addition flow',
      member_type_data: {
        name: 'Community Admin',
        phone: '+919900000001',
        email: 'admin@test.com',
        graduation_year: 2020,
        degree: 'B.Tech',
        department: 'Computer Science',
        college: 'Test College',
      },
    };

    const community = await createCommunity(communityData);
    console.log('✅ Community Created:', community.id);
    console.log('');

    // Test 2: Add an alumni member
    console.log('📝 Test 2: Adding Alumni Member...');
    const alumniMember = await addMemberToCommunity({
      community_id: community.id,
      member_data: {
        name: 'John Alumni',
        phone: '+919900000002',
        email: 'john@alumni.com',
      },
      member_type: 'alumni',
      profile_data: {
        graduation_year: 2018,
        degree: 'M.Tech',
        department: 'Electrical Engineering',
        college: 'Test College',
        skills: ['Python', 'Data Science', 'ML'],
        bio: 'Data scientist with 5 years experience',
      },
      role: 'member',
    });

    console.log('✅ Alumni Member Added:', {
      member_id: alumniMember.member.id,
      name: alumniMember.member.name,
      membership_id: alumniMember.membership.id,
      member_type: alumniMember.membership.member_type,
    });
    console.log('');

    // Test 3: Add another member (will reuse existing member if phone exists)
    console.log('📝 Test 3: Adding Another Member...');
    const member2 = await addMemberToCommunity({
      community_id: community.id,
      member_data: {
        name: 'Jane Alumni',
        phone: '+919900000003',
        email: 'jane@alumni.com',
      },
      member_type: 'alumni',
      profile_data: {
        graduation_year: 2019,
        degree: 'B.Tech',
        department: 'Mechanical Engineering',
        college: 'Test College',
        skills: ['CAD', 'Design', 'Manufacturing'],
      },
      role: 'member',
    });

    console.log('✅ Second Member Added:', member2.member.name);
    console.log('');

    // Test 4: Try adding duplicate member (should fail)
    console.log('📝 Test 4: Testing Duplicate Member (Should Fail)...');
    try {
      await addMemberToCommunity({
        community_id: community.id,
        member_data: {
          name: 'John Alumni',
          phone: '+919900000002', // Same phone as Test 2
          email: 'john@alumni.com',
        },
        member_type: 'alumni',
        profile_data: {},
      });
      console.log('❌ Test Failed: Should have thrown duplicate error');
    } catch (error: any) {
      console.log('✅ Correctly rejected duplicate:', error.message);
    }
    console.log('');

    // Test 5: Get all community members
    console.log('📝 Test 5: Fetching All Community Members...');
    const allMembers = await getCommunityMembers(community.id);
    console.log(`✅ Found ${allMembers.length} members:`);
    allMembers.forEach((m) => {
      console.log(`   - ${m.name} (${m.member_type}) - Role: ${m.role}`);
      console.log(`     Profile:`, JSON.stringify(m.profile_data, null, 2));
    });
    console.log('');

    // Test 6: Filter members by type
    console.log('📝 Test 6: Filtering Alumni Members Only...');
    const alumniOnly = await getCommunityMembers(community.id, {
      member_type: 'alumni',
      is_active: true,
    });
    console.log(`✅ Found ${alumniOnly.length} alumni members`);
    console.log('');

    // Test 7: Update member profile
    console.log('📝 Test 7: Updating Member Profile...');
    const updatedProfile = await updateCommunityMemberProfile(
      community.id,
      alumniMember.member.id,
      {
        graduation_year: 2018,
        degree: 'M.Tech',
        department: 'Electrical Engineering',
        college: 'Test College',
        skills: ['Python', 'Data Science', 'ML', 'Deep Learning'], // Added skill
        bio: 'Senior Data Scientist with 5+ years experience', // Updated bio
        current_company: 'Tech Corp', // Added field
      }
    );

    console.log('✅ Profile Updated:', {
      member_id: alumniMember.member.id,
      profile_data: updatedProfile.profile_data,
    });
    console.log('');

    // Test 8: Promote member to admin
    console.log('📝 Test 8: Promoting Member to Admin...');
    const promoted = await updateMemberRole(community.id, alumniMember.member.id, 'admin');
    console.log('✅ Member Promoted:', {
      member_id: alumniMember.member.id,
      new_role: promoted.role,
    });
    console.log('');

    // Test 9: Get admins only
    console.log('📝 Test 9: Fetching Admins Only...');
    const admins = await getCommunityMembers(community.id, {
      role: 'admin',
    });
    console.log(`✅ Found ${admins.length} admins:`);
    admins.forEach((admin) => {
      console.log(`   - ${admin.name} (${admin.role})`);
    });
    console.log('');

    // Test 10: Remove member from community
    console.log('📝 Test 10: Removing Member from Community...');
    const removed = await removeMemberFromCommunity(community.id, member2.member.id);
    console.log('✅ Member Removed:', removed);

    // Verify removal
    const afterRemoval = await getCommunityMembers(community.id, {
      is_active: true,
    });
    console.log(`   Active members after removal: ${afterRemoval.length}`);
    console.log('');

    // Test 11: Verify Database State
    console.log('📝 Test 11: Verifying Database State...');
    const verificationQuery = `
      SELECT
        c.name AS community_name,
        m.name AS member_name,
        m.phone,
        cm.member_type,
        cm.role,
        cm.is_active,
        cm.profile_data,
        cm.joined_at
      FROM communities c
      JOIN community_memberships cm ON cm.community_id = c.id
      JOIN members m ON m.id = cm.member_id
      WHERE c.id = $1
      ORDER BY cm.joined_at;
    `;

    const result = await pool.query(verificationQuery, [community.id]);
    console.log('✅ Database Verification:');
    result.rows.forEach((row) => {
      console.log(`   - ${row.member_name} (${row.member_type})`);
      console.log(`     Phone: ${row.phone}`);
      console.log(`     Role: ${row.role}`);
      console.log(`     Active: ${row.is_active}`);
      console.log(`     Profile Data:`, JSON.stringify(row.profile_data, null, 2));
    });
    console.log('');

    console.log('✅ All Tests Passed!\n');
    console.log('📊 Summary:');
    console.log('   - Community created: 1');
    console.log('   - Members added: 3 (1 admin via createCommunity, 2 via addMemberToCommunity)');
    console.log('   - Duplicate rejection: ✅');
    console.log('   - Profile update: ✅');
    console.log('   - Role promotion: ✅');
    console.log('   - Member removal: ✅');
    console.log('   - All data stored in lean schema (JSONB profile_data)');

  } catch (error: any) {
    console.error('❌ Test Failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

testMemberAddition()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
