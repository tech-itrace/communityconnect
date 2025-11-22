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

// Fixed typo: "Memebers" -> "Members"
export async function getCommunityWithMembersById(
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

      /* === ADMIN LIST === */
      (
        SELECT COALESCE(
          json_agg(
            jsonb_build_object(
              'id', m.id,
              'name', m.name,
              'phone', m.phone,
              'email', m.email,
              'role', cm.role
            )
          ), '[]'::json
        )
        FROM community_memberships cm
        JOIN members m ON m.id = cm.member_id
        WHERE cm.community_id = c.id
          AND cm.role IN ('admin', 'super_admin')
          AND cm.is_active = TRUE
      ) AS admins,

      /* === ALL MEMBERS LIST === */
      (
        SELECT COALESCE(
          json_agg(
            jsonb_build_object(
              'id', m.id,
              'name', m.name,
              'phone', m.phone,
              'email', m.email,
              'role', cm.role
            )
          ), '[]'::json
        )
        FROM community_memberships cm
        JOIN members m ON m.id = cm.member_id
        WHERE cm.community_id = c.id
      ) AS members

    FROM communities c
    WHERE c.id = $1
    GROUP BY c.id
  `;

  const res = await executor(sql, [id]);
  if (!res.rows.length) return null;

  return res.rows[0];
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

async function ensureMember(data: any) {
  console.log("data-check with members table: " + JSON.stringify(data));
  const findSql = `SELECT * FROM members WHERE phone = $1 OR email = $2`;
  const existing = await query(findSql, [data.phone, data.email]);
  if (existing.rows.length) {
    return existing.rows[0];
  } else {
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

    return res.rows[0];
  }
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

/**
 * Add a member to a community
 * Creates member if doesn't exist, then adds membership with profile data
 */
export async function addMemberToCommunity(data: {
  community_id: string;
  member_data: {
    name: string;
    phone: string;
    email?: string;
  };
  member_type: string; // alumni, entrepreneur, resident, generic
  profile_data?: any; // Type-specific profile data
  role?: string; // member, admin, super_admin
  invited_by?: string; // member_id of inviter
}): Promise<any> {
  return withTransaction(async (client) => {
    /* 1. CHECK IF COMMUNITY EXISTS */
    const communityCheck = await executeQuery(
      client,
      `SELECT id, type FROM communities WHERE id = $1 AND is_active = TRUE`,
      [data.community_id]
    );

    if (communityCheck.rows.length === 0) {
      throw new Error(`Community not found: ${data.community_id}`);
    }

    const community = communityCheck.rows[0];

    /* 2. ENSURE MEMBER EXISTS (or create) */
    const findMemberSql = `SELECT * FROM members WHERE phone = $1`;
    const existingMember = await executeQuery(client, findMemberSql, [data.member_data.phone]);

    let member;
    if (existingMember.rows.length > 0) {
      member = existingMember.rows[0];
      console.log(`Member already exists: ${member.id}`);
    } else {
      // Create new member
      const membershipId = randomUUID();
      const insertMemberSql = `
        INSERT INTO members (id, name, phone, email, created_at, updated_at, last_login, is_active)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), TRUE)
        RETURNING *
      `;
      const newMember = await executeQuery(client, insertMemberSql, [
        membershipId,
        data.member_data.name,
        data.member_data.phone,
        data.member_data.email || null
      ]);
      member = newMember.rows[0];
      console.log(`Created new member: ${member.id}`);
    }

    /* 3. CHECK IF MEMBERSHIP ALREADY EXISTS */
    const membershipCheck = await executeQuery(
      client,
      `SELECT id FROM community_memberships WHERE community_id = $1 AND member_id = $2`,
      [data.community_id, member.id]
    );

    if (membershipCheck.rows.length > 0) {
      throw new Error(`Member ${member.phone} is already part of this community`);
    }

    /* 4. DETERMINE MEMBER_TYPE */
    // Use provided member_type or infer from community type
    let memberType = data.member_type;
    if (!memberType) {
      const typeMapping: { [key: string]: string } = {
        alumni: "alumni",
        entrepreneur: "entrepreneur",
        apartment: "resident",
        mixed: "generic",
      };
      memberType = typeMapping[community.type] || "generic";
    }

    /* 5. BUILD PROFILE DATA */
    const profileData = data.profile_data || buildProfileData(community.type, data.profile_data || {});

    /* 6. CREATE MEMBERSHIP */
    const membershipId = randomUUID();
    const insertMembershipSql = `
      INSERT INTO community_memberships
        (id, community_id, member_id, member_type, profile_data, role, is_active, joined_at, updated_at, invited_by)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW(), $7)
      RETURNING *
    `;

    const membership = await executeQuery(client, insertMembershipSql, [
      membershipId,
      data.community_id,
      member.id,
      memberType,
      JSON.stringify(profileData),
      data.role || 'member',
      data.invited_by || null
    ]);

    /* 7. RETURN CREATED MEMBERSHIP WITH MEMBER DETAILS */
    return {
      membership: membership.rows[0],
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        email: member.email
      }
    };
  });
}

/**
 * Get all members of a community with their profile data
 */
export async function getCommunityMembers(
  community_id: string,
  filters?: {
    member_type?: string;
    role?: string;
    is_active?: boolean;
  }
): Promise<any[]> {
  const conditions = ['cm.community_id = $1'];
  const params: any[] = [community_id];
  let paramIndex = 2;

  if (filters?.member_type) {
    conditions.push(`cm.member_type = $${paramIndex}`);
    params.push(filters.member_type);
    paramIndex++;
  }

  if (filters?.role) {
    conditions.push(`cm.role = $${paramIndex}`);
    params.push(filters.role);
    paramIndex++;
  }

  if (filters?.is_active !== undefined) {
    conditions.push(`cm.is_active = $${paramIndex}`);
    params.push(filters.is_active);
    paramIndex++;
  }

  const sql = `
    SELECT
      m.id,
      m.name,
      m.phone,
      m.email,
      cm.member_type,
      cm.role,
      cm.profile_data,
      cm.joined_at,
      cm.is_active,
      invited_by_member.name AS invited_by_name
    FROM community_memberships cm
    JOIN members m ON m.id = cm.member_id
    LEFT JOIN members invited_by_member ON invited_by_member.id = cm.invited_by
    WHERE ${conditions.join(' AND ')}
    ORDER BY cm.joined_at DESC
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Update member's profile data in a community
 */
export async function updateCommunityMemberProfile(
  community_id: string,
  member_id: string,
  profile_data: any
): Promise<any> {
  const sql = `
    UPDATE community_memberships
    SET profile_data = $1, updated_at = NOW()
    WHERE community_id = $2 AND member_id = $3
    RETURNING *
  `;

  const result = await query(sql, [
    JSON.stringify(profile_data),
    community_id,
    member_id
  ]);

  if (result.rows.length === 0) {
    throw new Error('Membership not found');
  }

  return result.rows[0];
}

/**
 * Remove member from community (soft delete)
 */
export async function removeMemberFromCommunity(
  community_id: string,
  member_id: string
): Promise<boolean> {
  const sql = `
    UPDATE community_memberships
    SET is_active = FALSE, updated_at = NOW()
    WHERE community_id = $1 AND member_id = $2
    RETURNING id
  `;

  const result = await query(sql, [community_id, member_id]);
  return result.rows.length > 0;
}

/**
 * Update member's role in a community
 */
export async function updateMemberRole(
  community_id: string,
  member_id: string,
  new_role: 'member' | 'admin' | 'super_admin'
): Promise<any> {
  const sql = `
    UPDATE community_memberships
    SET role = $1, updated_at = NOW()
    WHERE community_id = $2 AND member_id = $3
    RETURNING *
  `;

  const result = await query(sql, [new_role, community_id, member_id]);

  if (result.rows.length === 0) {
    throw new Error('Membership not found');
  }

  return result.rows[0];
}

// GET Single Member of specific community
export async function getCommunityMemberById(
  community_id: string,
  member_id: string,
  client?: any
): Promise<any | null> {
  const executor = client
    ? (sql: string, params?: any[]) => executeQuery(client, sql, params)
    : query;

  const sql = `
    SELECT
      jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'phone', m.phone,
        'email', m.email,
        'member_type', cm.member_type,
        'role', cm.role,
        'profile_data', cm.profile_data,
        'joined_at', cm.joined_at,
        'updated_at', cm.updated_at,
        'is_active', cm.is_active
      ) AS member
    FROM community_memberships cm
    JOIN members m ON m.id = cm.member_id
    WHERE cm.community_id = $1
      AND cm.member_id = $2
    LIMIT 1;
  `;

  const res = await executor(sql, [community_id, member_id]);
  if (!res.rows.length) return null;

  return res.rows[0].member;
}