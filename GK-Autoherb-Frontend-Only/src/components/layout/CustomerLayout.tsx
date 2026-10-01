import { Outlet } from 'react-router-dom';
import CustomerNavbar from './CustomerNavbar';

export default function CustomerLayout() {
  return (
    <div className="min-h-screen light-mobile-bg text-slate-900 selection:bg-red-500/20 selection:text-red-700 relative font-sans overflow-x-hidden">
      {/* Ambient background glow effects for light mode */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-sky-500/[0.04] rounded-full blur-3xl pointer-events-none z-0" />
      
      {/* App Navbar / Floating Dock */}
      <CustomerNavbar />

      {/* Main App Content Viewport */}
      <main className="relative z-10 pt-16 sm:pt-20 pb-32 sm:pb-20 px-3.5 sm:px-6 max-w-4xl mx-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

