import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

const Dashboard: React.FC = () => {
  const { isAuthenticated, authFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [simDialogOpen, setSimDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [simSuccess, setSimSuccess] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    authFetch('/api/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(setData)
      .catch(err => setError('Failed to load dashboard data.'));
  }, [isAuthenticated, authFetch]);

  const openSimDialog = async () => {
    setSimDialogOpen(true);
    try {
      const res = await fetch('/api/simulate/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    }
  };

  const handleSimulate = async () => {
    if (!selectedTemplate) return;
    try {
      const res = await fetch('/api/simulate/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedTemplate })
      });
      if (!res.ok) throw new Error('Simulation failed');
      setSimSuccess(true);
      setSimDialogOpen(false);
      setSelectedTemplate('');
      setTimeout(() => window.location.reload(), 1000); // Refresh to show new incident
    } catch (err) {
      setSimError('Failed to simulate incident.');
    }
  };

  const handleDemoToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const action = event.target.checked ? 'start' : 'stop';
    setDemoLoading(true);
    try {
      await fetch('/api/simulate/demo-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      setDemoMode(event.target.checked);
    } catch {
      // Optionally show error
    } finally {
      setDemoLoading(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Typography>Loading...</Typography>;

  // Mock data for widgets
  const sensorData = [
    { name: 'Furnace Temp', value: 912, unit: '°C' },
    { name: 'Mill Vibration', value: 0.32, unit: 'mm/s' },
    { name: 'Line Voltage', value: 398, unit: 'V' },
  ];
  const machineStatus = [
    { name: 'Furnace', status: 'Running' },
    { name: 'Rolling Mill', status: 'Stopped' },
    { name: 'Conveyor 7', status: 'Error' },
  ];
  const statusColors: Record<string, string> = {
    Running: '#66bb6a',
    Stopped: '#bdbdbd',
    Error: '#ef5350',
  };
  const securityEvents = [
    { time: '10:12', event: 'Unauthorized VPN Login', user: 'jdoe' },
    { time: '09:58', event: 'Firewall Alert', user: 'system' },
    { time: '09:45', event: 'Access After Hours', user: 'asmith' },
  ];
  const responseTrends = [
    { day: 'Mon', time: 22 },
    { day: 'Tue', time: 18 },
    { day: 'Wed', time: 25 },
    { day: 'Thu', time: 15 },
    { day: 'Fri', time: 20 },
    { day: 'Sat', time: 30 },
    { day: 'Sun', time: 17 },
  ];

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Button variant="contained" color="primary" onClick={openSimDialog}>
          Simulate Incident
        </Button>
        <FormControlLabel
          control={<Switch checked={demoMode} onChange={handleDemoToggle} disabled={demoLoading} />}
          label={demoMode ? 'Demo Mode: ON' : 'Demo Mode: OFF'}
        />
      </Box>
      <Dialog open={simDialogOpen} onClose={() => setSimDialogOpen(false)}>
        <DialogTitle>Simulate Incident</DialogTitle>
        <DialogContent>
          <Select
            fullWidth
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>Select a template</MenuItem>
            {templates.map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSimulate} disabled={!selectedTemplate} variant="contained">Simulate</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={simSuccess}
        autoHideDuration={3000}
        onClose={() => setSimSuccess(false)}
        message="Incident simulated successfully!"
      />
      {simError && <Alert severity="error" onClose={() => setSimError(null)}>{simError}</Alert>}
      <Box display="flex" gap={4} flexWrap="wrap">
        <Box flex={1} minWidth={300} bgcolor="#fff" p={2} borderRadius={2} boxShadow={1}>
          <Typography variant="h6">Incidents by Day</Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.incidentsByDay}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="incidents" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        <Box flex={1} minWidth={300} bgcolor="#fff" p={2} borderRadius={2} boxShadow={1}>
          <Typography variant="h6">Alert Severity</Typography>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.alertSeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.alertSeverity.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>
      {/* New widgets grid */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(4, 1fr)' }} gap={3} mt={4}>
        {/* Live Sensor Readings */}
        <Box bgcolor="#fff" p={2} borderRadius={2} boxShadow={1}>
          <Typography variant="subtitle1" gutterBottom>Live Sensor Readings</Typography>
          {sensorData.map(s => (
            <Box key={s.name} display="flex" alignItems="center" gap={1} mb={1}>
              <Typography fontWeight={600}>{s.name}:</Typography>
              <Typography>{s.value} {s.unit}</Typography>
            </Box>
          ))}
        </Box>
        {/* Machine Status */}
        <Box bgcolor="#fff" p={2} borderRadius={2} boxShadow={1}>
          <Typography variant="subtitle1" gutterBottom>Machine Status</Typography>
          {machineStatus.map(m => (
            <Box key={m.name} display="flex" alignItems="center" gap={1} mb={1}>
              <Box width={12} height={12} borderRadius="50%" bgcolor={statusColors[m.status]} />
              <Typography fontWeight={600}>{m.name}:</Typography>
              <Typography color={statusColors[m.status]}>{m.status}</Typography>
            </Box>
          ))}
        </Box>
        {/* Security Event Feed */}
        <Box bgcolor="#fff" p={2} borderRadius={2} boxShadow={1}>
          <Typography variant="subtitle1" gutterBottom>Security Event Feed</Typography>
          <Box maxHeight={120} overflow="auto">
            {securityEvents.map((e, idx) => (
              <Box key={idx} display="flex" alignItems="center" gap={1} mb={1}>
                <Typography fontWeight={600}>{e.time}</Typography>
                <Typography>{e.event}</Typography>
                <Typography color="text.secondary">({e.user})</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        {/* Incident Response Time Trends */}
        <Box bgcolor="#fff" p={2} borderRadius={2} boxShadow={1}>
          <Typography variant="subtitle1" gutterBottom>Incident Response Time (min)</Typography>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={responseTrends}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="time" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard; 