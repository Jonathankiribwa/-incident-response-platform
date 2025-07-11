import { getDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  password: string;
  role: string;
}

export async function createUser(email: string, password: string, role: string = 'user'): Promise<User> {
  const db = getDatabase();
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
    [email, hashedPassword, role]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listUsers(): Promise<User[]> {
  const db = getDatabase();
  const result = await db.query('SELECT id, email, role FROM users', []);
  return result.rows;
} 