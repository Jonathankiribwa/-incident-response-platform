import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useAuth } from '../../hooks/useAuth';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

interface User {
  id: string;
  email: string;
  role: string;
}

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 100 },
  { field: 'email', headerName: 'Email', width: 200 },
  { field: 'role', headerName: 'Role', width: 150 },
];

const Users: React.FC = () => {
  const { isAuthenticated, authFetch, currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    authFetch('/api/users')
      .then(res => {
        if (res.status === 403) throw new Error('You are not authorized to view this page.');
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setUsers(data.users))
      .catch((err) => setError(err.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authFetch]);

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    try {
      const res = await authFetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmail, role: editRole }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      const data = await res.json();
      setUsers(users.map(u => (u.id === editUser.id ? data.user : u)));
      setEditUser(null);
    } catch {
      setError('Failed to update user.');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const res = await authFetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(users.filter(u => u.id !== deleteUser.id));
      setDeleteUser(null);
    } catch {
      setError('Failed to delete user.');
    }
  };

  const handlePromote = async (user: User) => {
    try {
      const res = await authFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, role: 'admin' }),
      });
      if (!res.ok) throw new Error('Failed to promote user');
      const data = await res.json();
      setUsers(users.map(u => (u.id === user.id ? data.user : u)));
    } catch {
      setError('Failed to promote user.');
    }
  };

  const adminColumns = [
    ...columns,
    {
      field: 'actions',
      headerName: 'Actions',
      width: 220,
      renderCell: (params: any) => (
        <>
          <IconButton onClick={() => handleEdit(params.row)} size="small"><EditIcon /></IconButton>
          <IconButton onClick={() => setDeleteUser(params.row)} size="small" color="error"><DeleteIcon /></IconButton>
          {params.row.role !== 'admin' && (
            <Button size="small" color="primary" onClick={() => handlePromote(params.row)} sx={{ ml: 1 }}>
              Upgrade to Admin
            </Button>
          )}
        </>
      ),
      sortable: false,
      filterable: false,
    },
  ];

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Users</Typography>
      <Box sx={{ height: 400, width: '100%', background: '#fff', borderRadius: 2, boxShadow: 1 }}>
        <DataGrid
          rows={users}
          columns={currentUser?.role === 'admin' ? adminColumns : columns}
          pageSizeOptions={[5]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5, page: 0 },
            },
          }}
          loading={loading}
        />
      </Box>
      {/* Edit Dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
          <TextField label="Email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
          <TextField label="Role" value={editRole} onChange={e => setEditRole(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      {/* Delete Dialog */}
      <Dialog open={!!deleteUser} onClose={() => setDeleteUser(null)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>Are you sure you want to delete user {deleteUser?.email}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users; 