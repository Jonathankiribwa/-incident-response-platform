import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import { useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import TableSortLabel from '@mui/material/TableSortLabel';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const mockIncidents = [
  {
    id: '1',
    title: 'Unauthorized Access Detected',
    status: 'open',
    severity: 'high',
    assignee: 'alice@example.com',
    description: 'Suspicious login detected from unknown IP.',
    created_at: '2024-06-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Temperature Spike in Furnace',
    status: 'in_progress',
    severity: 'critical',
    assignee: 'bob@example.com',
    description: 'Furnace temperature exceeded safe threshold.',
    created_at: '2024-06-02T11:00:00Z',
  },
  {
    id: '3',
    title: 'Network Anomaly',
    status: 'resolved',
    severity: 'medium',
    assignee: 'carol@example.com',
    description: 'Unusual network traffic detected.',
    created_at: '2024-06-03T12:00:00Z',
  },
];

const statusColors: Record<string, string> = {
  open: '#42a5f5',
  triaged: '#7e57c2',
  in_progress: '#ffa726',
  resolved: '#66bb6a',
  closed: '#bdbdbd',
};

const severityColors: Record<string, string> = {
  low: '#b2dfdb',
  medium: '#ffee58',
  high: '#ef5350',
  critical: '#d32f2f',
};

const statusOptions = ['open', 'triaged', 'in_progress', 'resolved', 'closed'];
const severityOptions = ['low', 'medium', 'high', 'critical'];

const userOptions = [
  'alice@example.com',
  'bob@example.com',
  'carol@example.com',
];

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState(mockIncidents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium',
    assignee: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [tagInput, setTagInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    let url = '/api/incidents';
    const params = [];
    if (filterStatus) params.push(`status=${filterStatus}`);
    if (filterSeverity) params.push(`severity=${filterSeverity}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (startDate) params.push(`startDate=${startDate.toISOString()}`);
    if (endDate) params.push(`endDate=${endDate.toISOString()}`);
    if (sortBy) params.push(`sortBy=${sortBy}`);
    if (sortOrder) params.push(`sortOrder=${sortOrder}`);
    if (params.length) url += '?' + params.join('&');
    fetch(url)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
      .then(data => {
        setIncidents(data.incidents || []);
        setError(null);
      })
      .catch(() => {
        setIncidents(mockIncidents);
        setError('Failed to load live data, showing mock data.');
      })
      .finally(() => setLoading(false));
  }, [filterStatus, filterSeverity, search, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    // Connect to Socket.io for real-time updates
    if (!socketRef.current) {
      const socket = io(SOCKET_URL, { transports: ['websocket'] });
      socketRef.current = socket;
      socket.on('incident-updated', (updatedIncident: any) => {
        setIncidents((prev) => {
          const idx = prev.findIndex((i) => i.id === updatedIncident.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = updatedIncident;
            return copy;
          } else {
            return [updatedIncident, ...prev];
          }
        });
      });
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleRowClick = (incident: any) => {
    setSelectedIncident(incident);
    setDialogOpen(true);
  };

  const handleAssign = async (incident: any, assignee: string) => {
    setActionLoading(true);
    await fetch(`/api/incidents/${incident.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee }),
    });
    setIncidents((prev) => prev.map((i) => i.id === incident.id ? { ...i, assignee } : i));
    setActionLoading(false);
  };

  const handleTriage = async (incident: any, status: string) => {
    setActionLoading(true);
    await fetch(`/api/incidents/${incident.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setIncidents((prev) => prev.map((i) => i.id === incident.id ? { ...i, status } : i));
    setActionLoading(false);
  };

  const handleCreateIncident = async () => {
    setActionLoading(true);
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIncident),
    });
    if (res.ok) {
      const data = await res.json();
      setIncidents((prev) => [data.incident, ...prev]);
      setCreateOpen(false);
      setNewIncident({ title: '', description: '', severity: 'medium', assignee: '' });
    }
    setActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!selectedIncident || !comment.trim()) return;
    setActionLoading(true);
    const res = await fetch(`/api/incidents/${selectedIncident.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedIncident(data.incident);
      setIncidents((prev) => prev.map((i) => i.id === data.incident.id ? data.incident : i));
      setComment('');
    }
    setActionLoading(false);
  };

  const handleAddTag = async (tag: string) => {
    if (!selectedIncident || !tag.trim()) return;
    setActionLoading(true);
    const res = await fetch(`/api/incidents/${selectedIncident.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedIncident(data.incident);
      setIncidents((prev) => prev.map((i) => i.id === data.incident.id ? data.incident : i));
      setTagInput('');
    }
    setActionLoading(false);
  };

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(incidents.map((i) => i.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]);
  };

  const handleBulkAssign = async (assignee: string) => {
    await Promise.all(selected.map(id => fetch(`/api/incidents/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee }),
    })));
    setIncidents((prev) => prev.map((i) => selected.includes(i.id) ? { ...i, assignee } : i));
    setSelected([]);
  };

  const handleBulkStatus = async (status: string) => {
    await Promise.all(selected.map(id => fetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })));
    setIncidents((prev) => prev.map((i) => selected.includes(i.id) ? { ...i, status } : i));
    setSelected([]);
  };

  const handleExportCSV = () => {
    const csv = incidents.filter(i => selected.length === 0 || selected.includes(i.id)).map(i => ({
      Status: i.status,
      Severity: i.severity,
      Title: i.title,
      Assignee: i.assignee,
      Created: i.created_at,
    }));
    const blob = new Blob([csv.map(row => Object.values(row).join(',')).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incidents.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const data = incidents.filter(i => selected.length === 0 || selected.includes(i.id));
    // @ts-ignore
    doc.autoTable({
      head: [['Status', 'Severity', 'Title', 'Assignee', 'Created']],
      body: data.map(i => [i.status, i.severity, i.title, i.assignee, i.created_at]),
    });
    doc.save('incidents.pdf');
  };

  return (
    <Box
      sx={{
        p: 4,
        minHeight: '100vh',
        background: `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`,
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, letterSpacing: 1 }}>
        Incidents
      </Typography>
      <Box display="flex" gap={2} mb={2} alignItems="center">
        <TextField
          select
          label="Status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          {statusOptions.map(status => (
            <MenuItem key={status} value={status}>{status}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Severity"
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          {severityOptions.map(severity => (
            <MenuItem key={severity} value={severity}>{severity}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={setEndDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <Tooltip title="Export to CSV"><Button onClick={handleExportCSV} variant="outlined">Export CSV</Button></Tooltip>
        <Tooltip title="Export to PDF"><Button onClick={handleExportPDF} variant="outlined">Export PDF</Button></Tooltip>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Bulk Assign</InputLabel>
          <Select
            label="Bulk Assign"
            onChange={e => handleBulkAssign(e.target.value)}
            value=""
            displayEmpty
            disabled={selected.length === 0}
          >
            <MenuItem value="">Select</MenuItem>
            {userOptions.map(user => (
              <MenuItem key={user} value={user}>{user}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Bulk Status</InputLabel>
          <Select
            label="Bulk Status"
            onChange={e => handleBulkStatus(e.target.value)}
            value=""
            displayEmpty
            disabled={selected.length === 0}
          >
            <MenuItem value="">Select</MenuItem>
            {statusOptions.map(status => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 4,
          boxShadow: 6,
          background: (theme) => alpha('#fff', 0.7),
          backdropFilter: 'blur(8px)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < incidents.length}
                  checked={incidents.length > 0 && selected.length === incidents.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'select all incidents' }}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'status'}
                  direction={sortBy === 'status' ? sortOrder : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'severity'}
                  direction={sortBy === 'severity' ? sortOrder : 'asc'}
                  onClick={() => handleSort('severity')}
                >
                  Severity
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'title'}
                  direction={sortBy === 'title' ? sortOrder : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'assignee'}
                  direction={sortBy === 'assignee' ? sortOrder : 'asc'}
                  onClick={() => handleSort('assignee')}
                >
                  Assignee
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'created_at'}
                  direction={sortBy === 'created_at' ? sortOrder : 'desc'}
                  onClick={() => handleSort('created_at')}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id} hover onClick={() => handleRowClick(incident)} sx={{ cursor: 'pointer' }} selected={selected.includes(incident.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.includes(incident.id)}
                    onChange={e => { e.stopPropagation(); handleSelect(incident.id); }}
                    inputProps={{ 'aria-label': `select incident ${incident.id}` }}
                  />
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={incident.status}
                      onChange={e => { e.stopPropagation(); handleTriage(incident, e.target.value); }}
                      disabled={actionLoading}
                    >
                      {statusOptions.map(status => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip
                    label={incident.severity}
                    sx={{
                      bgcolor: severityColors[incident.severity],
                      color: '#fff',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{incident.title}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={incident.assignee || ''}
                      onChange={e => { e.stopPropagation(); handleAssign(incident, e.target.value); }}
                      displayEmpty
                      disabled={actionLoading}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {userOptions.map(user => (
                        <MenuItem key={user} value={user}>{user}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right">
                  <Chip label="View" clickable sx={{ mr: 1 }} onClick={e => { e.stopPropagation(); handleRowClick(incident); }} />
                  {actionLoading && <CircularProgress size={20} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          boxShadow: 6,
          background: 'linear-gradient(135deg, #42a5f5 30%, #7e57c2 90%)',
        }}
        onClick={() => setCreateOpen(true)}
      >
        <AddIcon />
      </Fab>
      {/* Create Incident Modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Incident</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            value={newIncident.title}
            onChange={e => setNewIncident({ ...newIncident, title: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            value={newIncident.description}
            onChange={e => setNewIncident({ ...newIncident, description: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Severity</InputLabel>
            <Select
              value={newIncident.severity}
              label="Severity"
              onChange={e => setNewIncident({ ...newIncident, severity: e.target.value })}
            >
              {severityOptions.map(severity => (
                <MenuItem key={severity} value={severity}>{severity}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Assignee</InputLabel>
            <Select
              value={newIncident.assignee}
              label="Assignee"
              onChange={e => setNewIncident({ ...newIncident, assignee: e.target.value })}
              displayEmpty
            >
              <MenuItem value="">Unassigned</MenuItem>
              {userOptions.map(user => (
                <MenuItem key={user} value={user}>{user}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateIncident} disabled={actionLoading} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Incident Details</DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box>
              <Typography variant="h6">{selectedIncident.title}</Typography>
              <Typography>Status: {selectedIncident.status}</Typography>
              <Typography>Severity: {selectedIncident.severity}</Typography>
              <Typography>Assignee: {selectedIncident.assignee}</Typography>
              <Typography>Description: {selectedIncident.description}</Typography>
              <Box mt={2} mb={1}>
                <Typography variant="subtitle1">Tags:</Typography>
                {selectedIncident.tags && selectedIncident.tags.map((tag: string) => (
                  <Chip key={tag} label={tag} sx={{ mr: 1, mb: 1 }} />
                ))}
                <TextField
                  size="small"
                  placeholder="Add tag"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleAddTag(tagInput); } }}
                  sx={{ width: 120, ml: 1 }}
                  disabled={actionLoading}
                />
                <IconButton onClick={() => handleAddTag(tagInput)} disabled={actionLoading}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box mt={2}>
                <Typography variant="subtitle1">Comments:</Typography>
                {selectedIncident.comments && selectedIncident.comments.map((c: any, idx: number) => (
                  <Box key={idx} sx={{ mb: 1, pl: 1, borderLeft: '2px solid #eee' }}>
                    <Typography variant="body2" color="text.secondary">{c.user} ({new Date(c.timestamp).toLocaleString()}):</Typography>
                    <Typography variant="body1">{c.comment}</Typography>
                  </Box>
                ))}
                <Box display="flex" alignItems="center" mt={1}>
                  <TextField
                    size="small"
                    placeholder="Add comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    fullWidth
                    disabled={actionLoading}
                  />
                  <IconButton onClick={handleAddComment} disabled={actionLoading || !comment.trim()}>
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {loading && <Typography sx={{ mt: 2 }}>Loading...</Typography>}
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
    </Box>
  );
};

export default Incidents; 