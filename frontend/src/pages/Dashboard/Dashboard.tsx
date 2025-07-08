import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../../hooks/useAuth';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

const Dashboard: React.FC = () => {
  const { isAuthenticated, authFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Typography>Loading...</Typography>;

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
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
    </Box>
  );
};

export default Dashboard; 