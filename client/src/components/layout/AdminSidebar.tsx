import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard, ClipboardList, Package, Calendar, CalendarCheck, Wrench, Users,
  DollarSign, MessageSquare, HelpCircle, Upload, Settings, LogOut, X, ShoppingCart,
  Layers, FileText, Wallet, Archive, PlusCircle, Trash2, ChevronDown, ChevronRight,
  Droplets, Star, Search, Truck, Sparkles, CreditCard, BarChart3, Shield, CheckSquare, Gift
} from 'lucide-react';

// ─── Category-based navigation with collapsible sections ─────
interface NavCategory {
  label: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  badge?: string;
}

const navCategories: NavCategory[] = [
  {
    label: 'Overview',
    defaultOpen: true,
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Operations',
    defaultOpen: true,
    items: [
      { to: '/admin/job-carts', icon: ClipboardList, label: 'Job Carts' },
      { to: '/admin/quick-wash', icon: Droplets, label: 'Quick Wash', badge: 'New' },
      { to: '/admin/slots', icon: Calendar, label: 'Slots & Bookings' },
      { to: '/admin/customer-bookings', icon: CalendarCheck, label: 'Customer Bookings' },
      { to: '/admin/deliveries', icon: Truck, label: 'Deliveries' },
    ],
  },
  {
    label: 'Customers',
    defaultOpen: true,
    items: [
      { to: '/admin/customers', icon: Users, label: 'Customers CRM' },
      { to: '/admin/add-customer', icon: PlusCircle, label: 'Add Customer' },
      { to: '/admin/packages', icon: Layers, label: 'Packages' },
      { to: '/admin/package-approvals', icon: Package, label: 'Package Approvals' },
      { to: '/admin/loyalty', icon: Star, label: 'Loyalty Points', badge: 'New' },
      { to: '/admin/customer-rewards', icon: Gift, label: 'Customer Rewards', badge: 'New' },
    ],
  },
  {
    label: 'Services',
    items: [
      { to: '/admin/services', icon: Wrench, label: 'All Services' },
      { to: '/admin/premium-services', icon: Sparkles, label: 'Premium Services', badge: 'New' },
    ],
  },
  {
    label: 'Inventory & Stock',
    items: [
      { to: '/admin/inventory', icon: Package, label: 'Inventory' },
      { to: '/admin/buy-sell', icon: ShoppingCart, label: 'Buy & Sell' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/admin/accounts', icon: DollarSign, label: 'Accounts' },
      { to: '/admin/payments', icon: CreditCard, label: 'Payments', badge: 'New' },
      { to: '/admin/billing', icon: FileText, label: 'Manual Billing' },
      { to: '/admin/invoices', icon: Archive, label: 'All Invoices' },
      { to: '/admin/quotations', icon: ClipboardList, label: 'Quotations', badge: 'New' },
      { to: '/admin/balance-sheet', icon: BarChart3, label: 'Balance Sheet', badge: 'New' },
    ],
  },
  {
    label: 'Staff & HR',
    items: [
      { to: '/admin/staff', icon: Users, label: 'Staff' },
      { to: '/admin/salary', icon: Wallet, label: 'Salary' },
      { to: '/admin/staff-hr', icon: CheckSquare, label: 'Tasks & HR', badge: 'New' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/admin/messages', icon: MessageSquare, label: 'Messages' },
      { to: '/admin/whatsapp', icon: MessageSquare, label: 'WhatsApp', badge: 'New' },
      { to: '/admin/inquiries', icon: HelpCircle, label: 'Inquiries' },
      { to: '/admin/feedback', icon: Star, label: 'Feedback', badge: 'New' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs', badge: 'New' },
      { to: '/admin/import', icon: Upload, label: 'Import' },
      { to: '/admin/archive', icon: Trash2, label: 'Recycle Bin' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function CollapsibleCategory({
  category,
  onNavClick,
}: {
  category: NavCategory;
  onNavClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(category.defaultOpen ?? false);

  // Single item categories (like Overview) are always open
  if (category.items.length === 1 && category.label === 'Overview') {
    return (
      <div className="mb-1">
        {category.items.map((item) => (
          <SidebarNavLink key={item.to} item={item} onClick={onNavClick} />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 hover:text-gray-300 transition-colors"
      >
        <span>{category.label}</span>
        {isOpen
          ? <ChevronDown size={12} className="text-gray-600" />
          : <ChevronRight size={12} className="text-gray-600" />
        }
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {category.items.map((item) => (
          <SidebarNavLink key={item.to} item={item} onClick={onNavClick} />
        ))}
      </div>
    </div>
  );
}

function SidebarNavLink({ item, onClick }: { item: NavItem; onClick: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `px-6 py-2.5 flex items-center gap-3 transition-all duration-200 active:scale-[0.98] ${
          isActive
            ? 'text-white border-l-4 border-[#D32F2F] bg-white/5 font-semibold'
            : 'text-gray-400 hover:text-white hover:bg-white/[0.06] border-l-4 border-transparent'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={18}
            className={`transition-all duration-200 shrink-0 ${
              isActive ? 'text-[#D32F2F] drop-shadow-[0_0_6px_rgba(211,47,47,0.4)]' : ''
            }`}
          />
          <span className="text-sm font-medium truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto text-[9px] font-bold bg-[#D32F2F] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function AdminSidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
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
        className={`w-[250px] h-screen fixed left-0 top-0 bg-gradient-to-b from-[#111111] to-[#0d0d0d] flex flex-col py-6 shadow-2xl z-[80] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="px-6 mb-6 flex items-center justify-between">
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
        <div className="mx-6 mb-3 h-px bg-gradient-to-r from-[#D32F2F]/30 via-[#D32F2F]/10 to-transparent" />

        {/* Nav - collapsible categories */}
        <nav className="flex-1 overflow-y-auto dark-scroll pb-4">
          {navCategories.map((category) => (
            <CollapsibleCategory
              key={category.label}
              category={category}
              onNavClick={handleNavClick}
            />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-6 mt-auto shrink-0">
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#af101a] to-[#D32F2F] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-glow-red">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-gray-500">GK AutoHerb v2.0</p>
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
