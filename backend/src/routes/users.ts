import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getDatabase } from '../config/database';
const router = Router();

// Example: /api/users
router.get('/', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({
    users: [
      { id: '1', email: 'admin@example.com', role: 'admin' },
      { id: '2', email: 'user1@example.com', role: 'user' },
      { id: '3', email: 'user2@example.com', role: 'user' },
    ],
  });
});

// Update user (admin only)
router.put('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { email, role } = req.body;
  try {
    const db = getDatabase();
    const result = await db.query('UPDATE users SET email = $1, role = $2 WHERE id = $3 RETURNING id, email, role', [email, role, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDatabase();
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted', id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 