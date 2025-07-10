import { Router } from 'express';
import {
  createIncident,
  getIncidentById,
  listIncidents,
  updateIncidentStatus,
  addIncidentComment,
  addIncidentTag,
  assignIncident,
  Incident
} from '../models/incident';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/incidents - List/search incidents
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const filters: Partial<Incident> = {};
    if (req.query['status']) filters['status'] = req.query['status'] as Incident['status'];
    if (req.query['severity']) filters['severity'] = req.query['severity'] as Incident['severity'];
    if (req.user?.organizationId) filters['organization_id'] = req.user.organizationId;
    const incidents = await listIncidents(filters);
    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// POST /api/incidents - Create new incident
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const incident = await createIncident({
      ...req.body,
      organization_id: req.user?.organizationId,
      status: req.body.status || 'open',
      comments: req.body.comments || [],
      alerts: req.body.alerts || [],
      tags: req.body.tags || [],
    });
    res.status(201).json({ incident });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create incident' });
  }
});

// GET /api/incidents/:id - Get incident details
router.get('/:id', async (req, res) => {
  try {
    const incident = await getIncidentById(req.params['id'] as string);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// PATCH /api/incidents/:id - Update incident status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const incident = await updateIncidentStatus(req.params['id'] as string, status);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update incident' });
  }
});

// POST /api/incidents/:id/comments - Add comment
router.post('/:id/comments', async (req: AuthenticatedRequest, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Comment is required' });
    const user = req.user?.email || 'unknown';
    const incident = await addIncidentComment(req.params['id'] as string, user, comment);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add comment' });
  }
});

// POST /api/incidents/:id/tags - Add tag
router.post('/:id/tags', async (req, res) => {
  try {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ error: 'Tag is required' });
    const incident = await addIncidentTag(req.params['id'] as string, tag);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add tag' });
  }
});

// POST /api/incidents/:id/assign - Assign to user
router.post('/:id/assign', async (req, res) => {
  try {
    const { assignee } = req.body;
    if (!assignee) return res.status(400).json({ error: 'Assignee is required' });
    const incident = await assignIncident(req.params['id'] as string, assignee);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (error) {
    res.status(400).json({ error: 'Failed to assign incident' });
  }
});

export default router; 