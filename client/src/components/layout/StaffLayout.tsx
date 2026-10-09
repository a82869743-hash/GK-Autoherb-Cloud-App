import { Outlet } from 'react-router-dom';
import StaffTopBar from './StaffTopBar';
import StaffBottomNav from './StaffBottomNav';

export default function StaffLayout() {
  return (
    <div className="min-h-screen light-mobile-bg text-slate-900 selection:bg-red-500/20 selection:text-red-700 relative font-sans overflow-x-hidden">
      {/* Ambient background glow effects matching luxury studio aesthetic */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-red-500/[0.03] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-10 left-1/3 w-80 h-80 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none z-0" />

      {/* Slim 56px Top App Bar with Attendance Chip & Profile Dropdown */}
      <StaffTopBar />

      {/* Centered App Viewport with Safe Bottom Padding */}
      <main className="relative z-10 pt-16 sm:pt-20 pb-24 px-3.5 sm:px-6 max-w-4xl mx-auto min-h-screen">
        <Outlet />
      </main>

      {/* Fixed 56px Bottom Tab Bar (5 Tabs) */}
      <StaffBottomNav />
    </div>
  );
}
