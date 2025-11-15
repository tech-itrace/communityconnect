import { query } from "../config/db";

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
            id,
            name,
            description,
            type,
            rules,
            admins,
            is_bot_enable,
            is_active,
            created_at,
            updated_at,
            created_by
        FROM community
        WHERE id = $1 AND is_active = TRUE
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
        admins: row.admins, 
        rules: row.rules,
        is_bot_enable: row.is_bot_enable,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_active: row.is_active,
        created_by: row.created_by,
    };
}

/** Create a new community */
// export async function createCommunity(communityData: {
//     name: string;
//     description?: string;
//     type?: string;
//     admins?: any; // JSON field (will be string from frontend)
//     rules?: string;
//     is_bot_enable?: boolean;
//     created_at?: Date;
//     updated_at?: Date;
//     is_active?: boolean;
//     created_by?: string;
// }): Promise<Community> {
//     console.log(`[Community Service] Creating community: ${communityData.name}`);

//     const {
//         name,
//         description,
//         type,
//         admins,
//         rules,
//         is_bot_enable = false,
//         is_active = true,
//         created_by,
//     } = communityData;

//     const queryText = `
//         INSERT INTO community
//         (name, description, type, admins, rules, is_bot_enable, is_active, created_by, created_at, updated_at) 
//         VALUES
//         ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
//         RETURNING id
//     `;

//     const values = [
//         name,
//         description,
//         type,
//         admins, // This is already a JSON string from frontend
//         rules,
//         is_bot_enable,
//         is_active,
//         created_by
//     ];

//     console.log('[Community Service] Query values:', values);

//     const result = await query(queryText, values);

//     const communityId = result.rows[0].id;

//     const createdCommunity = await getCommunityById(communityId);
    
//     if (!createdCommunity) {
//         throw new Error('Failed to retrieve created community');
//     }

//     return createdCommunity;
// }

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
async function createTypeMember(type: string, memberId: string, data: any) {
  if (type === "alumini") {
    const sql = `
      INSERT INTO alumini_members
      (id, college, graduation_year, degree, department, roll_no, current_organization, designation, member_id, is_active, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE, NOW())
      RETURNING *
    `;

    const params = [
      data.college,
      data.graduation_year,
      data.degree,
      data.department,
      data.roll_no,
      data.current_organization,
      data.designation,
      memberId
    ];

    const res = await query(sql, params);
    return res.rows[0];
  }

  if (type === "entrepreneur") {
    // fill later
  }

  if (type === "religious") {
    // fill later
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

  // Step 1: Create Community
  const insertCommunitySQL = `
    INSERT INTO community
    (name, description, type, admins, rules, is_bot_enable, is_active, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING id
  `;

  const values = [
    name,
    description,
    type,
    admins, 
    rules,
    is_bot_enable,
    is_active,
    created_by
  ];

  const result = await query(insertCommunitySQL, values);
  const communityId = result.rows[0].id;

  console.log("✔ Community created with ID:", communityId);


  // Step 2: PROCESS EACH ADMIN AS MEMBER
  for (const admin of adminList) {
    console.log("Processing admin:", admin);

    const existingMember = await findMember(admin.phone, admin.email);

    let memberId;
    if (existingMember) {
      console.log("✔ Member already exists:", existingMember.id);
      memberId = existingMember.id;
    } else {
      console.log("➕ Creating new member");
      const newMember = await createMember(admin);
      memberId = newMember.id;
    }

    // Step 3: Insert into type-specific table
    const typeMember = await createTypeMember(type!, memberId, communityData.member_type_data);


    // Step 4: Insert into community_members_types
    await addCommunityMemberMapping(
      communityId,
      memberId,
      typeMember?.id || null
    );
  }

  // Step 5: Return full community
  const createdCommunity = await getCommunityById(communityId);

  return createdCommunity!;
}


/** Get all communities */
export async function getAllCommunity(): Promise<Community[]> {
  const queryText = `
    SELECT * FROM community
    WHERE is_active = true
    ORDER BY created_at DESC;
  `;
  const result = await query(queryText);
  return result.rows;
}

/** Update community */
export async function updateCommunity(
  id: string,
  updates: Partial<Community>
): Promise<Community | null> {
  // ✅ Only allow columns that actually exist in your "community" table
  const allowedFields = [
    "name",
    "description",
    "type",
    "rules",
    "admins",
    "is_bot_enable",
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
    UPDATE community
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
    UPDATE community
    SET is_active = false, updated_at = NOW()
    WHERE id = $1;
  `;
  await query(queryText, [id]);
  return true;
}