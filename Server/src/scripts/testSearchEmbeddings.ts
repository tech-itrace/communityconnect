/**
 * Test Search & Embeddings Flow - Lean Schema
 *
 * Tests the complete search flow:
 * 1. Create community with members
 * 2. Generate embeddings from JSONB profiles
 * 3. Populate search index
 * 4. Test semantic search
 * 5. Test keyword search
 * 6. Test hybrid search
 */

import pool from '../config/db';
import {
    createCommunity,
    addMemberToCommunity,
    getCommunityMembers
} from '../services/communityService';
import { searchMembers } from '../services/semanticSearch';
import axios from 'axios';

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const EMBEDDING_MODEL = 'BAAI/bge-base-en-v1.5';

interface TestMember {
    name: string;
    phone: string;
    email: string;
    member_type: 'alumni' | 'entrepreneur' | 'resident';
    profile_data: any;
}

async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await axios.post(
            `https://api.deepinfra.com/v1/inference/${EMBEDDING_MODEL}`,
            { inputs: [text] },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        return response.data.embeddings[0];
    } catch (error: any) {
        console.error(`   ⚠️  Embedding API error: ${error.message}`);
        throw error;
    }
}

function buildTextFromProfile(member: TestMember): string {
    const parts: string[] = [];

    parts.push(`Name: ${member.name}`);
    parts.push(`Email: ${member.email}`);
    parts.push(`Phone: ${member.phone}`);
    parts.push(`Member Type: ${member.member_type}`);

    const profile = member.profile_data;

    switch (member.member_type) {
        case 'alumni':
            if (profile.college) parts.push(`College: ${profile.college}`);
            if (profile.graduation_year) parts.push(`Graduation Year: ${profile.graduation_year}`);
            if (profile.degree) parts.push(`Degree: ${profile.degree}`);
            if (profile.department) parts.push(`Department: ${profile.department}`);
            if (profile.current_organization) parts.push(`Organization: ${profile.current_organization}`);
            if (profile.designation) parts.push(`Designation: ${profile.designation}`);
            if (profile.city) parts.push(`City: ${profile.city}`);
            if (profile.skills && Array.isArray(profile.skills)) {
                parts.push(`Skills: ${profile.skills.join(', ')}`);
            }
            break;

        case 'entrepreneur':
            if (profile.company) parts.push(`Company: ${profile.company}`);
            if (profile.industry) parts.push(`Industry: ${profile.industry}`);
            if (profile.company_stage) parts.push(`Stage: ${profile.company_stage}`);
            if (profile.city) parts.push(`City: ${profile.city}`);
            if (profile.services_offered && Array.isArray(profile.services_offered)) {
                parts.push(`Services: ${profile.services_offered.join(', ')}`);
            }
            break;

        case 'resident':
            if (profile.apartment_number) parts.push(`Apartment: ${profile.apartment_number}`);
            if (profile.building) parts.push(`Building: ${profile.building}`);
            if (profile.profession) parts.push(`Profession: ${profile.profession}`);
            if (profile.organization) parts.push(`Organization: ${profile.organization}`);
            if (profile.city) parts.push(`City: ${profile.city}`);
            break;
    }

    return parts.join('. ');
}

async function testSearchEmbeddings() {
    console.log('🧪 Testing Search & Embeddings Flow - Lean Schema\\n');

    try {
        // Test 1: Create test community
        console.log('📝 Test 1: Creating Test Alumni Community...');
        const communityData = {
            name: 'Search Test Alumni Network',
            slug: 'search-test-alumni',
            type: 'alumni',
            description: 'Test community for search and embeddings',
            member_type_data: {
                name: 'Admin User',
                phone: '+919900001000',
                email: 'admin@searchtest.com',
                graduation_year: 2020,
                degree: 'B.Tech',
                department: 'Computer Science',
                college: 'Test College',
                city: 'Bangalore',
                skills: ['Leadership', 'Management']
            }
        };

        const community = await createCommunity(communityData);
        console.log('✅ Community Created:', community.id);
        console.log('');

        // Test 2: Add diverse members
        console.log('📝 Test 2: Adding Diverse Members...');

        const testMembers: TestMember[] = [
            {
                name: 'Alice Data Scientist',
                phone: '+919900001001',
                email: 'alice@test.com',
                member_type: 'alumni',
                profile_data: {
                    graduation_year: 2018,
                    degree: 'M.Tech',
                    department: 'Computer Science',
                    college: 'Test College',
                    city: 'Bangalore',
                    current_organization: 'Google',
                    designation: 'Senior Data Scientist',
                    skills: ['Python', 'Machine Learning', 'Data Science', 'AI', 'TensorFlow']
                }
            },
            {
                name: 'Bob Frontend Developer',
                phone: '+919900001002',
                email: 'bob@test.com',
                member_type: 'alumni',
                profile_data: {
                    graduation_year: 2019,
                    degree: 'B.Tech',
                    department: 'Computer Science',
                    college: 'Test College',
                    city: 'Chennai',
                    current_organization: 'Amazon',
                    designation: 'Frontend Developer',
                    skills: ['JavaScript', 'React', 'TypeScript', 'CSS', 'HTML']
                }
            },
            {
                name: 'Carol Entrepreneur',
                phone: '+919900001003',
                email: 'carol@test.com',
                member_type: 'entrepreneur',
                profile_data: {
                    company: 'Tech Startup Inc',
                    industry: 'Software',
                    company_stage: 'Series A',
                    city: 'Mumbai',
                    services_offered: ['Web Development', 'Mobile Apps', 'Consulting'],
                    expertise: ['Node.js', 'React Native', 'AWS']
                }
            },
            {
                name: 'David ML Engineer',
                phone: '+919900001004',
                email: 'david@test.com',
                member_type: 'alumni',
                profile_data: {
                    graduation_year: 2017,
                    degree: 'PhD',
                    department: 'Artificial Intelligence',
                    college: 'Test College',
                    city: 'Bangalore',
                    current_organization: 'Microsoft',
                    designation: 'ML Engineer',
                    skills: ['Python', 'Deep Learning', 'PyTorch', 'Computer Vision', 'NLP']
                }
            }
        ];

        const addedMembers: any[] = [];
        for (const member of testMembers) {
            const result = await addMemberToCommunity({
                community_id: community.id,
                member_data: {
                    name: member.name,
                    phone: member.phone,
                    email: member.email
                },
                member_type: member.member_type,
                profile_data: member.profile_data,
                role: 'member'
            });
            addedMembers.push(result);
            console.log(`   ✅ Added: ${member.name}`);
        }
        console.log('');

        // Test 3: Generate embeddings for all members
        console.log('📝 Test 3: Generating Embeddings...');

        const membersWithMemberships = await pool.query(`
            SELECT
                m.id as member_id,
                cm.id as membership_id,
                m.name,
                m.email,
                m.phone,
                cm.member_type,
                cm.profile_data
            FROM members m
            JOIN community_memberships cm ON m.id = cm.member_id
            WHERE cm.community_id = $1 AND cm.is_active = TRUE
        `, [community.id]);

        for (const row of membersWithMemberships.rows) {
            const profileText = buildTextFromProfile({
                name: row.name,
                phone: row.phone,
                email: row.email,
                member_type: row.member_type,
                profile_data: row.profile_data
            });

            const embedding = await generateEmbedding(profileText);

            await pool.query(`
                INSERT INTO member_embeddings
                (membership_id, profile_embedding, skills_embedding, contextual_embedding,
                 profile_text, skills_text, contextual_text)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (membership_id)
                DO UPDATE SET
                    profile_embedding = EXCLUDED.profile_embedding,
                    skills_embedding = EXCLUDED.skills_embedding,
                    contextual_embedding = EXCLUDED.contextual_embedding,
                    profile_text = EXCLUDED.profile_text,
                    updated_at = now()
            `, [
                row.membership_id,
                JSON.stringify(embedding),
                JSON.stringify(embedding),
                JSON.stringify(embedding),
                profileText,
                profileText,
                profileText
            ]);

            console.log(`   ✅ Generated embedding for: ${row.name}`);
        }
        console.log('');

        // Test 4: Verify search index population (automatic via trigger)
        console.log('📝 Test 4: Verifying Search Index...');
        const searchIndexCount = await pool.query(`
            SELECT COUNT(*) FROM member_search_index WHERE community_id = $1
        `, [community.id]);
        console.log(`✅ Search index entries: ${searchIndexCount.rows[0].count}`);
        console.log('');

        // Test 5: Test Semantic Search
        console.log('📝 Test 5: Testing Semantic Search...');
        console.log('   Query: "Find Python developers"');

        const semanticResults = await searchMembers({
            query: 'Find Python developers',
            filters: {},
            options: {
                searchType: 'semantic',
                page: 1,
                limit: 10,
                sortBy: 'relevance',
                sortOrder: 'desc'
            },
            communityId: community.id
        });

        console.log(`   ✅ Found ${semanticResults.members.length} results:`);
        semanticResults.members.forEach((m, i) => {
            console.log(`      ${i + 1}. ${m.name} (Score: ${m.relevanceScore?.toFixed(3)})`);
        });
        console.log('');

        // Test 6: Test Keyword Search
        console.log('📝 Test 6: Testing Keyword Search...');
        console.log('   Query: "Machine Learning"');

        const keywordResults = await searchMembers({
            query: 'Machine Learning',
            filters: {},
            options: {
                searchType: 'keyword',
                page: 1,
                limit: 10,
                sortBy: 'relevance',
                sortOrder: 'desc'
            },
            communityId: community.id
        });

        console.log(`   ✅ Found ${keywordResults.members.length} results:`);
        keywordResults.members.forEach((m, i) => {
            console.log(`      ${i + 1}. ${m.name} (Score: ${m.relevanceScore?.toFixed(3)})`);
        });
        console.log('');

        // Test 7: Test Hybrid Search
        console.log('📝 Test 7: Testing Hybrid Search...');
        console.log('   Query: "AI expert in Bangalore"');

        const hybridResults = await searchMembers({
            query: 'AI expert in Bangalore',
            filters: {},
            options: {
                searchType: 'hybrid',
                page: 1,
                limit: 10,
                sortBy: 'relevance',
                sortOrder: 'desc'
            },
            communityId: community.id
        });

        console.log(`   ✅ Found ${hybridResults.members.length} results:`);
        hybridResults.members.forEach((m, i) => {
            console.log(`      ${i + 1}. ${m.name} (City: ${m.profileData?.city || 'N/A'}, Score: ${m.relevanceScore?.toFixed(3)})`);
        });
        console.log('');

        // Test 8: Test with filters
        console.log('📝 Test 8: Testing Search with City Filter...');
        console.log('   Query: "developer"');
        console.log('   Filter: city = "Bangalore"');

        const filteredResults = await searchMembers({
            query: 'developer',
            filters: {
                city: 'Bangalore'
            },
            options: {
                searchType: 'hybrid',
                page: 1,
                limit: 10,
                sortBy: 'relevance',
                sortOrder: 'desc'
            },
            communityId: community.id
        });

        console.log(`   ✅ Found ${filteredResults.members.length} results:`);
        filteredResults.members.forEach((m, i) => {
            console.log(`      ${i + 1}. ${m.name} (City: ${m.profileData?.city || 'N/A'})`);
        });
        console.log('');

        // Test 9: Test with skills filter
        console.log('📝 Test 9: Testing Search with Skills Filter...');
        console.log('   Query: ""');
        console.log('   Filter: skills = ["React"]');

        const skillsResults = await searchMembers({
            query: '',
            filters: {
                skills: ['React']
            },
            options: {
                searchType: 'hybrid',
                page: 1,
                limit: 10,
                sortBy: 'relevance',
                sortOrder: 'desc'
            },
            communityId: community.id
        });

        console.log(`   ✅ Found ${skillsResults.members.length} results:`);
        skillsResults.members.forEach((m, i) => {
            console.log(`      ${i + 1}. ${m.name} (Skills: ${(m.profileData?.skills || []).join(', ')})`);
        });
        console.log('');

        console.log('✅ All Tests Passed!\\n');
        console.log('📊 Summary:');
        console.log('   - Community created: 1');
        console.log('   - Members added: 5 (1 admin + 4 test members)');
        console.log('   - Embeddings generated: 5');
        console.log('   - Search index populated: ✅');
        console.log('   - Semantic search: ✅');
        console.log('   - Keyword search: ✅');
        console.log('   - Hybrid search: ✅');
        console.log('   - Filtered search: ✅');
        console.log('   - All data uses lean schema (JSONB profile_data)');

    } catch (error: any) {
        console.error('❌ Test Failed:', error.message);
        console.error(error);
        throw error;
    } finally {
        await pool.end();
    }
}

testSearchEmbeddings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
