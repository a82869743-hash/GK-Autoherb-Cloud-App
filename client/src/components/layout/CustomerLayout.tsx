import { useEffect } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Home, Sparkles, CalendarDays, Gift, UserRound } from 'lucide-react';
import CustomerChatbotWidget from '../shared/CustomerChatbotWidget';
import { useCustomerProfile } from '../../api/hooks/useCustomerApp';

const TABS = [
  { to: '/customer', label: 'Home', icon: Home, end: true },
  { to: '/customer/services', label: 'Services', icon: Sparkles },
  { to: '/customer/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/customer/loyalty', label: 'Rewards', icon: Gift },
  { to: '/customer/profile', label: 'Profile', icon: UserRound },
];

// Full-screen flows hide the tab bar so the sticky action button has room
const HIDE_TABS = ['/customer/bookings/new', '/customer/complete-profile', '/customer/delivery/'];

export default function CustomerLayout() {
  const location = useLocation();
  const { data: profile, isLoading } = useCustomerProfile();
  const hideTabs = HIDE_TABS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Gender + one saved address are required before using the app
  if (!isLoading && profile && !profile.profile_complete && location.pathname !== '/customer/complete-profile') {
    return <Navigate to="/customer/complete-profile" replace />;
  }

  return (
    <div className="app-shell font-sans text-slate-900">
      <main className={`mx-auto w-full max-w-md px-4 ${hideTabs ? 'pb-8' : 'pb-28'} min-h-[100dvh] relative`}>
        <Outlet />
      </main>

      {!hideTabs && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200/80 pb-safe">
          <div className="mx-auto max-w-md grid grid-cols-5 h-16">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className="flex flex-col items-center justify-center gap-0.5">
                {({ isActive }) => (
                  <>
                    <span className={`h-8 w-12 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-red-50 text-[#D32F2F]' : 'text-slate-400'}`}>
                      <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
                    </span>
                    <span className={`text-[11px] font-display ${isActive ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-400'}`}>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* AI concierge lives only as the floating chat button (no dashboard banner) */}
      {!hideTabs && <CustomerChatbotWidget />}
    </div>
  );
}
