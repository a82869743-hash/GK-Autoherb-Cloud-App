import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminMobileTopBar from './AdminMobileTopBar';
import AdminMobileDock from './AdminMobileDock';
import AdminAppLauncherDrawer from './AdminAppLauncherDrawer';

export default function AdminLayout() {
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  return (
    <div className="app-shell ops-app relative font-sans text-slate-900 overflow-x-hidden">

      {/* Universal Top App Header */}
      <AdminMobileTopBar />

      {/* Main Viewport Content Area (Full screen width, no sideways sidebar) */}
      <main className="relative z-10 pt-[calc(4rem+env(safe-area-inset-top)+0.5rem)] pb-28 px-4 sm:px-6 lg:px-8 min-h-screen max-w-[1600px] mx-auto">
        <Outlet />
      </main>

      {/* Floating Bottom Navigation Dock (Centered on all viewports) */}
      <AdminMobileDock 
        onOpenLauncher={() => setIsLauncherOpen(true)} 
        isLauncherOpen={isLauncherOpen} 
      />

      {/* Native Slide-up Studio App Launcher Drawer for all 45 pages */}
      <AdminAppLauncherDrawer 
        isOpen={isLauncherOpen} 
        onClose={() => setIsLauncherOpen(false)} 
      />
    </div>
  );
}
