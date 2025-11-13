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
export async function createCommunity(communityData: {
    name: string;
    description?: string;
    type?: string;
    admins?: any; // JSON field (will be string from frontend)
    rules?: string;
    is_bot_enable?: boolean;
    created_at?: Date;
    updated_at?: Date;
    is_active?: boolean;
    created_by?: string;
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

    const queryText = `
        INSERT INTO community
        (name, description, type, admins, rules, is_bot_enable, is_active, created_by, created_at, updated_at) 
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id
    `;

    const values = [
        name,
        description,
        type,
        admins, // This is already a JSON string from frontend
        rules,
        is_bot_enable,
        is_active,
        created_by
    ];

    console.log('[Community Service] Query values:', values);

    const result = await query(queryText, values);

    const communityId = result.rows[0].id;

    const createdCommunity = await getCommunityById(communityId);
    
    if (!createdCommunity) {
        throw new Error('Failed to retrieve created community');
    }

    return createdCommunity;
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