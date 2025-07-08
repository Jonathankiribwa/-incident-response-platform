import { Router } from 'express';
const router = Router();

// Example: /api/incidents
router.get('/', (req, res) => {
  res.json({ incidents: [] });
});

export default router; 