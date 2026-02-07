import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Full-bleed pages that shouldn't have container padding
  const fullBleed = ['/graph', '/chat'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="min-h-screen pt-14 md:ml-64">
        {fullBleed ? (
          <Outlet />
        ) : (
          <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
};
