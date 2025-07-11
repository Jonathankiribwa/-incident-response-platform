import { Router } from 'express';
import { createAlert, getAlertById, listAlerts, updateAlertStatus, Alert } from '../models/alert';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendKafkaMessage } from '../config/kafka';

const router = Router();

// GET /api/alerts - List/search alerts
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const filters: Partial<Alert> = {};
    if (req.query['status']) filters['status'] = req.query['status'] as Alert['status'];
    if (req.query['severity']) filters['severity'] = req.query['severity'] as Alert['severity'];
    if (req.query['type']) filters['type'] = req.query['type'] as string;
    if (req.user?.organizationId) filters['organization_id'] = req.user.organizationId;
    const alerts = await listAlerts(filters);
    return res.json({ alerts });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/alerts - Ingest new alert
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const alert = await createAlert({
      ...req.body,
      organization_id: req.user?.organizationId,
      status: req.body.status || 'new',
      detected_at: req.body.detected_at || new Date().toISOString(),
    });

    // Publish to Kafka
    await sendKafkaMessage('alerts', alert as unknown as Record<string, unknown>, alert.id);

    // Call ML pipeline for classification and runbook suggestion (placeholder URL)
    try {
      const fetch = (await import('node-fetch')).default;
      const mlResponse = await fetch(process.env['ML_PIPELINE_URL'] || 'http://localhost:5000/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert }),
      });
      if (mlResponse.ok) {
        await mlResponse.json();
        // Optionally, update alert with classification/suggestion here
        // e.g., await updateAlertClassification(alert.id, mlData.classification, mlData.suggestion);
      }
    } catch (mlError) {
      // Log but do not block alert creation
      console.error('ML pipeline call failed:', mlError);
    }

    return res.status(201).json({ alert });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to create alert' });
  }
});

// GET /api/alerts/:id - Get alert details
router.get('/:id', async (req, res) => {
  try {
    const alert = await getAlertById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ alert });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// PATCH /api/alerts/:id - Update alert status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const alert = await updateAlertStatus(req.params.id, status);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ alert });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to update alert' });
  }
});

export default router; 