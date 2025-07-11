import { getDatabase } from '../config/database';

export interface Alert {
  id: string;
  source: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'resolved' | 'dismissed';
  description?: string;
  detected_at: string;
  organization_id: string;
  raw_data?: any;
  incident_id?: string | null;
  created_at: string;
  updated_at: string;
}

export async function createAlert(alert: Omit<Alert, 'id' | 'created_at' | 'updated_at'>): Promise<Alert> {
  const db = getDatabase();
  const result = await db.query(
    `INSERT INTO alerts (source, type, severity, status, description, detected_at, organization_id, raw_data, incident_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      alert.source,
      alert.type,
      alert.severity,
      alert.status,
      alert.description,
      alert.detected_at,
      alert.organization_id,
      alert.raw_data,
      alert.incident_id || null
    ]
  );
  return result.rows[0];
}

export async function getAlertById(id: string): Promise<Alert | null> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM alerts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listAlerts(filters: Partial<Alert> = {}): Promise<Alert[]> {
  const db = getDatabase();
  // Simple filter by status, severity, type, organization_id
  let query = 'SELECT * FROM alerts WHERE 1=1';
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
  if (filters.type) {
    query += ` AND type = $${idx++}`;
    params.push(filters.type);
  }
  if (filters.organization_id) {
    query += ` AND organization_id = $${idx++}`;
    params.push(filters.organization_id);
  }
  query += ' ORDER BY detected_at DESC LIMIT 100';
  const result = await db.query(query, params);
  return result.rows;
}

export async function updateAlertStatus(id: string, status: Alert['status']): Promise<Alert | null> {
  const db = getDatabase();
  const result = await db.query(
    'UPDATE alerts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
} 