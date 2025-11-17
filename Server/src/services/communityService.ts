import { query } from "../config/db";
import { randomUUID } from "crypto";
import { withTransaction, executeQuery } from "../utils/dbHelpers";

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
  admins?: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
    joined_at?: Date;
  }>;
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

      /* ADMIN LIST - Using community_memberships.role */
      COALESCE(
        json_agg(
          json_build_object(
            'id', m.id,
            'name', m.name,
            'phone', m.phone,
            'email', m.email,
            'role', cm.role,
            'joined_at', cm.joined_at
          )
        ) FILTER (WHERE cm.role IN ('admin', 'super_admin')),
        '[]'::json
      ) AS admins

    FROM communities c
    LEFT JOIN community_memberships cm
      ON cm.community_id = c.id
      AND cm.is_active = TRUE
      AND cm.role IN ('admin', 'super_admin')
    LEFT JOIN members m
      ON m.id = cm.member_id

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

/** Build profile_data JSONB based on member type */
function buildProfileData(type: string, data: any): object {
  const profileData: any = {};

  if (type === "alumni" && data) {
    profileData.graduation_year = data.graduation_year || null;
    profileData.degree = data.degree || null;
    profileData.department = data.department || null;
    profileData.college = data.college || null;
  } else if (type === "entrepreneur" && data) {
    profileData.company = data.company || null;
    profileData.industry = data.industry || null;
    profileData.position = data.position || null;
  } else if (type === "apartment" && data) {
    profileData.apartment_number = data.apartment_number || null;
    profileData.floor = data.floor || null;
    profileData.block = data.block || null;
  }

  // Add common fields if present
  if (data?.skills) profileData.skills = data.skills;
  if (data?.interests) profileData.interests = data.interests;
  if (data?.bio) profileData.bio = data.bio;

  return profileData;
}

/** Add membership for a member in a community */
async function addMembership(
  client: any,
  communityId: string,
  memberId: string,
  memberType: string,
  profileData: object,
  role: string = "admin"
) {
  console.log("Creating membership - communityId:", communityId, "memberId:", memberId);

  const membershipId = randomUUID();

  // Map community type to member_type
  const memberTypeMapping: { [key: string]: string } = {
    alumni: "alumni",
    entrepreneur: "entrepreneur",
    apartment: "resident",
    mixed: "generic",
  };

  const mappedMemberType = memberTypeMapping[memberType] || "generic";

  const sql = `
    INSERT INTO community_memberships
      (id, community_id, member_id, member_type, profile_data, role, is_active, joined_at, updated_at, invited_by)
    VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW(), $7)
    RETURNING *
  `;

  const res = await executeQuery(client, sql, [
    membershipId,
    communityId,
    memberId,
    mappedMemberType,
    JSON.stringify(profileData),
    role,
    memberId, // invited_by is self for community creator
  ]);

  return res.rows[0];
}

export async function createCommunity(data: any): Promise<Community> {
  return withTransaction(async (client) => {
    const communityId = randomUUID();

    /* 1. ENSURE MEMBER EXISTS (or create) */
    const member = await ensureMember(data.member_type_data);

    /* 2. CREATE COMMUNITY */
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
        member.id  // created_by references the member
      ]
    );

    /* 3. BUILD PROFILE DATA based on community type */
    const profileData = buildProfileData(data.type, data.member_type_data);

    /* 4. ADD MEMBERSHIP with admin role and profile data in JSONB */
    await addMembership(
      client,
      communityId,
      member.id,
      data.type,
      profileData,
      data.role || "admin"  // Default to admin for creator
    );

    /* 5. RETURN CREATED COMMUNITY */
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

      -- Build admins list from community_memberships
      COALESCE(
        json_agg(
          json_build_object(
            'id', m.id,
            'name', m.name,
            'phone', m.phone,
            'email', m.email,
            'role', cm.role
          )
        ) FILTER (WHERE cm.role IN ('admin', 'super_admin')),
        '[]'::json
      ) AS admins

    FROM communities c
    LEFT JOIN community_memberships cm
      ON cm.community_id = c.id
      AND cm.is_active = TRUE
      AND cm.role IN ('admin', 'super_admin')
    LEFT JOIN members m
      ON m.id = cm.member_id

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