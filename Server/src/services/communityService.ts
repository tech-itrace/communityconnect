import { query } from "../config/db";
import { randomUUID } from "crypto";
import { withTransaction, executeQuery } from "../utils/dbHelpers";
import { MEMBER_TYPES } from "../config/constants";

export interface Community {
  id: string;
  name: string;
  description?: string;
  type?: string;
  admins?: any; // JSON field
  rules?: string;
  is_bot_enable?: boolean;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
  created_by?: string;
}

/** Get community by ID */
export async function getCommunityById(id: string): Promise<Community | null> {
  console.log(`[Community Service] Fetching Community with ID: ${id}`);

  const queryText = `
        SELECT 
            c.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'phone', m.phone,
                        'email', m.email
                    )
                ) FILTER (WHERE ca.member_id IS NOT NULL),
                '[]'::json
            ) as admins
        FROM communities c
        LEFT JOIN community_admins ca ON c.id = ca.community_id AND ca.revoked_at IS NULL
        LEFT JOIN members m ON ca.member_id = m.id
        WHERE c.id = $1 AND c.is_active = TRUE
        GROUP BY c.id
    `;

  const result = await query(queryText, [id]);

  if (result.rows.length === 0) {
    console.log(`[Community Service] Community not found: ${id}`);
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    rules: row.rules,
    admins: row.admins,
    is_bot_enable: row.is_bot_enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_active: row.is_active,
    created_by: row.created_by,
  };
}

/** Check if member exists */
async function findMember(phone: string, email: string) {
  const sql = `
      SELECT * FROM members
      WHERE phone = $1 OR email = $2
  `;
  const res = await query(sql, [phone, email]);
  return res.rows[0] || null;
}

/** Create new member */
async function createMember(member: { id: string; name: string; phone: string; email: string }) {
  const sql = `
      INSERT INTO members (id, name, phone, email, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
  `;
  const res = await query(sql, [member.id, member.name, member.phone, member.email]);
  return res.rows[0];
}

/** Insert into community type-specific table */
async function createTypeMember(type: string, memberId: string, data: any, client?: any) {
  const queryExecutor = client || query;

  if (type === MEMBER_TYPES.ALUMNI || type === "alumini") { // Support both for backwards compatibility
    const sql = `
      INSERT INTO alumni_profiles
      (id, membership_id, college, graduation_year, degree, department, current_organization, designation, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
      RETURNING *
    `;
    const newId = randomUUID();
    const params = [
      newId,
      memberId, // This should be membership_id, not member_id
      data.college,
      data.graduation_year,
      data.degree,
      data.department,
      data.current_organization,
      data.designation
    ];

    const res = await (client ? executeQuery(client, sql, params) : query(sql, params));
    return res.rows[0];
  }

  if (type === MEMBER_TYPES.ENTREPRENEUR) {
    // TODO: Implement entrepreneur profile creation
    console.warn('[Community Service] Entrepreneur profile creation not yet implemented');
  }

  if (type === "religious") {
    // TODO: Implement religious/resident profile creation
    console.warn('[Community Service] Religious profile creation not yet implemented');
  }

  return null;
}


/** Mapping table */
async function addCommunityMemberMapping(communityId: string, memberId: string, memberTypeId: string | null) {
  const sql = `
    INSERT INTO community_members_types (community_id, member_id, member_type_id)
    VALUES ($1, $2, $3)
  `;
  await query(sql, [communityId, memberId, memberTypeId]);
}

/** Create a new community */
export async function createCommunity(communityData: {
  name: string;
  description?: string;
  type?: string;
  admins?: any;
  rules?: string;
  is_bot_enable?: boolean;
  is_active?: boolean;
  created_by?: string;
  member_type_data?: any;
}): Promise<Community> {

  console.log(`[Community Service] Creating community: ${communityData.name}`);

  const {
    name,
    description,
    type,
    admins,
    rules,
    is_bot_enable = false,
    is_active = true,
    created_by,
  } = communityData;

  // Ensure admins is parsed JSON
  const adminList = typeof admins === "string" ? JSON.parse(admins) : admins;

  // ✅ WRAP ENTIRE OPERATION IN TRANSACTION
  return withTransaction(async (client) => {
    // Step 1: Create Community
    const insertCommunitySQL = `
      INSERT INTO communities
      (name, description, type, rules, is_bot_enabled, is_active, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `;

    const values = [
      name,
      description,
      type,
      rules,
      is_bot_enable,
      is_active,
      created_by
    ];

    const result = await executeQuery(client, insertCommunitySQL, values);
    const communityId = result.rows[0].id;

    console.log("✔ Community created with ID:", communityId);

    // Step 2: PROCESS EACH ADMIN AS MEMBER
    for (const admin of adminList) {
      console.log("Processing admin:", admin);

      // Check if member exists (using transaction client)
      const findMemberSQL = `SELECT * FROM members WHERE phone = $1 OR email = $2`;
      const memberResult = await executeQuery(client, findMemberSQL, [admin.phone, admin.email]);
      const existingMember = memberResult.rows[0] || null;

      let memberId;
      if (existingMember) {
        console.log("✔ Member already exists:", existingMember.id);
        memberId = existingMember.id;
      } else {
        console.log("➕ Creating new member");
        const createMemberSQL = `
          INSERT INTO members (id, name, phone, email, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING *
        `;
        const newMemberResult = await executeQuery(client, createMemberSQL, [
          randomUUID(),
          admin.name,
          admin.phone,
          admin.email
        ]);
        memberId = newMemberResult.rows[0].id;
      }

      console.log("memberId:" + memberId);

      // Step 3: Insert into type-specific table (using transaction client)
      const typeMember = await createTypeMember(type!, memberId, communityData.member_type_data, client);
      console.log("typeMember: " + JSON.stringify(typeMember));

      // Step 4: Insert into community_members_types (using transaction client)
      const mappingSQL = `
        INSERT INTO community_members_types (community_id, member_id, member_type_id)
        VALUES ($1, $2, $3)
      `;
      await executeQuery(client, mappingSQL, [communityId, memberId, typeMember?.id || null]);
    }

    // Step 5: Fetch and return full community
    const createdCommunity = await getCommunityById(communityId);
    return createdCommunity!;
  });
}


/** Get all communities */
export async function getAllCommunities(): Promise<Community[]> {
  const queryText = `
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.type,
      c.description,
      c.whatsapp_number,
      c.whatsapp_webhook_url,
      c.subscription_plan,
      c.member_limit,
      c.search_limit_monthly,
      c.is_bot_enabled,
      c.is_search_enabled,
      c.is_embedding_enabled,
      c.created_at,
      c.updated_at,
      c.is_active,
      c.created_by,

      -- Build admins list
      COALESCE(
        json_agg(
          json_build_object(
            'id', m.id,
            'name', m.name,
            'phone', m.phone,
            'email', m.email
          )
        ) FILTER (WHERE ca.member_id IS NOT NULL),
        '[]'::json
      ) AS admins

    FROM communities c
    LEFT JOIN community_admins ca 
      ON ca.community_id = c.id 
     AND ca.revoked_at IS NULL
    LEFT JOIN members m 
      ON m.id = ca.member_id

    WHERE c.is_active = TRUE

    GROUP BY c.id
    ORDER BY c.created_at DESC;
  `;

  const result = await query(queryText);
  return result.rows;
}

/** Update community */
export async function updateCommunity(
  id: string,
  updates: Partial<Community>
): Promise<Community | null> {
  // ✅ Only allow columns that actually exist in your "communities" table
  const allowedFields = [
    "name",
    "description",
    "type",
    "rules",
    "is_bot_enabled",
    "is_active",
    "created_by",
  ];

  // Filter only valid fields that exist in the DB
  const filteredEntries = Object.entries(updates).filter(([key]) =>
    allowedFields.includes(key)
  );

  if (filteredEntries.length === 0) return null;

  const setClause = filteredEntries
    .map(([key], i) => `${key} = $${i + 2}`)
    .join(", ");
  const values = filteredEntries.map(([, value]) => value);

  const queryText = `
    UPDATE communities
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const result = await query(queryText, [id, ...values]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("[DB] Error updating community:", error);
    throw error;
  }
}

/** Soft delete (set is_active = false) */
export async function deleteCommunity(id: string): Promise<boolean> {
  const queryText = `
    UPDATE communities
    SET is_active = false, updated_at = NOW()
    WHERE id = $1;
  `;
  await query(queryText, [id]);
  return true;
}