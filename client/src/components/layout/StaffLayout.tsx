import { Outlet } from 'react-router-dom';
import StaffSidebar from './StaffSidebar';
import MobileNavbar from './MobileNavbar';

export default function StaffLayout() {
  return (
    <div className="min-h-screen light-mobile-bg text-slate-900 selection:bg-red-500/20 selection:text-red-700 relative font-sans overflow-x-hidden">
      {/* Ambient background glow effects matching luxury studio aesthetic */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-red-500/[0.03] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-10 left-1/3 w-80 h-80 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none z-0" />

      <MobileNavbar />
      <StaffSidebar />
      <main className="relative z-10 lg:ml-[240px] pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen safe-bottom-dock">
        <Outlet />
      </main>
    </div>
  );
}
