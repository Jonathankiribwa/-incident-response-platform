import { Router } from 'express';
const router = Router();

// Example: /api/runbooks
router.get('/', (req, res) => {
  res.json({ runbooks: [] });
});

export default router; 