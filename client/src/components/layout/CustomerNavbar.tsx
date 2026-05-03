import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCustomerDashboard } from '../../api/hooks/useDashboard';
import { Wrench, Calendar, Gift, Car, User, LogOut, ClipboardList, LayoutDashboard, MoreHorizontal, X, PackageOpen, Bell } from 'lucide-react';

const tabItems = [
  { to: '/customer', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/customer/services', icon: Wrench, label: 'Services' },
  { to: '/customer/job-carts', icon: ClipboardList, label: 'Jobs' },
  { to: '/customer/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/customer/loyalty', icon: Gift, label: 'Loyalty' },
  { to: '/customer/buy-packages', icon: PackageOpen, label: 'Buy Packages' },
  { to: '/customer/vehicles', icon: Car, label: 'My Cars' },
  { to: '/customer/profile', icon: User, label: 'Profile' },
];

// Show 4 tabs + 1 'More' tab on mobile
const mobileTabItems = tabItems.slice(0, 4);

export default function CustomerNavbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const { data } = useCustomerDashboard();

  const activePackage = data?.active_package || null;
  const hasExpiryWarning = activePackage?.end_date && Math.ceil((new Date(activePackage.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Top navbar — dark premium */}
      <header className="fixed top-0 left-0 right-0 bg-[#111111] z-40 px-4 sm:px-6 h-16 flex items-center justify-between shadow-lg">
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D32F2F] via-[#D32F2F]/50 to-transparent" />
        
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="GK Auto Herb" className="w-8 h-8 rounded-lg object-contain" />
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">GK AutoHerb</h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest hidden sm:block">Premium Detail Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium hidden sm:inline">
            Hi, {user?.name?.split(' ')[0] || 'Customer'}
          </span>
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
              title="Notifications"
            >
              <Bell size={18} />
              {hasExpiryWarning && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-bold text-[#1c1b1b] uppercase tracking-wider">Notifications</p>
                </div>
                {activePackage?.end_date ? (() => {
                  const daysLeft = Math.ceil((new Date(activePackage.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const startStr = activePackage.start_date ? new Date(activePackage.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                  const endStr = new Date(activePackage.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                  const isExpired = daysLeft <= 0;
                  return (
                    <div className="p-4">
                      <div className={`rounded-xl p-3 ${isExpired ? 'bg-red-50 border border-red-200' : daysLeft <= 30 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                        <p className={`text-xs font-bold ${isExpired ? 'text-red-700' : daysLeft <= 30 ? 'text-amber-700' : 'text-green-700'}`}>
                          {isExpired ? '❌ Package Expired' : daysLeft <= 30 ? `⚠️ Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : '✅ Package Active'}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1 font-semibold">{activePackage.package_name}</p>
                        <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                          <span>📅 Start: <strong>{startStr}</strong></span>
                          <span>📅 End: <strong>{endStr}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    No active package
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-[#D32F2F] transition-colors p-2 rounded-lg hover:bg-white/5"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16">
          {mobileTabItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-2 py-1 transition-all duration-200 relative ${
                  isActive ? 'text-[#D32F2F]' : 'text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-gradient-to-r from-[#af101a] to-[#D32F2F] rounded-full" />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 transition-all duration-200 relative ${
              isMoreOpen ? 'text-[#D32F2F]' : 'text-gray-500'
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={isMoreOpen ? 2.5 : 1.5} />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-up Menu (More) */}
      {isMoreOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 sm:hidden transition-opacity" onClick={() => setIsMoreOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden transition-transform transform duration-300 translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-extrabold text-[#1c1b1b] text-lg">Menu</h3>
              <button onClick={() => setIsMoreOpen(false)} className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-1 pb-10">
              {tabItems.map(({ to, icon: Icon, label, end }) => {
                const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                      isActive ? 'bg-red-50 text-[#D32F2F]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-[#D32F2F]' : 'text-gray-400'} />
                    <span className="font-bold text-sm">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Desktop horizontal nav — dark theme */}
      <nav className="fixed top-16 left-0 right-0 bg-[#1a1a1a] border-b border-white/5 z-30 hidden sm:block">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all duration-200 ${
                  isActive
                    ? 'border-[#D32F2F] text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
