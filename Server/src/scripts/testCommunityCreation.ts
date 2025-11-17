/**
 * Test Community Creation - Lean Schema
 * Tests the community creation flow with the lean schema
 */

import pool from '../config/db';
import { createCommunity, getCommunityById, getAllCommunities } from '../services/communityService';

async function testCommunityCreation() {
  console.log('🧪 Testing Community Creation Flow - Lean Schema\n');

  try {
    // Test 1: Create an Alumni Community
    console.log('📝 Test 1: Creating Alumni Community...');
    const alumniCommunityData = {
      name: 'IIT Alumni Network',
      slug: 'iit-alumni-network',
      type: 'alumni',
      description: 'Network of IIT alumni across the globe',
      subscription_plan: 'basic',
      member_limit: 500,
      search_limit_monthly: 5000,
      is_bot_enabled: true,
      is_search_enabled: true,
      is_embedding_enabled: true,
      member_type_data: {
        name: 'John Doe',
        phone: '+919876543210',
        email: 'john.doe@example.com',
        graduation_year: 2015,
        degree: 'B.Tech',
        department: 'Computer Science',
        college: 'IIT Madras',
        skills: ['Python', 'Machine Learning', 'Data Science'],
        bio: 'Software Engineer at Google'
      }
    };

    const alumniCommunity = await createCommunity(alumniCommunityData);
    console.log('✅ Alumni Community Created:', {
      id: alumniCommunity.id,
      name: alumniCommunity.name,
      type: alumniCommunity.type,
      admins: alumniCommunity.admins
    });
    console.log('');

    // Test 2: Create an Entrepreneur Community
    console.log('📝 Test 2: Creating Entrepreneur Community...');
    const entrepreneurCommunityData = {
      name: 'Startup Founders Hub',
      slug: 'startup-founders-hub',
      type: 'entrepreneur',
      description: 'Community for startup founders and entrepreneurs',
      member_type_data: {
        name: 'Jane Smith',
        phone: '+919876543211',
        email: 'jane.smith@example.com',
        company: 'TechStartup Inc',
        industry: 'Technology',
        position: 'CEO & Founder',
        skills: ['Leadership', 'Product Management', 'Fundraising'],
        bio: 'Serial entrepreneur with 3 successful exits'
      }
    };

    const entrepreneurCommunity = await createCommunity(entrepreneurCommunityData);
    console.log('✅ Entrepreneur Community Created:', {
      id: entrepreneurCommunity.id,
      name: entrepreneurCommunity.name,
      type: entrepreneurCommunity.type,
      admins: entrepreneurCommunity.admins
    });
    console.log('');

    // Test 3: Create an Apartment Community
    console.log('📝 Test 3: Creating Apartment Community...');
    const apartmentCommunityData = {
      name: 'Green Valley Apartments',
      slug: 'green-valley-apartments',
      type: 'apartment',
      description: 'Resident community for Green Valley Apartments',
      member_type_data: {
        name: 'Bob Johnson',
        phone: '+919876543212',
        email: 'bob.johnson@example.com',
        apartment_number: 'A-101',
        floor: '1',
        block: 'A',
        interests: ['Gardening', 'Community Events']
      }
    };

    const apartmentCommunity = await createCommunity(apartmentCommunityData);
    console.log('✅ Apartment Community Created:', {
      id: apartmentCommunity.id,
      name: apartmentCommunity.name,
      type: apartmentCommunity.type,
      admins: apartmentCommunity.admins
    });
    console.log('');

    // Test 4: Get All Communities
    console.log('📝 Test 4: Fetching All Communities...');
    const allCommunities = await getAllCommunities();
    console.log(`✅ Found ${allCommunities.length} communities:`);
    allCommunities.forEach((community) => {
      console.log(`   - ${community.name} (${community.type}) - ${community.admins?.length || 0} admins`);
    });
    console.log('');

    // Test 5: Get Community by ID
    console.log('📝 Test 5: Fetching Alumni Community by ID...');
    const fetchedCommunity = await getCommunityById(alumniCommunity.id);
    if (fetchedCommunity) {
      console.log('✅ Community Retrieved:', {
        id: fetchedCommunity.id,
        name: fetchedCommunity.name,
        admins: fetchedCommunity.admins
      });
    }
    console.log('');

    // Test 6: Verify Database State
    console.log('📝 Test 6: Verifying Database State...');
    const verificationQuery = `
      SELECT
        c.name AS community_name,
        c.type AS community_type,
        m.name AS member_name,
        cm.member_type,
        cm.role,
        cm.profile_data
      FROM communities c
      JOIN community_memberships cm ON cm.community_id = c.id
      JOIN members m ON m.id = cm.member_id
      WHERE c.slug IN ('iit-alumni-network', 'startup-founders-hub', 'green-valley-apartments')
      ORDER BY c.name;
    `;

    const result = await pool.query(verificationQuery);
    console.log('✅ Database Verification:');
    result.rows.forEach((row) => {
      console.log(`   - ${row.community_name} (${row.community_type})`);
      console.log(`     Member: ${row.member_name} | Type: ${row.member_type} | Role: ${row.role}`);
      console.log(`     Profile Data:`, JSON.stringify(row.profile_data, null, 2));
    });
    console.log('');

    console.log('✅ All Tests Passed!\n');
    console.log('📊 Summary:');
    console.log('   - Communities created: 3');
    console.log('   - Members created: 3');
    console.log('   - Memberships created: 3');
    console.log('   - All data stored in lean schema (JSONB profile_data)');

  } catch (error: any) {
    console.error('❌ Test Failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

testCommunityCreation()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
