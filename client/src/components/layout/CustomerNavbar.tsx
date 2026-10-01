import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCustomerDashboard } from '../../api/hooks/useDashboard';
import { 
  Wrench, Calendar, Gift, Car, User, LogOut, ClipboardList, 
  LayoutDashboard, MoreHorizontal, X, PackageOpen, Bell, ShoppingBag, 
  CalendarPlus, ChevronRight, PhoneCall
} from 'lucide-react';

const menuItems = [
  { to: '/customer', icon: LayoutDashboard, label: 'Dashboard Home', desc: 'Overview, status & quick actions', end: true },
  { to: '/customer/bookings', icon: Calendar, label: 'My Appointments', desc: 'Upcoming & past bookings' },
  { to: '/customer/bookings/new', icon: Wrench, label: 'Services & Booking', desc: 'Browse services with car pricing & schedule slot' },
  { to: '/customer/vehicles', icon: Car, label: 'My Garage (Vehicles)', desc: 'Manage your registered cars' },
  { to: '/customer/buy-packages', icon: PackageOpen, label: 'Membership Packages', desc: 'Annual wash & detailing plans' },
  { to: '/customer/loyalty', icon: Gift, label: 'Rewards & Points', desc: 'Redeem free washes & credits' },
  { to: '/customer/products', icon: ShoppingBag, label: 'Car Care Store', desc: 'Microfibers, scents & accessories' },
  { to: '/customer/products?tab=orders', icon: PackageOpen, label: 'My Store Orders', desc: 'Track accessory purchases & deliveries' },
  { to: '/customer/job-carts', icon: ClipboardList, label: 'Service History', desc: 'Digital job sheets & invoices' },
  { to: '/customer/profile', icon: User, label: 'Customer Profile', desc: 'Account details & preferences' },
];

export default function CustomerNavbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const { data } = useCustomerDashboard();

  const vehicles = data?.vehicles || [];
  const activePackage = data?.active_package || null;
  const hasExpiryWarning = activePackage?.end_date && Math.ceil((new Date(activePackage.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30;
  const firstName = user?.name?.split(' ')[0] || 'Customer';
  const initial = firstName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* ── Top App Bar (Clean Light Glassmorphic) ─────────── */}
      <header className="fixed top-0 left-0 right-0 h-16 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <Link to="/customer" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#af101a] via-[#D32F2F] to-[#ff4d4d] p-[1px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[11px] flex items-center justify-center">
                <img src="/assets/logo.png" alt="GK AutoHerb" className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-900 tracking-tight leading-none">GK AutoHerb</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] animate-pulse" />
              </div>
              <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Detail Studio</p>
            </div>
          </Link>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Garage Quick Switch Pill */}
          <Link
            to="/customer/vehicles"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-xs font-semibold text-slate-700 transition-all hover:border-red-400/50"
          >
            <Car size={13} className="text-[#D32F2F]" />
            <span>Garage</span>
            <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
              {vehicles.length}
            </span>
          </Link>

          {/* Notification Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-all"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {hasExpiryWarning && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl p-4 z-50 border border-slate-200 shadow-2xl animate-scale-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-[#D32F2F]" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</h4>
                  </div>
                  <button onClick={() => setShowNotif(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                    ✕
                  </button>
                </div>
                
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                  {activePackage?.end_date ? (() => {
                    const daysLeft = Math.ceil((new Date(activePackage.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isExpired = daysLeft <= 0;
                    return (
                      <div className={`p-3 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200 text-red-800' : daysLeft <= 30 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-extrabold">{isExpired ? '❌ Package Expired' : daysLeft <= 30 ? `⚠️ Expires in ${daysLeft} Days` : '✅ Active Package'}</p>
                        </div>
                        <p className="text-xs font-bold text-slate-900 mt-1">{activePackage.package_name}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Valid till {new Date(activePackage.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <Link
                          to="/customer/buy-packages"
                          onClick={() => setShowNotif(false)}
                          className="mt-2.5 inline-block text-[10px] font-extrabold uppercase tracking-wider text-[#D32F2F] hover:underline"
                        >
                          View Membership →
                        </Link>
                      </div>
                    );
                  })() : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No new notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Pill */}
          <Link
            to="/customer/profile"
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-all group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-amber-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
              {initial}
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 hidden md:inline">
              {firstName}
            </span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all hidden sm:block"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Floating Bottom App Dock (Clean Light Theme) ─── */}
      <nav className="fixed bottom-4 sm:bottom-6 left-3 right-3 max-w-lg mx-auto z-40">
        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.1)] rounded-full px-3 py-1.5 flex items-center justify-between relative">
          
          {/* Tab 1: Home */}
          <NavLink
            to="/customer"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-2xl transition-all duration-300 relative ${
                isActive ? 'text-[#D32F2F] font-black' : 'text-slate-400 hover:text-slate-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard size={20} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'scale-110' : ''} />
                <span className="text-[9px] font-bold tracking-tight">Home</span>
                {isActive && <div className="absolute -bottom-0.5 w-3 h-1 bg-[#D32F2F] rounded-full" />}
              </>
            )}
          </NavLink>

          {/* Tab 2: Services (direct to booking & service menu) */}
          <NavLink
            to="/customer/bookings/new"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-2xl transition-all duration-300 relative ${
                isActive ? 'text-[#D32F2F] font-black' : 'text-slate-400 hover:text-slate-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Wrench size={20} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'scale-110' : ''} />
                <span className="text-[9px] font-bold tracking-tight">Services</span>
                {isActive && <div className="absolute -bottom-0.5 w-3 h-1 bg-[#D32F2F] rounded-full" />}
              </>
            )}
          </NavLink>

          {/* Center Elevated FAB: Quick Book */}
          <div className="relative -top-5 flex flex-col items-center">
            <Link
              to="/customer/bookings/new"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#af101a] via-[#D32F2F] to-[#ff5252] p-[2px] shadow-[0_8px_25px_rgba(211,47,47,0.4)] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
              aria-label="Book Slot"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D32F2F] to-[#9b0e17] flex items-center justify-center text-white border border-white/30">
                <CalendarPlus size={22} className="group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </Link>
            <span className="text-[9px] font-extrabold text-slate-800 uppercase tracking-wider mt-0.5">Book</span>
          </div>

          {/* Tab 4: Bookings / Appointments */}
          <NavLink
            to="/customer/bookings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-2xl transition-all duration-300 relative ${
                isActive ? 'text-[#D32F2F] font-black' : 'text-slate-400 hover:text-slate-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Calendar size={20} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'scale-110' : ''} />
                <span className="text-[9px] font-bold tracking-tight">Bookings</span>
                {isActive && <div className="absolute -bottom-0.5 w-3 h-1 bg-[#D32F2F] rounded-full" />}
              </>
            )}
          </NavLink>

          {/* Tab 5: More Menu Trigger */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-2xl transition-all duration-300 ${
              isMoreOpen ? 'text-[#D32F2F] font-black' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={isMoreOpen ? 2.5 : 1.8} className={isMoreOpen ? 'scale-110' : ''} />
            <span className="text-[9px] font-bold tracking-tight">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Slide-up Drawer Menu (Light Studio Hub) ──────── */}
      {isMoreOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity animate-fade-in flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsMoreOpen(false)}
        >
          <div 
            className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[85vh] flex flex-col text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  {initial}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-none">{user?.name || 'Customer'}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">{user?.mobile || 'GK AutoHerb Member'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMoreOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Links */}
            <div className="p-4 space-y-1.5 overflow-y-auto flex-1">
              {menuItems.map(({ to, icon: Icon, label, desc, end }) => {
                const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                      isActive 
                        ? 'bg-red-50 border border-red-200 text-red-700' 
                        : 'bg-slate-50/60 hover:bg-slate-100 border border-slate-100 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-200/60 text-slate-600'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className={isActive ? 'text-red-500' : 'text-slate-400'} />
                  </Link>
                );
              })}
            </div>

            {/* Sheet Footer with Sign Out & Support */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <a
                href="https://wa.me/919999999999"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <PhoneCall size={14} className="text-emerald-600" />
                <span>Studio Support</span>
              </a>
              <button
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


