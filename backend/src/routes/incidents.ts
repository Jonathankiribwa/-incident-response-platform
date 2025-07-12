import { Router } from 'express';
import {
  createIncident,
  getIncidentById,
  listIncidents,
  updateIncidentStatus,
  addIncidentComment,
  addIncidentTag,
  assignIncident,
  Incident,
  logAuditAction,
  getAuditTrail
} from '../models/incident';
import { AuthenticatedRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { randomInt } from 'crypto';
import { sendEmail } from '../utils/email';
import { findUserById } from '../models/user';

const router = Router();

// GET /api/incidents - List/search incidents
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const filters: Partial<Incident> = {};
    if (req.query['status']) filters['status'] = req.query['status'] as Incident['status'];
    if (req.query['severity']) filters['severity'] = req.query['severity'] as Incident['severity'];
    if (req.user?.organizationId) filters['organization_id'] = req.user.organizationId;
    const incidents = await listIncidents(filters);
    return res.json({ incidents });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch incidents' });
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
      assigned_team: req.body.assigned_team || null,
      shift: req.body.shift || null,
    });
    return res.status(201).json({ incident });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to create incident' });
  }
});

// GET /api/incidents/:id - Get incident details
router.get('/:id', async (req, res) => {
  try {
    const incident = await getIncidentById(String(req.params['id']));
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    return res.json({ incident });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// PATCH /api/incidents/:id - Update incident status or team/shift
router.patch('/:id', async (req, res) => {
  try {
    const { status, assigned_team, shift, resolution_notes } = req.body;
    let incident = null;
    let auditMessages = [];
    const actor = (req as AuthenticatedRequest).user?.email || 'unknown';
    if (status) {
      // Require resolution_notes and resolved_by for resolved/closed
      if ((status === 'resolved' || status === 'closed')) {
        if (!resolution_notes) return res.status(400).json({ error: 'Resolution notes are required to resolve/close an incident.' });
        incident = await updateIncidentStatus(String(req.params['id']), status as Incident['status'], resolution_notes, actor);
        auditMessages.push({ action: 'status_change', details: `Status changed to ${status}` });
        auditMessages.push({ action: 'resolution', details: `Resolution by ${actor}: ${resolution_notes}` });
      } else {
        incident = await updateIncidentStatus(String(req.params['id']), status as Incident['status']);
        auditMessages.push({ action: 'status_change', details: `Status changed to ${status}` });
      }
      if (!incident) return res.status(404).json({ error: 'Incident not found' });
    }
    if (assigned_team || shift) {
      // Only update if at least one is provided
      const db = getDatabase();
      const result = await db.query(
        'UPDATE incidents SET assigned_team = COALESCE($1, assigned_team), shift = COALESCE($2, shift), updated_at = NOW() WHERE id = $3 RETURNING *',
        [typeof assigned_team === 'string' ? assigned_team : null, typeof shift === 'string' ? shift : null, String(req.params['id'])]
      );
      incident = result.rows[0] || incident;
      if (assigned_team) auditMessages.push({ action: 'team_change', details: `Assigned team set to ${String(assigned_team ?? '')}` });
      if (shift) auditMessages.push({ action: 'shift_change', details: `Shift set to ${String(shift ?? '')}` });
    }
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    // Audit log
    for (const msg of auditMessages) {
      await logAuditAction(String(req.params['id']), String(msg.action), String(actor ?? ''), String(msg.details ?? ''));
    }
    return res.json({ incident });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to update incident' });
  }
});

// PATCH /api/incidents/:id/team-shift - Update assigned_team and shift only
router.patch('/:id/team-shift', async (req: AuthenticatedRequest, res) => {
  try {
    const { assigned_team, shift } = req.body;
    if (!assigned_team && !shift) return res.status(400).json({ error: 'assigned_team or shift required' });
    const incident = await getIncidentById(String(req.params['id']));
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const updated = await getDatabase().query(
      'UPDATE incidents SET assigned_team = COALESCE($1, assigned_team), shift = COALESCE($2, shift), updated_at = NOW() WHERE id = $3 RETURNING *',
      [typeof assigned_team === 'string' ? assigned_team : null, typeof shift === 'string' ? shift : null, String(req.params['id'])]
    );
    const actor = (req as AuthenticatedRequest).user?.email || 'unknown';
    if (assigned_team && assigned_team !== incident.assigned_team) {
      await logAuditAction(String(req.params['id']), 'team_change', String(actor ?? ''), `Assigned team set to ${String(assigned_team ?? '')}`);
    }
    if (shift && shift !== incident.shift) {
      await logAuditAction(String(req.params['id']), 'shift_change', String(actor ?? ''), `Shift set to ${String(shift ?? '')}`);
    }
    return res.json({ incident: updated.rows[0] });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to update team/shift' });
  }
});

// POST /api/incidents/:id/comments - Add comment
router.post('/:id/comments', async (req: AuthenticatedRequest, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Comment is required' });
    const incidentId = String(req.params['id']);
    const actor = (req as AuthenticatedRequest).user?.email || 'unknown';
    const safeComment = typeof comment === 'string' ? comment : '';
    const incident = await addIncidentComment(incidentId, String(actor), safeComment);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    // Audit log
    await logAuditAction(incidentId, 'comment', actor, safeComment);
    return res.json({ incident });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to add comment' });
  }
});

// POST /api/incidents/:id/tags - Add tag
router.post('/:id/tags', async (req, res) => {
  try {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ error: 'Tag is required' });
    const incident = await addIncidentTag(req.params['id'] as string, tag);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    return res.json({ incident });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to add tag' });
  }
});

// POST /api/incidents/:id/assign - Assign to user
router.post('/:id/assign', async (req, res) => {
  try {
    const { assignee } = req.body;
    if (!assignee) return res.status(400).json({ error: 'Assignee is required' });
    const incident = await assignIncident(req.params['id'] as string, assignee);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    // Audit log
    const actor = (req as AuthenticatedRequest).user?.email || 'unknown';
    await logAuditAction(req.params['id'], 'assign', actor, `Assigned to ${assignee}`);
    // Email notification
    let assigneeEmail = assignee;
    // If assignee is an email, use directly; if it's an ID, look up user
    if (!assignee.includes('@')) {
      const user = await findUserById(assignee);
      if (user) assigneeEmail = user.email;
    }
    await sendEmail(
      assigneeEmail,
      `Incident Assigned: ${incident.title}`,
      `You have been assigned to incident: ${incident.title}\n\nDescription: ${incident.description}`
    );
    // In-app notification
    const io = req.app.get('io');
    if (io) io.emit('incident-assigned', { assignee: assigneeEmail, incident });
    return res.json({ incident });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to assign incident' });
  }
});

function getSimulatedMLPriority(data: any): { ml_priority: number, ml_label: string } {
  // Simple logic: high for critical/overheating, medium for jams, low for delays, etc.
  let score = 50;
  let label = 'Medium';
  if (data.priority === 'critical' || data.temp > 900 || data.severity === 'high') {
    score = 95;
    label = 'Critical';
  } else if (data.priority === 'high') {
    score = 80;
    label = 'High';
  } else if (data.priority === 'low') {
    score = 20;
    label = 'Low';
  }
  return { ml_priority: score, ml_label: label };
}

// Mock Data Ingestion Endpoint
router.post('/api/iot/ingest', async (req, res) => {
  // Accepts: { type: 'sensor'|'machine'|'security'|'logistics', data: {...} }
  const { type, data } = req.body;
  if (!type || !data) {
    return res.status(400).json({ error: 'type and data are required' });
  }
  // Simulate ML priority
  const { ml_priority, ml_label } = getSimulatedMLPriority(data);
  // For demo, create an incident from the data
  const db = getDatabase();
  const description = `[${type.toUpperCase()}] ${JSON.stringify(data)}`;
  const result = await db.query(
    'INSERT INTO incidents (title, description, status, priority, ml_priority, ml_label, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
    [data.title || `${type} event`, description, 'open', data.priority || 'medium', ml_priority, ml_label]
  );
  // Emit real-time update
  const io = req.app.get('io');
  if (io) io.emit('incident-updated', result.rows[0]);
  return res.status(201).json({ incident: result.rows[0] });
});

// Incident Templates for Simulation
const incidentTemplates = [
  {
    type: 'Boiler Overheating',
    data: { title: 'Boiler Overheating', temp: 950, threshold: 900, location: 'Furnace 2', priority: 'high' }
  },
  {
    type: 'Unauthorized VPN Login',
    data: { title: 'Unauthorized VPN Login', user: 'jdoe', location: 'Offsite', time: '02:13', priority: 'high' }
  },
  {
    type: 'Conveyor Jam',
    data: { title: 'Conveyor Jam', machine: 'Conveyor 7', error_code: 'JAM-ERR', priority: 'medium' }
  },
  {
    type: 'Supply Chain Delay',
    data: { title: 'Supply Chain Delay', supplier: 'SteelCo', expected: '2025-07-12', priority: 'low' }
  },
  {
    type: 'Power Fluctuation in Rolling Mill',
    data: { title: 'Power Fluctuation', voltage: 380, expected: 400, location: 'Rolling Mill', priority: 'medium' }
  },
  {
    type: 'Water Leak Detected',
    data: { title: 'Water Leak Detected', sensor: 'WL-22', location: 'Cooling System', severity: 'high', priority: 'high' }
  },
  {
    type: 'PLC Communication Failure',
    data: { title: 'PLC Communication Failure', plc_id: 'PLC-7', error: 'No response', priority: 'high' }
  },
  {
    type: 'Gas Pressure Anomaly',
    data: { title: 'Gas Pressure Anomaly', pressure: 120, threshold: 100, location: 'Gas Line 3', priority: 'high' }
  },
  {
    type: 'Emergency Stop Triggered',
    data: { title: 'Emergency Stop Triggered', line: 'Press Line 1', operator: 'mlee', time: '15:42', priority: 'critical' }
  }
];

// GET /api/simulate/templates
router.get('/api/simulate/templates', (_req, res) => {
  res.json({ templates: incidentTemplates.map(t => t.type) });
});

// POST /api/simulate/incident
router.post('/api/simulate/incident', async (req, res) => {
  const { type } = req.body;
  const template = incidentTemplates.find(t => t.type === type);
  if (!template) {
    return res.status(400).json({ error: 'Unknown incident type' });
  }
  // Simulate ML priority
  const { ml_priority, ml_label } = getSimulatedMLPriority(template.data);
  // Reuse the ingestion logic
  const db = getDatabase();
  const description = `[SIMULATED] [${type.toUpperCase()}] ${JSON.stringify(template.data)}`;
  const result = await db.query(
    'INSERT INTO incidents (title, description, status, priority, ml_priority, ml_label, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
    [template.data.title, description, 'open', template.data.priority || 'medium', ml_priority, ml_label]
  );
  // Emit real-time update
  const io = req.app.get('io');
  if (io) io.emit('incident-updated', result.rows[0]);
  return res.status(201).json({ incident: result.rows[0] });
});

let demoModeInterval: NodeJS.Timeout | null = null;

// POST /api/simulate/demo-mode { action: 'start' | 'stop' }
router.post('/api/simulate/demo-mode', (req, res) => {
  const { action } = req.body;
  if (action === 'start') {
    if (demoModeInterval) return res.json({ message: 'Demo mode already running' });
    demoModeInterval = setInterval(async () => {
      if (incidentTemplates.length === 0) return;
      const idx = randomInt(incidentTemplates.length);
      const template = incidentTemplates[idx];
      if (!template) return;
      const { ml_priority, ml_label } = getSimulatedMLPriority(template.data);
      const db = getDatabase();
      const description = `[DEMO MODE] [${template.type.toUpperCase()}] ${JSON.stringify(template.data)}`;
      const result = await db.query(
        'INSERT INTO incidents (title, description, status, priority, ml_priority, ml_label, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
        [template.data.title, description, 'open', template.data.priority || 'medium', ml_priority, ml_label]
      );
      // Emit real-time update
      const io = req.app.get('io');
      if (io) io.emit('incident-updated', result.rows[0]);
    }, 10000); // Every 10 seconds
    return res.json({ message: 'Demo mode started' });
  } else if (action === 'stop') {
    if (demoModeInterval) {
      clearInterval(demoModeInterval);
      demoModeInterval = null;
      return res.json({ message: 'Demo mode stopped' });
    } else {
      return res.json({ message: 'Demo mode was not running' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
});

// GET /api/incidents/:id/audit - Get audit trail for an incident
router.get('/:id/audit', async (req, res) => {
  try {
    const audit = await getAuditTrail(req.params['id']);
    res.json({ audit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

export default router; 