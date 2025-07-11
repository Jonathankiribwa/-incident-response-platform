import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const AlertComp = React.forwardRef(function Alert(props: any, ref: any) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) {
          setSuccess(data.message || 'Login successful!');
          setSnackbar({ open: true, message: data.message || 'Login successful!', severity: 'success' });
          // Optionally, store token: localStorage.setItem('token', data.token);
          localStorage.setItem('token', data.token);
          setTimeout(() => navigate('/'), 1000);
        } else {
          setError(data.error || 'Login failed.');
          setSnackbar({ open: true, message: data.error || 'Login failed.', severity: 'error' });
        }
      } else {
        const text = await res.text();
        setError(text || 'Unexpected server response.');
        setSnackbar({ open: true, message: text || 'Unexpected server response.', severity: 'error' });
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
      setSnackbar({ open: true, message: err.message || 'Network error.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <h1>Login</h1>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>
        <Button component={RouterLink} to="/register" color="secondary">
          Don&apos;t have an account? Sign up
        </Button>
        <Button component={RouterLink} to="/forgot-password" color="secondary">
          Forgot Password?
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <AlertComp onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </AlertComp>
      </Snackbar>
    </Box>
  );
};

export default Login; 