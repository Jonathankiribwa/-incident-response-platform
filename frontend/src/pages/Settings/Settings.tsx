import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useAuth } from '../../hooks/useAuth';
import TextField from '@mui/material/TextField';

const Settings: React.FC = () => {
  const { isAuthenticated, authFetch, logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    authFetch('/api/auth/profile')
      .then(res => {
        if (res.status === 403) throw new Error('You are not authorized to view this page.');
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setUser(data.user))
      .catch((err) => setError(err.message || 'Failed to load profile.'));
  }, [isAuthenticated, authFetch]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChanging(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setOldPassword('');
        setNewPassword('');
      } else {
        setError(data.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setChanging(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return <Typography>Loading...</Typography>;

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Profile / Settings</Typography>
      <Box bgcolor="#fff" p={2} borderRadius={2} boxShadow={1} maxWidth={400}>
        <Typography variant="body1"><b>Email:</b> {user.email}</Typography>
        <Typography variant="body1"><b>Role:</b> {user.role}</Typography>
        <Button variant="outlined" color="secondary" sx={{ mt: 2 }} onClick={logout}>
          Logout
        </Button>
        <Box component="form" onSubmit={handleChangePassword} mt={3} display="flex" flexDirection="column" gap={2}>
          <Typography variant="h6">Change Password</Typography>
          <TextField
            label="Old Password"
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            required
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" color="primary" disabled={changing}>
            {changing ? 'Changing...' : 'Change Password'}
          </Button>
          {success && <Alert severity="success">{success}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </Box>
    </Box>
  );
};

export default Settings; 