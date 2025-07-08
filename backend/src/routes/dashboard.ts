import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
const router = Router();

// Example: /api/dashboard
router.get('/', authMiddleware, (req, res) => {
  res.json({
    incidentsByDay: [
      { name: 'Mon', incidents: 2 },
      { name: 'Tue', incidents: 5 },
      { name: 'Wed', incidents: 3 },
      { name: 'Thu', incidents: 7 },
      { name: 'Fri', incidents: 4 },
      { name: 'Sat', incidents: 1 },
      { name: 'Sun', incidents: 0 },
    ],
    alertSeverity: [
      { name: 'Critical', value: 4 },
      { name: 'High', value: 7 },
      { name: 'Medium', value: 10 },
      { name: 'Low', value: 5 },
    ],
  });
});

export default router; 