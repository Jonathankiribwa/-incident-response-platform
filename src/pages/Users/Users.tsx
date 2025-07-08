import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const Users: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <DataGrid
        rows={users}
        columns={columns}
        pageSizeOptions={[5]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 5, page: 0 },
          },
        }}
      />
      {/* Add user management here */}
    </div>
  );
};

export default Users; 