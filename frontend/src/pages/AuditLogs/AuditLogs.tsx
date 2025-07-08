import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useAuth } from '../../hooks/useAuth';

interface AuditLog {
  id: number;
  action: string;
  user: string;
  timestamp: string;
}

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'action', headerName: 'Action', width: 200 },
  { field: 'user', headerName: 'User', width: 200 },
  { field: 'timestamp', headerName: 'Timestamp', width: 200 },
];

const AuditLogs: React.FC = () => {
  const { isAuthenticated, authFetch, currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    if (currentUser?.role !== 'admin') {
      setError('You are not authorized to view this page.');
      setLoading(false);
      return;
    }
    authFetch('/api/audit')
      .then(res => {
        if (res.status === 403) throw new Error('You are not authorized to view this page.');
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setLogs(data.logs))
      .catch((err) => setError(err.message || 'Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authFetch, currentUser]);

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Audit Logs</Typography>
      <Box sx={{ height: 400, width: '100%', background: '#fff', borderRadius: 2, boxShadow: 1 }}>
        <DataGrid
          rows={logs}
          columns={columns}
          pageSizeOptions={[5]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5, page: 0 },
            },
          }}
          loading={loading}
        />
      </Box>
    </Box>
  );
};

export default AuditLogs; 