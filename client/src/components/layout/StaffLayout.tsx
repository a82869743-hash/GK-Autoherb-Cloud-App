import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import StaffTopBar from './StaffTopBar';
import StaffBottomNav from './StaffBottomNav';

export default function StaffLayout() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="app-shell ops-app font-sans text-slate-900 overflow-x-hidden">
      <StaffTopBar />
      <main className="relative mx-auto w-full max-w-md lg:max-w-4xl px-4 pt-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] pb-28 min-h-[100dvh]">
        <Outlet />
      </main>
      <StaffBottomNav />
    </div>
  );
}
