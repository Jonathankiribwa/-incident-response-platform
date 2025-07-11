import { Router } from 'express';
const router = Router();

// Example: /api/runbooks
router.get('/', (_req, res) => {
  return res.json({ runbooks: [] });
});

export default router; 