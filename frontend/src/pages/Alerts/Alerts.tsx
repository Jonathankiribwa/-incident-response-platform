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
// @ts-ignore
import { Parser as Json2CsvParser } from 'json2csv';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const mockAlerts = [
  {
    id: 'a1',
    status: 'new',
    severity: 'high',
    type: 'network',
    source: 'SIEM',
    description: 'Network scan detected from external IP.',
    assignee: 'alice@example.com',
    detected_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'a2',
    status: 'in_progress',
    severity: 'critical',
    type: 'temperature',
    source: 'IoT',
    description: 'Temperature sensor exceeded threshold.',
    assignee: 'bob@example.com',
    detected_at: '2024-06-01T11:00:00Z',
  },
  {
    id: 'a3',
    status: 'resolved',
    severity: 'medium',
    type: 'login',
    source: 'API',
    description: 'Unusual login time detected.',
    assignee: 'carol@example.com',
    detected_at: '2024-06-01T12:00:00Z',
  },
];

const statusColors: Record<string, string> = {
  new: '#42a5f5',
  in_progress: '#ffa726',
  resolved: '#66bb6a',
  dismissed: '#bdbdbd',
};

const severityColors: Record<string, string> = {
  low: '#b2dfdb',
  medium: '#ffee58',
  high: '#ef5350',
  critical: '#d32f2f',
};

const statusOptions = ['new', 'in_progress', 'resolved', 'dismissed'];
const severityOptions = ['low', 'medium', 'high', 'critical'];
const typeOptions = ['network', 'temperature', 'login', 'other'];

const userOptions = [
  'alice@example.com',
  'bob@example.com',
  'carol@example.com',
];

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'network',
    source: '',
    severity: 'medium',
    status: 'new',
    assignee: '',
    description: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [tagInput, setTagInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('detected_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    let url = '/api/alerts';
    const params = [];
    if (filterStatus) params.push(`status=${filterStatus}`);
    if (filterSeverity) params.push(`severity=${filterSeverity}`);
    if (filterType) params.push(`type=${filterType}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (startDate) params.push(`startDate=${startDate.toISOString()}`);
    if (endDate) params.push(`endDate=${endDate.toISOString()}`);
    if (sortBy) params.push(`sortBy=${sortBy}`);
    if (sortOrder) params.push(`sortOrder=${sortOrder}`);
    if (params.length) url += '?' + params.join('&');
    fetch(url)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
      .then(data => {
        setAlerts(data.alerts || []);
        setError(null);
      })
      .catch(() => {
        setAlerts(mockAlerts);
        setError('Failed to load live data, showing mock data.');
      })
      .finally(() => setLoading(false));
  }, [filterStatus, filterSeverity, filterType, search, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    // Connect to Socket.io for real-time updates
    if (!socketRef.current) {
      const socket = io(SOCKET_URL, { transports: ['websocket'] });
      socketRef.current = socket;
      socket.on('alert-updated', (updatedAlert: any) => {
        setAlerts((prev) => {
          const idx = prev.findIndex((a) => a.id === updatedAlert.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = updatedAlert;
            return copy;
          } else {
            return [updatedAlert, ...prev];
          }
        });
      });
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleRowClick = (alert: any) => {
    setSelectedAlert(alert);
    setDialogOpen(true);
  };

  const handleAssign = async (alert: any, assignee: string) => {
    setActionLoading(true);
    // Alerts may not have an assign endpoint, so we PATCH the alert
    await fetch(`/api/alerts/${alert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee }),
    });
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, assignee } : a));
    setActionLoading(false);
  };

  const handleTriage = async (alert: any, status: string) => {
    setActionLoading(true);
    await fetch(`/api/alerts/${alert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, status } : a));
    setActionLoading(false);
  };

  const handleCreateAlert = async () => {
    setActionLoading(true);
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAlert),
    });
    if (res.ok) {
      const data = await res.json();
      setAlerts((prev) => [data.alert, ...prev]);
      setCreateOpen(false);
      setNewAlert({ type: 'network', source: '', severity: 'medium', status: 'new', assignee: '', description: '' });
    }
    setActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!selectedAlert || !comment.trim()) return;
    setActionLoading(true);
    const res = await fetch(`/api/alerts/${selectedAlert.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedAlert(data.alert);
      setAlerts((prev) => prev.map((a) => a.id === data.alert.id ? data.alert : a));
      setComment('');
    }
    setActionLoading(false);
  };

  const handleAddTag = async (tag: string) => {
    if (!selectedAlert || !tag.trim()) return;
    setActionLoading(true);
    const res = await fetch(`/api/alerts/${selectedAlert.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedAlert(data.alert);
      setAlerts((prev) => prev.map((a) => a.id === data.alert.id ? data.alert : a));
      setTagInput('');
    }
    setActionLoading(false);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(alerts.map((a) => a.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]);
  };

  const handleBulkAssign = async (assignee: string) => {
    await Promise.all(selected.map(id => fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee }),
    })));
    setAlerts((prev) => prev.map((a) => selected.includes(a.id) ? { ...a, assignee } : a));
    setSelected([]);
  };

  const handleBulkStatus = async (status: string) => {
    await Promise.all(selected.map(id => fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })));
    setAlerts((prev) => prev.map((a) => selected.includes(a.id) ? { ...a, status } : a));
    setSelected([]);
  };

  const handleExportCSV = () => {
    const parser = new Json2CsvParser();
    const csv = parser.parse(alerts.filter(a => selected.length === 0 || selected.includes(a.id)));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alerts.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const data = alerts.filter(a => selected.length === 0 || selected.includes(a.id));
    // @ts-ignore
    doc.autoTable({
      head: [['Status', 'Severity', 'Type', 'Source', 'Assignee', 'Detected']],
      body: data.map(a => [a.status, a.severity, a.type, a.source, a.assignee, a.detected_at]),
    });
    doc.save('alerts.pdf');
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

  return (
    <Box
      sx={{
        p: 4,
        minHeight: '100vh',
        background: `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`,
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, letterSpacing: 1 }}>
        Alerts
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
          select
          label="Type"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          {typeOptions.map(type => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
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
                  indeterminate={selected.length > 0 && selected.length < alerts.length}
                  checked={alerts.length > 0 && selected.length === alerts.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'select all alerts' }}
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
                  active={sortBy === 'type'}
                  direction={sortBy === 'type' ? sortOrder : 'asc'}
                  onClick={() => handleSort('type')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'source'}
                  direction={sortBy === 'source' ? sortOrder : 'asc'}
                  onClick={() => handleSort('source')}
                >
                  Source
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'detected_at'}
                  direction={sortBy === 'detected_at' ? sortOrder : 'desc'}
                  onClick={() => handleSort('detected_at')}
                >
                  Detected
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id} hover onClick={() => handleRowClick(alert)} sx={{ cursor: 'pointer' }} selected={selected.includes(alert.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.includes(alert.id)}
                    onChange={e => { e.stopPropagation(); handleSelect(alert.id); }}
                    inputProps={{ 'aria-label': `select alert ${alert.id}` }}
                  />
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={alert.status}
                      onChange={e => { e.stopPropagation(); handleTriage(alert, e.target.value); }}
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
                    label={alert.severity}
                    sx={{
                      bgcolor: severityColors[alert.severity],
                      color: '#fff',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{alert.type}</TableCell>
                <TableCell>{alert.source}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={alert.assignee || ''}
                      onChange={e => { e.stopPropagation(); handleAssign(alert, e.target.value); }}
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
                  <Chip label="View" clickable sx={{ mr: 1 }} onClick={e => { e.stopPropagation(); handleRowClick(alert); }} />
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
          background: 'linear-gradient(135deg, #42a5f5 30%, #d32f2f 90%)',
        }}
        onClick={() => setCreateOpen(true)}
      >
        <AddIcon />
      </Fab>
      {/* Create Alert Modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Alert</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={newAlert.type}
              label="Type"
              onChange={e => setNewAlert({ ...newAlert, type: e.target.value })}
            >
              {typeOptions.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Source"
            fullWidth
            margin="normal"
            value={newAlert.source}
            onChange={e => setNewAlert({ ...newAlert, source: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            value={newAlert.description}
            onChange={e => setNewAlert({ ...newAlert, description: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Severity</InputLabel>
            <Select
              value={newAlert.severity}
              label="Severity"
              onChange={e => setNewAlert({ ...newAlert, severity: e.target.value })}
            >
              {severityOptions.map(severity => (
                <MenuItem key={severity} value={severity}>{severity}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Assignee</InputLabel>
            <Select
              value={newAlert.assignee}
              label="Assignee"
              onChange={e => setNewAlert({ ...newAlert, assignee: e.target.value })}
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
          <Button onClick={handleCreateAlert} disabled={actionLoading} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Alert Details</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="h6">{selectedAlert.type} Alert</Typography>
              <Typography>Status: {selectedAlert.status}</Typography>
              <Typography>Severity: {selectedAlert.severity}</Typography>
              <Typography>Source: {selectedAlert.source}</Typography>
              <Typography>Description: {selectedAlert.description}</Typography>
              <Box mt={2} mb={1}>
                <Typography variant="subtitle1">Tags:</Typography>
                {selectedAlert.tags && selectedAlert.tags.map((tag: string) => (
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
                {selectedAlert.comments && selectedAlert.comments.map((c: any, idx: number) => (
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

export default Alerts; 