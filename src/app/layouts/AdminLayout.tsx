import React from 'react';
import { Outlet } from 'react-router';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { ViewAsToggle } from '../components/shared/ViewAsToggle';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-ivory flex font-serif text-charcoal">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-gray-100 bg-white/50 backdrop-blur-sm px-8 flex items-center justify-end sticky top-0 z-10">
            <ViewAsToggle />
        </header>
        <main className="flex-1 overflow-auto p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
