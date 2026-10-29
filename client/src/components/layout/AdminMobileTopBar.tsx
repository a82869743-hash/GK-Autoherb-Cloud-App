import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, Settings, ChevronRight, CalendarCheck, Package, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardStats } from '../../api/hooks/useDashboard';
import LiveSearch from '../shared/LiveSearch';
import { BottomSheet } from '../customer/ui';
import { useUnreadNotifications } from '../../api/hooks/useAppNotifications';
import { NotificationsList, PushCard } from '../shared/NotificationsInbox';

/** Light app header (customer-app style) with search, alerts and profile sheets. */
export default function AdminMobileTopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: stats } = useDashboardStats();

  const [showSearch, setShowSearch] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);

  const { data: unread = 0 } = useUnreadNotifications();
  const pendingCount = (stats?.pending_service_bookings || 0) + (stats?.pending_package_requests || 0) + (stats?.pending_product_orders || 0) + unread;
  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const initial = firstName.charAt(0).toUpperCase();

  const alerts = [
    { n: stats?.pending_service_bookings || 0, label: 'bookings waiting for review', to: '/admin/customer-bookings', icon: CalendarCheck, tone: 'bg-red-50 text-[#D32F2F]' },
    { n: stats?.pending_package_requests || 0, label: 'package requests', to: '/admin/package-approvals', icon: Package, tone: 'bg-purple-50 text-purple-600' },
    { n: stats?.pending_product_orders || 0, label: 'store orders', to: '/admin/product-orders', icon: ShoppingBag, tone: 'bg-amber-50 text-amber-600' },
  ].filter((a) => a.n > 0);

  const go = (to: string) => {
    setShowNotif(false);
    setShowUser(false);
    navigate(to);
  };

  const roundBtn = 'relative h-10 w-10 rounded-full bg-white shadow-app flex items-center justify-center text-slate-700 active:scale-95 transition-transform';

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-[#f3f4f6]/95 backdrop-blur-md pt-safe">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/admin" className="flex items-center gap-2.5 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-[#111] text-white flex items-center justify-center font-display font-black text-sm shrink-0">GK</span>
            <span className="min-w-0">
              <span className="block font-display text-[16px] font-extrabold text-slate-900 leading-tight truncate">Hi, {firstName}</span>
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 leading-tight">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> GK AutoHerb · Admin
              </span>
            </span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <LiveSearch />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowSearch(true)} className={`md:hidden ${roundBtn}`} aria-label="Search">
              <Search size={18} />
            </button>
            <button onClick={() => setShowNotif(true)} className={roundBtn} aria-label="Alerts">
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D32F2F] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#f3f4f6]">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowUser(true)}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-[#e53935] to-[#b71c1c] text-white font-display font-extrabold text-sm active:scale-95"
              aria-label="Account"
            >
              {initial}
            </button>
          </div>
        </div>
      </header>

      <BottomSheet open={showSearch} onClose={() => setShowSearch(false)} title="Search">
        <div className="min-h-[50dvh]">
          <LiveSearch />
        </div>
      </BottomSheet>

      <BottomSheet open={showNotif} onClose={() => setShowNotif(false)} title="Alerts">
        <div className="mb-4"><PushCard /></div>
        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-display font-bold text-slate-900">All caught up</p>
            <p className="text-sm text-slate-500 mt-1">Nothing is waiting for you.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <button key={a.to} onClick={() => go(a.to)} className="w-full app-card flex items-center gap-3 p-3 text-left">
                <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.tone}`}><a.icon size={19} /></span>
                <span className="flex-1 text-[14px] text-slate-700">
                  <b className="font-display text-slate-900">{a.n}</b> {a.label}
                </span>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            ))}
          </div>
        )}
        <p className="mt-5 mb-2 font-display text-[15px] font-extrabold text-slate-900">Recent notifications</p>
        <NotificationsList onNavigate={() => setShowNotif(false)} />
      </BottomSheet>

      <BottomSheet open={showUser} onClose={() => setShowUser(false)} title={user?.name || 'Administrator'}>
        <p className="-mt-2 mb-4 text-xs text-slate-500">{user?.email || user?.mobile || 'GK AutoHerb admin'}</p>
        <button onClick={() => go('/admin/settings')} className="w-full app-card flex items-center gap-3 p-3 text-left">
          <span className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Settings size={19} /></span>
          <span className="flex-1 font-display font-bold text-[14px] text-slate-900">Studio settings</span>
          <ChevronRight size={18} className="text-slate-300" />
        </button>
        <button
          onClick={() => {
            setShowUser(false);
            logout();
          }}
          className="mt-4 w-full app-btn-outline text-[#D32F2F]"
        >
          <LogOut size={17} /> Sign out
        </button>
      </BottomSheet>
    </>
  );
}
