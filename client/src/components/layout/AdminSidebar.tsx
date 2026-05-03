import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard, ClipboardList, Package, Calendar, CalendarCheck, Wrench, Users,
  DollarSign, MessageSquare, HelpCircle, Upload, Settings, LogOut, X, ShoppingCart, Layers, FileText, Wallet, Archive, PlusCircle, Trash2
} from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/job-carts', icon: ClipboardList, label: 'Job Carts' },
  { to: '/admin/inventory', icon: Package, label: 'Inventory' },
  { to: '/admin/buy-sell', icon: ShoppingCart, label: 'Buy & Sell' },
  { to: '/admin/slots', icon: Calendar, label: 'Slots & Bookings' },
  { to: '/admin/customer-bookings', icon: CalendarCheck, label: 'Customer Bookings' },
  { to: '/admin/add-customer', icon: PlusCircle, label: 'Add Customer' },
  { to: '/admin/customers', icon: Users, label: 'Customers CRM' },
  { to: '/admin/services', icon: Wrench, label: 'Services' },
  { to: '/admin/packages', icon: Layers, label: 'Packages' },
  { to: '/admin/package-approvals', icon: Package, label: 'Package Approvals' },
  { to: '/admin/staff', icon: Users, label: 'Staff' },
  { to: '/admin/salary', icon: Wallet, label: 'Salary' },
  { to: '/admin/accounts', icon: DollarSign, label: 'Accounts' },
  { to: '/admin/billing', icon: FileText, label: 'Manual Billing' },
  { to: '/admin/invoices', icon: Archive, label: 'All Invoices' },
  { to: '/admin/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/admin/inquiries', icon: HelpCircle, label: 'Inquiries' },
  { to: '/admin/import', icon: Upload, label: 'Import' },
  { to: '/admin/archive', icon: Trash2, label: 'Recycle Bin' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`w-[240px] h-screen fixed left-0 top-0 bg-gradient-to-b from-[#111111] to-[#0d0d0d] flex flex-col py-8 shadow-2xl z-[80] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="px-6 mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#af101a] to-[#D32F2F] flex items-center justify-center shadow-glow-red">
                <span className="text-white font-black text-[10px]">GK</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">AutoHerb</h1>
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 ml-[38px]">Admin Terminal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Subtle separator */}
        <div className="mx-6 mb-4 h-px bg-gradient-to-r from-[#D32F2F]/30 via-[#D32F2F]/10 to-transparent" />

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto dark-scroll">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `px-6 py-3 flex items-center gap-3 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-white border-l-4 border-[#D32F2F] bg-white/5 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/10 border-l-4 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={`transition-all duration-200 ${isActive ? 'text-[#D32F2F] drop-shadow-[0_0_6px_rgba(211,47,47,0.4)]' : ''}`} />
                  <span className="text-sm font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-6 mt-auto">
          <div className="flex items-center gap-3 pt-6 border-t border-white/10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#af101a] to-[#D32F2F] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-glow-red">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-gray-500">GK AutoHerb v1.0</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
