import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminMobileTopBar from './AdminMobileTopBar';
import AdminMobileDock from './AdminMobileDock';
import AdminAppLauncherDrawer from './AdminAppLauncherDrawer';

export default function AdminLayout() {
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  return (
    <div className="min-h-screen light-mobile-bg text-slate-900 selection:bg-red-500/20 selection:text-red-700 relative font-sans overflow-x-hidden">
      {/* Ambient background glow effects matching luxury studio aesthetic */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-red-500/[0.03] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-10 left-1/3 w-80 h-80 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none z-0" />

      {/* Universal Top App Header */}
      <AdminMobileTopBar />

      {/* Main Viewport Content Area (Full screen width, no sideways sidebar) */}
      <main className="relative z-10 pt-20 pb-32 px-3 sm:px-6 lg:px-8 min-h-screen max-w-[1600px] mx-auto">
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
