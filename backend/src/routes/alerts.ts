import { Router } from 'express';
const router = Router();

// Example: /api/alerts
router.get('/', (req, res) => {
  res.json({ alerts: [] });
});

export default router; 