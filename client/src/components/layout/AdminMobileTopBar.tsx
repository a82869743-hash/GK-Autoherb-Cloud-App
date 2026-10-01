import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, ChevronDown, Check, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardStats } from '../../api/hooks/useDashboard';
import LiveSearch from '../shared/LiveSearch';

export default function AdminMobileTopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: stats } = useDashboardStats();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('crm-accent') || 'red');

  const pendingCount = (stats?.pending_service_bookings || 0) + (stats?.pending_package_requests || 0) + (stats?.pending_product_orders || 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('crm-accent', color);
    window.dispatchEvent(new Event('crm-theme-changed'));
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <>
      {/* ── Universal Studio Top Header (Desktop & Mobile) ──────────────── */}
      <header className="fixed top-0 left-0 right-0 h-16 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        {/* Left: Brand + Telemetry Indicator */}
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#af101a] via-[#D32F2F] to-[#ff5252] p-[1.5px] shadow-sm flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <span className="text-[#D32F2F] font-black text-xs">GK</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">AutoHerb</h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Admin Studio Portal</p>
          </div>
        </Link>

        {/* Center: Live Search (Visible on md and lg screens) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <LiveSearch />
        </div>

        {/* Right: Actions (Mobile Search, Alerts, Accent, Avatar) */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Button (Mobile only) */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="md:hidden p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all active:scale-95"
            aria-label="Search Studio"
          >
            <Search size={16} />
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifModal(!showNotifModal)}
              className="relative p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all active:scale-95"
              aria-label="System Alerts"
            >
              <Bell size={16} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D32F2F] text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifModal && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-3xl p-4 z-50 border border-slate-200 shadow-2xl animate-scale-in text-slate-900">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Bell size={13} className="text-[#D32F2F]" />
                    <span>System Alerts</span>
                  </span>
                  <button onClick={() => setShowNotifModal(false)} className="text-slate-400 text-xs hover:text-slate-600">✕</button>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {(stats?.pending_service_bookings || 0) > 0 && (
                    <Link
                      to="/admin/customer-bookings"
                      onClick={() => setShowNotifModal(false)}
                      className="block p-2.5 rounded-2xl hover:bg-red-50 text-red-700 font-bold"
                    >
                      {stats?.pending_service_bookings} Booking(s) Pending Review →
                    </Link>
                  )}
                  {(stats?.pending_package_requests || 0) > 0 && (
                    <Link
                      to="/admin/package-approvals"
                      onClick={() => setShowNotifModal(false)}
                      className="block p-2.5 rounded-2xl hover:bg-purple-50 text-purple-700 font-bold"
                    >
                      {stats?.pending_package_requests} Package Membership Request(s) →
                    </Link>
                  )}
                  {(stats?.pending_product_orders || 0) > 0 && (
                    <Link
                      to="/admin/product-orders"
                      onClick={() => setShowNotifModal(false)}
                      className="block p-2.5 rounded-2xl hover:bg-red-50 text-red-700 font-bold"
                    >
                      {stats?.pending_product_orders} Product Store Order(s) →
                    </Link>
                  )}
                  {pendingCount === 0 && (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      All caught up • No pending tasks
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D32F2F] to-[#af101a] text-white flex items-center justify-center text-xs font-black shadow-xs">
                {initial}
              </div>
              <span className="text-xs font-bold text-slate-800 hidden sm:inline truncate max-w-[100px]">
                {user?.name?.split(' ')[0] || 'Admin'}
              </span>
              <ChevronDown size={12} className="text-slate-500" />
            </button>

            {/* Profile Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-3xl p-3.5 z-50 border border-slate-200 shadow-2xl animate-scale-in text-slate-900">
                <div className="pb-2.5 border-b border-slate-100 px-1 mb-2">
                  <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{user?.email || 'admin@gkautoherb.com'}</p>
                </div>

                <Link
                  to="/admin/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Sparkles size={14} className="text-[#D32F2F]" />
                  <span>Studio Settings</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-red-50 text-xs font-bold text-red-600 transition-colors mt-1"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Global Search Modal Overlay (Mobile) ─────────────────── */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] p-4 flex flex-col pt-16"
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">Global Studio Search</span>
              <button onClick={() => setShowSearchModal(false)} className="text-xs text-slate-400 hover:text-slate-600">✕ Close</button>
            </div>
            <div className="pt-3">
              <LiveSearch />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
