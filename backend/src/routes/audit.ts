import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
const router = Router();

// Example: /api/audit
router.get('/', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({
    logs: [
      { id: 1, action: 'User login', user: 'admin@example.com', timestamp: '2024-06-08T10:00:00Z' },
      { id: 2, action: 'User created', user: 'admin@example.com', timestamp: '2024-06-08T10:05:00Z' },
      { id: 3, action: 'Incident resolved', user: 'user1@example.com', timestamp: '2024-06-08T11:00:00Z' },
    ],
  });
});

export default router; 