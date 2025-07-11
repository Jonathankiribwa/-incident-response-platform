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
import Snackbar from '@mui/material/Snackbar';
import { useAuth } from '../../hooks/useAuth';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CommentIcon from '@mui/icons-material/Comment';
import LabelIcon from '@mui/icons-material/Label';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoIcon from '@mui/icons-material/Info';
import DialogContentText from '@mui/material/DialogContentText';

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

const teamOptions = [
  'Maintenance',
  'IT',
  'Operations',
  'Security',
  'Engineering',
  'Logistics',
];
const shiftOptions = ['Day', 'Night', 'Swing'];

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

// Add color mapping for ML labels
const mlLabelColors: Record<string, string> = {
  Critical: '#d32f2f',
  High: '#ef5350',
  Medium: '#42a5f5',
  Low: '#b2dfdb',
};

// Extend incident type to include ML fields and new team/shift fields
interface IncidentWithML {
  id: string;
  title: string;
  status: string;
  severity: string;
  assignee: string;
  description: string;
  created_at: string;
  ml_label?: string;
  ml_priority?: number;
  tags?: string[];
  comments?: any[];
  assigned_team?: string;
  shift?: 'Day' | 'Night' | 'Swing';
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
}

// Operator checklists for incident types
const incidentChecklists: Record<string, string[]> = {
  'Boiler Overheating': [
    'Check temperature sensor calibration',
    'Inspect boiler for leaks or blockages',
    'Notify maintenance team',
    'Log incident in maintenance system',
  ],
  'Unauthorized VPN Login': [
    'Verify user identity',
    'Check access logs for anomalies',
    'Reset user credentials if needed',
    'Notify IT security',
  ],
  'Conveyor Jam': [
    'Stop conveyor safely',
    'Inspect jam location',
    'Clear obstruction',
    'Restart conveyor and monitor',
  ],
  'Supply Chain Delay': [
    'Contact supplier for update',
    'Adjust production schedule',
    'Notify logistics team',
  ],
  'Power Fluctuation': [
    'Check voltage readings',
    'Inspect rolling mill electricals',
    'Notify electrical maintenance',
  ],
  'Water Leak Detected': [
    'Locate leak source',
    'Shut off water supply if needed',
    'Notify maintenance',
    'Document repair',
  ],
  'PLC Communication Failure': [
    'Check PLC network connections',
    'Restart PLC if safe',
    'Escalate to automation engineer',
  ],
  'Gas Pressure Anomaly': [
    'Check gas line pressure sensors',
    'Inspect for leaks',
    'Notify safety officer',
  ],
  'Emergency Stop Triggered': [
    'Verify operator safety',
    'Inspect press line for hazards',
    'Reset emergency stop',
    'Resume operations if safe',
  ],
};

// Helper to get icon and color for audit action
const getAuditIcon = (action: string) => {
  switch (action) {
    case 'assign':
      return { icon: <AssignmentIndIcon color="primary" />, color: 'primary' };
    case 'status_change':
      return { icon: <AutorenewIcon sx={{ color: '#ffa726' }} />, color: 'warning' };
    case 'comment':
      return { icon: <CommentIcon sx={{ color: '#66bb6a' }} />, color: 'success' };
    case 'tag':
      return { icon: <LabelIcon sx={{ color: '#7e57c2' }} />, color: 'secondary' };
    case 'edit':
      return { icon: <EditNoteIcon sx={{ color: '#42a5f5' }} />, color: 'info' };
    default:
      return { icon: <InfoIcon color="disabled" />, color: 'default' };
  }
};

const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentWithML[]>(mockIncidents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithML | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium',
    assignee: '',
    assigned_team: '',
    shift: '',
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
  const [checklistState, setChecklistState] = useState<{ [key: string]: boolean[] }>({});
  const { currentUser } = useAuth();
  const [assignmentNotification, setAssignmentNotification] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const isAdminOrEngineer = currentUser && (currentUser.role === 'admin' || currentUser.role === 'engineer');
  const [editTeam, setEditTeam] = useState<string>('');
  const [editShift, setEditShift] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let url = '/api/incidents';
    const params = [];
    if (filterStatus) params.push(`status=${filterStatus}`);
    if (filterSeverity) params.push(`severity=${filterSeverity}`);
    if (filterTeam) params.push(`assigned_team=${encodeURIComponent(filterTeam)}`);
    if (filterShift) params.push(`shift=${encodeURIComponent(filterShift)}`);
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
  }, [filterStatus, filterSeverity, filterTeam, filterShift, search, startDate, endDate, sortBy, sortOrder]);

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
      socket.on('incident-assigned', (payload: any) => {
        if (currentUser && payload.assignee === currentUser.email) {
          setAssignmentNotification(`You have been assigned to incident: ${payload.incident.title}`);
        }
      });
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [currentUser]);

  // Fetch audit log when selectedIncident changes
  useEffect(() => {
    if (!selectedIncident) return;
    setAuditLoading(true);
    setAuditError(null);
    fetch(`/api/incidents/${selectedIncident.id}/audit`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch audit log'))
      .then(data => setAuditLog(data.audit || []))
      .catch(() => setAuditError('Failed to load audit log.'))
      .finally(() => setAuditLoading(false));
  }, [selectedIncident]);

  // When opening details dialog, initialize edit fields
  useEffect(() => {
    if (selectedIncident) {
      setEditTeam(selectedIncident.assigned_team || '');
      setEditShift(selectedIncident.shift || '');
      setEditError(null);
      setEditSuccess(false);
    }
  }, [selectedIncident]);

  // Compute filtered audit log
  const auditActionTypes = Array.from(new Set(auditLog.map(a => a.action)));
  const filteredAuditLog = auditLog.filter(a => {
    const matchesAction = auditActionFilter === 'all' || a.action === auditActionFilter;
    const search = auditSearch.trim().toLowerCase();
    const matchesSearch = !search ||
      a.actor?.toLowerCase().includes(search) ||
      a.details?.toLowerCase().includes(search);
    return matchesAction && matchesSearch;
  });

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

  // Handle status change, prompt for resolution note if needed
  const handleTriage = async (incident: any, status: string) => {
    if ((status === 'resolved' || status === 'closed')) {
      setPendingStatus(status);
      setResolutionDialogOpen(true);
      setResolutionNote('');
      setResolutionError(null);
      return;
    }
    setActionLoading(true);
    await fetch(`/api/incidents/${incident.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setIncidents((prev) => prev.map((i) => i.id === incident.id ? { ...i, status } : i));
    setActionLoading(false);
  };

  // Save resolution note and status
  const handleSaveResolution = async () => {
    if (!resolutionNote.trim()) {
      setResolutionError('Resolution note is required.');
      return;
    }
    if (!selectedIncident) return;
    setActionLoading(true);
    setResolutionError(null);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingStatus, resolution_notes: resolutionNote }),
      });
      if (!res.ok) throw new Error('Failed to resolve incident');
      const data = await res.json();
      setSelectedIncident(data.incident);
      setIncidents((prev) => prev.map((i) => i.id === data.incident.id ? data.incident : i));
      setResolutionDialogOpen(false);
    } catch (e) {
      setResolutionError('Failed to resolve incident');
    }
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
      setNewIncident({ title: '', description: '', severity: 'medium', assignee: '', assigned_team: '', shift: '' });
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

  const handleSaveTeamShift = async () => {
    if (!selectedIncident) return;
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(false);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}/team-shift`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_team: editTeam, shift: editShift }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setSelectedIncident(data.incident);
      setIncidents(prev => prev.map(i => i.id === data.incident.id ? data.incident : i));
      setEditSuccess(true);
    } catch (e) {
      setEditError('Failed to update team/shift');
    } finally {
      setEditLoading(false);
    }
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

  // Export audit log as CSV
  const handleExportAuditCSV = () => {
    if (!filteredAuditLog.length) return;
    const csvRows = [
      'Timestamp,Action,Actor,Details',
      ...filteredAuditLog.map(a => `"${a.created_at}","${a.action}","${a.actor}","${a.details?.replace(/"/g, '""')}"`)
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident_${selectedIncident?.id}_audit.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  // Export audit log as PDF
  const handleExportAuditPDF = () => {
    if (!filteredAuditLog.length) return;
    const doc = new jsPDF();
    // @ts-ignore
    doc.autoTable({
      head: [['Timestamp', 'Action', 'Actor', 'Details']],
      body: filteredAuditLog.map(a => [a.created_at, a.action, a.actor, a.details]),
    });
    doc.save(`incident_${selectedIncident?.id}_audit.pdf`);
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
          select
          label="Team"
          value={filterTeam}
          onChange={e => setFilterTeam(e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {teamOptions.map(team => (
            <MenuItem key={team} value={team}>{team}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Shift"
          value={filterShift}
          onChange={e => setFilterShift(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          {shiftOptions.map(shift => (
            <MenuItem key={shift} value={shift}>{shift}</MenuItem>
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
              <TableCell>Team</TableCell>
              <TableCell>Shift</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'created_at'}
                  direction={sortBy === 'created_at' ? sortOrder : 'desc'}
                  onClick={() => handleSort('created_at')}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell>ML Priority</TableCell>
              <TableCell>ML Score</TableCell>
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
                <TableCell>{incident.assigned_team || '-'}</TableCell>
                <TableCell>{incident.shift || '-'}</TableCell>
                <TableCell align="right">
                  <Chip label="View" clickable sx={{ mr: 1 }} onClick={e => { e.stopPropagation(); handleRowClick(incident); }} />
                  {actionLoading && <CircularProgress size={20} />}
                </TableCell>
                <TableCell>
                  {incident.ml_label && (
                    <Chip
                      label={incident.ml_label}
                      sx={{
                        bgcolor: mlLabelColors[incident.ml_label] || '#bdbdbd',
                        color: '#fff',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {typeof incident.ml_priority === 'number' ? incident.ml_priority : '-'}
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Assigned Team</InputLabel>
            <Select
              value={newIncident.assigned_team}
              label="Assigned Team"
              onChange={e => setNewIncident({ ...newIncident, assigned_team: e.target.value })}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {teamOptions.map(team => (
                <MenuItem key={team} value={team}>{team}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Shift</InputLabel>
            <Select
              value={newIncident.shift}
              label="Shift"
              onChange={e => setNewIncident({ ...newIncident, shift: e.target.value })}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {shiftOptions.map(shift => (
                <MenuItem key={shift} value={shift}>{shift}</MenuItem>
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
              {isAdminOrEngineer ? (
                <Box display="flex" gap={2} alignItems="center" mb={1}>
                  <FormControl sx={{ minWidth: 140 }} size="small">
                    <InputLabel>Team</InputLabel>
                    <Select
                      value={editTeam}
                      label="Team"
                      onChange={e => setEditTeam(e.target.value)}
                      disabled={editLoading}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {teamOptions.map(team => (
                        <MenuItem key={team} value={team}>{team}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 120 }} size="small">
                    <InputLabel>Shift</InputLabel>
                    <Select
                      value={editShift}
                      label="Shift"
                      onChange={e => setEditShift(e.target.value)}
                      disabled={editLoading}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {shiftOptions.map(shift => (
                        <MenuItem key={shift} value={shift}>{shift}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button onClick={handleSaveTeamShift} variant="contained" size="small" disabled={editLoading || (editTeam === selectedIncident.assigned_team && editShift === selectedIncident.shift)}>
                    {editLoading ? <CircularProgress size={18} /> : 'Save'}
                  </Button>
                  {editSuccess && <Typography color="success.main" variant="caption">Saved!</Typography>}
                  {editError && <Typography color="error" variant="caption">{editError}</Typography>}
                </Box>
              ) : (
                <>
                  <Typography>Team: {selectedIncident.assigned_team || '-'}</Typography>
                  <Typography>Shift: {selectedIncident.shift || '-'}</Typography>
                </>
              )}
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
              {selectedIncident && (
                <Box mt={2}>
                  <Typography variant="subtitle2">ML Priority:</Typography>
                  {selectedIncident.ml_label && (
                    <Chip
                      label={selectedIncident.ml_label}
                      sx={{
                        bgcolor: mlLabelColors[selectedIncident.ml_label] || '#bdbdbd',
                        color: '#fff',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        mr: 1,
                      }}
                    />
                  )}
                  <Typography variant="body2" display="inline">
                    {typeof selectedIncident.ml_priority === 'number' ? `Score: ${selectedIncident.ml_priority}` : ''}
                  </Typography>
                </Box>
              )}
              {selectedIncident && (
                <Box mt={2}>
                  <Typography variant="subtitle2" mt={2}>Operator Checklist:</Typography>
                  {(() => {
                    const steps = incidentChecklists[selectedIncident.title] || [];
                    if (!steps.length) return <Typography variant="body2">No checklist available for this incident type.</Typography>;
                    const state = checklistState[selectedIncident.id] || Array(steps.length).fill(false);
                    return (
                      <Box>
                        {steps.map((step, idx) => (
                          <Box key={idx} display="flex" alignItems="center" gap={1}>
                            <Checkbox
                              checked={state[idx]}
                              onChange={e => {
                                const updated = [...state];
                                updated[idx] = e.target.checked;
                                setChecklistState(s => ({ ...s, [selectedIncident.id]: updated }));
                              }}
                            />
                            <Typography variant="body2" sx={{ textDecoration: state[idx] ? 'line-through' : 'none' }}>{step}</Typography>
                          </Box>
                        ))}
                      </Box>
                    );
                  })()}
                </Box>
              )}
              {selectedIncident && (
                <Box mt={2}>
                  <Typography variant="subtitle2">Resolution Notes:</Typography>
                  {selectedIncident.resolution_notes && (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{selectedIncident.resolution_notes}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Resolved by: {selectedIncident.resolved_by || '-'} on {selectedIncident.resolved_at ? new Date(selectedIncident.resolved_at).toLocaleString() : '-'}
                  </Typography>
                </Box>
              )}
              {/* Audit Timeline */}
              <Box mt={3} mb={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Audit Timeline</Typography>
                {/* Filters */}
                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={1}>
                  <Typography variant="body2">Filter:</Typography>
                  <Chip
                    label="All"
                    color={auditActionFilter === 'all' ? 'primary' : 'default'}
                    onClick={() => setAuditActionFilter('all')}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                  {auditActionTypes.map(type => (
                    <Chip
                      key={type}
                      label={type.replace(/_/g, ' ').toUpperCase()}
                      color={auditActionFilter === type ? 'primary' : 'default'}
                      onClick={() => setAuditActionFilter(type)}
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  <TextField
                    size="small"
                    placeholder="Search actor or details"
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    sx={{ minWidth: 180 }}
                  />
                  <Typography variant="caption" color="text.secondary" ml={1}>
                    {filteredAuditLog.length} event{filteredAuditLog.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                {auditLoading ? (
                  <Box display="flex" alignItems="center" gap={1}><CircularProgress size={20} /> Loading...</Box>
                ) : auditError ? (
                  <Typography color="error">{auditError}</Typography>
                ) : filteredAuditLog.length === 0 ? (
                  <Typography variant="body2">No audit events match your filter.</Typography>
                ) : (
                  <Timeline position="right" sx={{ p: 0 }}>
                    {filteredAuditLog.map((a, idx) => {
                      const { icon } = getAuditIcon(a.action);
                      return (
                        <TimelineItem key={a.id || idx}>
                          <TimelineSeparator>
                            <TimelineDot>
                              {icon}
                            </TimelineDot>
                            {idx < filteredAuditLog.length - 1 && <TimelineConnector />}
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.action.replace(/_/g, ' ').toUpperCase()}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(a.created_at).toLocaleString()}</Typography>
                            <Typography variant="body2">By: {a.actor}</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{a.details}</Typography>
                          </TimelineContent>
                        </TimelineItem>
                      );
                    })}
                  </Timeline>
                )}
                <Box display="flex" gap={2} mt={1}>
                  <Button onClick={handleExportAuditCSV} variant="outlined" size="small" disabled={!filteredAuditLog.length}>Export CSV</Button>
                  <Button onClick={handleExportAuditPDF} variant="outlined" size="small" disabled={!filteredAuditLog.length}>Export PDF</Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={resolutionDialogOpen} onClose={() => setResolutionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolution Note Required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a resolution note before marking this incident as {pendingStatus}.
          </DialogContentText>
          <TextField
            label="Resolution Note"
            value={resolutionNote}
            onChange={e => setResolutionNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            margin="normal"
            autoFocus
            disabled={actionLoading}
            error={!!resolutionError}
            helperText={resolutionError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolutionDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={handleSaveResolution} disabled={actionLoading || !resolutionNote.trim()} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!assignmentNotification}
        autoHideDuration={4000}
        onClose={() => setAssignmentNotification(null)}
        message={assignmentNotification}
      />
      {loading && <Typography sx={{ mt: 2 }}>Loading...</Typography>}
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
    </Box>
  );
};

export default Incidents; 