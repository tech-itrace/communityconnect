import { query } from "../config/db";
import { randomUUID } from "crypto";
import { withTransaction, executeQuery } from "../utils/dbHelpers";
import { MEMBER_TYPES } from "../config/constants";

export interface Community {
  id: string;
  name: string;
  slug: string;
  type: "alumni" | "entrepreneur" | "apartment" | "mixed";
  description?: string;
  whatsapp_number?: string;
  whatsapp_webhook_url?: string;
  subscription_plan?: string;
  member_limit?: number;
  search_limit_monthly?: number;
  is_bot_enabled?: boolean;
  is_search_enabled?: boolean;
  is_embedding_enabled?: boolean;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
  created_by?: string;
}


/** Get community by ID */
export async function getCommunityById(
  id: string,
  client?: any
): Promise<Community | null> {
  const executor = client
    ? (sql: string, params?: any[]) => executeQuery(client, sql, params)
    : query;

  const sql = `
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
      c.created_by,
      c.is_active,
      c.created_at,
      c.updated_at,

      /* ADMIN LIST */
      COALESCE(
        json_agg(
          json_build_object(
            'id', m.id,
            'name', m.name,
            'phone', m.phone,
            'email', m.email,
            'role', ca.role,
            'granted_at', ca.granted_at
          )
        ) FILTER (WHERE ca.member_id IS NOT NULL),
        '[]'::json
      ) AS admins

    FROM communities c
    LEFT JOIN community_admins ca 
      ON ca.community_id = c.id AND ca.revoked_at IS NULL
    LEFT JOIN members m 
      ON m.id = ca.member_id

    WHERE c.id = $1
    GROUP BY c.id
  `;

  const res = await executor(sql, [id]);
  if (!res.rows.length) return null;

  return res.rows[0];
}


async function ensureMember(data: any ) {
    console.log("data-check with members table: " + JSON.stringify(data))
  const findSql = `SELECT * FROM members WHERE phone = $1 OR email = $2`;
  const existing = await query(findSql, [data.phone, data.email]);
  if (existing.rows.length) {return existing.rows[0];
  }else {
  const newId = randomUUID();
  const insertSql = `
    INSERT INTO members (id, name, phone, email, created_at, updated_at, last_login, is_active)
    VALUES ($1,$2,$3,$4,NOW(),NOW(), NOW(), TRUE)
    RETURNING *
  `;
  const res = await query(insertSql, [
    newId,
    data.name,
    data.phone,
    data.email || null
  ]);

  return res.rows[0];}
}

/** Insert into community type-specific table */
async function createTypeMember(client:any, type: string, membershipId: string, data: any) {
  if (type !== "alumni") return null;
console.log("data in createTypeMember: " + JSON.stringify(data))
const newMemberId = randomUUID();
  const sql = `
    INSERT INTO alumni_profiles
      (id, membership_id, graduation_year, degree, department, college, 
       created_at, updated_at)
    VALUES ( $1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;

  const params = [
    newMemberId,
    membershipId,
    data?.graduation_year || null,
    data?.degree || null,
    data?.department || null,
    data?.college || null,
  ];

  const res = await executeQuery(client, sql, params);
  return res.rows[0];
}

async function addCommunityAdmin(client: any, communityId: string, memberId: string, data: any) {
    const commAdminId = randomUUID();
  const sql = `
    INSERT INTO community_admins (id, community_id, member_id, role, granted_by, granted_at, revoked_at)
    VALUES ($1,$2,$3, $4, $5, NOW(), NOW())
  `;
 const res = await executeQuery(client, sql, [
commAdminId,
    communityId,
    memberId,
    data.role,
      memberId
  ]);

  return res.rows[0];
}

/** Create a new community */
async function addMembership(client: any,communityId: string, memberId: string, data: any) {
    console.log("communityId:" + communityId)
    console.log("memberId:" + memberId)

//     let creator;

// if (typeof data.created_by === "object") {
//   creator = await ensureMember(data.created_by);   // create/find
// } else {
//   const res = await executeQuery(client, `SELECT * FROM members WHERE id=$1`, [data.created_by]);
//   if (!res.rows.length) throw new Error("created_by must be valid member ID");
//   creator = res.rows[0];
// }

  const membershipId = randomUUID();

  const sql = `
    INSERT INTO community_memberships
      (id, community_id, member_id, member_type, invited_by, role, is_active, joined_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW(),NOW())
    RETURNING *
  `;

  const res = await executeQuery(client, sql, [
    membershipId,
    communityId,
    memberId,
    data.type === "alumni" ? "alumni"
      : data.type === "entrepreneur" ? "entrepreneur"
      : data.type === "apartment" ? "resident"
      : "generic",
      memberId,
      "admin"
  ]);

  return res.rows[0];
}

export async function createCommunity(data: any): Promise<Community> {
  return withTransaction(async (client) => {
    const communityId = randomUUID();

    /* 1. CREATE COMMUNITY */
    await executeQuery(
      client,
      `
        INSERT INTO communities
        (id, name, slug, type, description, whatsapp_number, whatsapp_webhook_url,
         subscription_plan, member_limit, search_limit_monthly, is_bot_enabled,
         is_search_enabled, is_embedding_enabled, created_by, is_active,
         created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,NOW(),NOW())
      `,
      [
        communityId,
        data.name,
        data.slug,
        data.type,
        data.description || null,
        data.whatsapp_number || null,
        data.whatsapp_webhook_url || null,
        data.subscription_plan || 'free',
        data.member_limit || 100,
        data.search_limit_monthly || 1000,
        data.is_bot_enabled || false,
        data.is_search_enabled ?? true,
        data.is_embedding_enabled ?? true,
        data.created_by
      ]
    );

    /* 2. FIND CREATOR MEMBER (admin) */
    // const creatorRes = await executeQuery(
    //   client,
    //   `SELECT * FROM members WHERE id = $1`,
    //   [data.created_by]
    // );

    // if (creatorRes.rows.length === 0) {
    //   throw new Error("created_by must be an existing member ID");
    // }

    // const member = creatorRes.rows[0];
const member = await ensureMember(data.member_type_data)
    /* 3. Add membership for creator */
   const membership = await addMembership(client, communityId, member.id, data);


    /* 4. Insert alumni profile (only if type == alumni) */
    if (data.type === "alumni") {
      await createTypeMember(client, "alumni", membership.id, data.member_type_data);
    }

    /* 5. Add admin mapping */
    await addCommunityAdmin(client, communityId, member.id, data);

    /* 6. Return community */
    // return await getCommunityById(communityId);
   
    const created = await getCommunityById(communityId, client);

if (!created) {
  throw new Error("Community creation failed: unable to load created community");
}

return created;
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