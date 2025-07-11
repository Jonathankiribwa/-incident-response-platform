import { getDatabase } from '../config/database';

export interface Incident {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'triaged' | 'in_progress' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  assignee?: string;
  comments: Array<{ user: string; comment: string; timestamp: string }>;
  alerts: string[];
  organization_id: string;
  assigned_team?: string;
  shift?: 'Day' | 'Night' | 'Swing';
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export async function createIncident(incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<Incident> {
  const db = getDatabase();
  const result = await db.query(
    `INSERT INTO incidents (title, description, status, severity, tags, assignee, comments, alerts, organization_id, assigned_team, shift, resolution_notes, resolved_by, resolved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      incident.title,
      incident.description,
      incident.status,
      incident.severity,
      incident.tags,
      incident.assignee,
      JSON.stringify(incident.comments || []),
      incident.alerts,
      incident.organization_id,
      incident.assigned_team || null,
      incident.shift || null,
      incident.resolution_notes || null,
      incident.resolved_by || null,
      incident.resolved_at || null
    ]
  );
  return result.rows[0];
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listIncidents(filters: Partial<Incident> = {}): Promise<Incident[]> {
  const db = getDatabase();
  let query = 'SELECT * FROM incidents WHERE 1=1';
  const params: any[] = [];
  let idx = 1;
  if (filters.status) {
    query += ` AND status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters.severity) {
    query += ` AND severity = $${idx++}`;
    params.push(filters.severity);
  }
  if (filters.organization_id) {
    query += ` AND organization_id = $${idx++}`;
    params.push(filters.organization_id);
  }
  if (filters.assigned_team) {
    query += ` AND assigned_team = $${idx++}`;
    params.push(filters.assigned_team);
  }
  if (filters.shift) {
    query += ` AND shift = $${idx++}`;
    params.push(filters.shift);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const result = await db.query(query, params);
  return result.rows;
}

export async function updateIncidentStatus(id: string, status: Incident['status'], resolution_notes?: string, resolved_by?: string): Promise<Incident | null> {
  const db = getDatabase();
  if (status === 'resolved' || status === 'closed') {
    if (!resolution_notes || !resolved_by) throw new Error('Resolution notes and resolved_by are required');
    const result = await db.query(
      'UPDATE incidents SET status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = NOW(), updated_at = NOW() WHERE id = $4 RETURNING *',
      [status, resolution_notes, resolved_by, id]
    );
    return result.rows[0] || null;
  } else {
    const result = await db.query(
      'UPDATE incidents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0] || null;
  }
}

export async function updateIncidentTeamAndShift(id: string, assigned_team: string, shift: 'Day' | 'Night' | 'Swing'): Promise<Incident | null> {
  const db = getDatabase();
  const result = await db.query(
    'UPDATE incidents SET assigned_team = $1, shift = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [assigned_team, shift, id]
  );
  return result.rows[0] || null;
}

export async function addIncidentComment(id: string, user: string, comment: string): Promise<Incident | null> {
  const db = getDatabase();
  const incident = await getIncidentById(id);
  if (!incident) return null;
  const newComment = { user, comment, timestamp: new Date().toISOString() };
  const updatedComments = [...(incident.comments || []), newComment];
  const result = await db.query(
    'UPDATE incidents SET comments = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [JSON.stringify(updatedComments), id]
  );
  return result.rows[0] || null;
}

export async function addIncidentTag(id: string, tag: string): Promise<Incident | null> {
  const db = getDatabase();
  const incident = await getIncidentById(id);
  if (!incident) return null;
  const updatedTags = Array.from(new Set([...(incident.tags || []), tag]));
  const result = await db.query(
    'UPDATE incidents SET tags = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [updatedTags, id]
  );
  return result.rows[0] || null;
}

export async function assignIncident(id: string, assignee: string): Promise<Incident | null> {
  const db = getDatabase();
  const result = await db.query(
    'UPDATE incidents SET assignee = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [assignee, id]
  );
  return result.rows[0] || null;
}

export async function logAuditAction(incidentId: string, action: string, actor: string, details: string) {
  const db = getDatabase();
  await db.query(
    'INSERT INTO audit_log (incident_id, action, actor, details) VALUES ($1, $2, $3, $4)',
    [incidentId, action, actor, details]
  );
}

export async function getAuditTrail(incidentId: string) {
  const db = getDatabase();
  const result = await db.query(
    'SELECT * FROM audit_log WHERE incident_id = $1 ORDER BY created_at ASC',
    [incidentId]
  );
  return result.rows;
} 