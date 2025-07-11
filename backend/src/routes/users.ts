import { Router } from 'express';
import { listUsers, findUserByEmail, createUser } from '../models/user';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// Middleware to check admin role
function requireAdmin(req: AuthenticatedRequest, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/users - List all users (admin only)
router.get('/', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create a new user (admin only)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }
  try {
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const user = await createUser(email, password, role);
    return res.status(201).json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/users/:id/role - Update user role (admin only)
router.patch('/:id/role', authMiddleware, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'Role is required' });
  try {
    const db = require('../config/database').getDatabase();
    const result = await db.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role', [role, req.params['id']]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const db = require('../config/database').getDatabase();
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, email, role', [req.params['id']]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router; 