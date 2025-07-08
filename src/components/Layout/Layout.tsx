import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Add navigation/sidebar here */}
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 