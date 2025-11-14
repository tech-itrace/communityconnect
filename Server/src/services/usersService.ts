import { query } from '../config/db';
import bcrypt from "bcrypt";

export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  purpose?: string;
  about?: string;
  phone?: string;
  created_at?: Date;
}

// 🔹 Create User
export async function createUser(user: User): Promise<User> {
  // Check if email already exists
  const existing = await getUserByEmail(user.email);
  if (existing) throw new Error("Email already registered");
  
  const hashedPassword = await bcrypt.hash(user.password!, 10);
  
  const queryText = `
    INSERT INTO users (name, email, password, purpose, about, phone, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id, name, email, purpose, about, phone, created_at;
  `;
  
  const values = [
    user.name,
    user.email,
    hashedPassword,
    user.purpose || null,
    user.about || null,
    user.phone || null,
  ];
  
  const { rows } = await query(queryText, values);
  return rows[0];
}

// For authentication (includes password)
export async function getUserByEmailWithPassword(email: string): Promise<User | null> {
  const { rows } = await query(
    `SELECT id, name, email, password, purpose, about, phone, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

// For general use (excludes password)
export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await query(
    `SELECT id, name, email, purpose, about, phone, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

// 🔹 Get User By Email

// 🔹 Update User
// export async function updateUser(id: number, user: Partial<User>): Promise<User> {
//   const existing = await getUserById(id);
//   if (!existing) throw new Error("User not found");

//   const updated = {
//     name: user.name || existing.name,
//     email: user.email || existing.email,
//     purpose: user.purpose || existing.purpose,
//     about: user.about || existing.about,
//     phone: user.phone || existing.phone,
//   };

//   const values: any[] = [updated.name, updated.email, updated.purpose, updated.about, updated.phone, id];
//   let queryText = `
//     UPDATE "users"
//     SET name = $1, email = $2, purpose = $3, about = $4, phone = $5
//   `;

//   if (user.password) {
//     const hashedPassword = await bcrypt.hash(user.password, 10);
//     queryText += `, password = $6 WHERE id = $7 RETURNING id, name, email, purpose, about AS "about", phone, created_at AS "created_at"`;
//     values.push(hashedPassword, id);
//   } else {
//     queryText += ` WHERE id = $6 RETURNING id, name, email, purpose, about AS "about", phone, created_at AS "created_at"`;
//   }

//   const { rows } = await query(queryText, values);
//   return rows[0];
// }

// 🔹 Delete User
export async function deleteUser(id: number): Promise<void> {
  await query(`DELETE FROM "users" WHERE id = $1`, [id]);
}

// 🔹 Authenticate User (Email + Password)
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const match = await bcrypt.compare(password, user.password!);
  if (!match) return null;

  // Exclude password from returned object
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
