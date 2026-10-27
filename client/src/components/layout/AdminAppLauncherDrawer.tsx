import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../customer/ui';
import { 
  X, Search, LayoutDashboard, ClipboardList, Droplets, Calendar, CalendarCheck, MapPin, Truck,
  Users, PlusCircle, Layers, Package, Star, Gift, Wrench, Sparkles, ShoppingCart, ShoppingBag,
  DollarSign, CreditCard, FileText, Archive, BarChart3, Wallet, CheckSquare, MessageSquare,
  HelpCircle, Shield, Upload, Trash2, Settings, ExternalLink, ChevronRight, Bell, Bot, Tag
} from 'lucide-react';
import { useDashboardStats } from '../../api/hooks/useDashboard';

interface AppItem {
  name: string;
  desc: string;
  to: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badge?: string | number;
}

interface AppCategory {
  category: string;
  items: AppItem[];
}

interface AdminAppLauncherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminAppLauncherDrawer({ isOpen, onClose }: AdminAppLauncherDrawerProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stats } = useDashboardStats();

  const categories: AppCategory[] = useMemo(() => [
    {
      category: 'Operations',
      items: [
        { name: 'Job Carts', desc: 'Active & past repair cards', to: '/admin/job-carts', icon: ClipboardList, color: 'text-red-600', bgColor: 'bg-red-50 border-red-100', badge: stats?.open_job_carts ? `${stats.open_job_carts} bay` : undefined },
        { name: 'Quick Wash', desc: 'Express walk-in wash bay', to: '/admin/quick-wash', icon: Droplets, color: 'text-sky-600', bgColor: 'bg-sky-50 border-sky-100' },
        { name: 'Bay Slots', desc: 'Weekly booking schedule', to: '/admin/slots', icon: Calendar, color: 'text-[#D32F2F]', bgColor: 'bg-red-50 border-red-100' },
        { name: 'Bookings Queue', desc: 'Customer appointment slots', to: '/admin/customer-bookings', icon: CalendarCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100', badge: stats?.pending_service_bookings ? `${stats.pending_service_bookings} new` : undefined },
        { name: 'Pickups', desc: 'Doorstep vehicle pickups', to: '/admin/pickups', icon: MapPin, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100' },
        { name: 'Deliveries', desc: 'Vehicle drop-offs & GPS', to: '/admin/deliveries', icon: Truck, color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-100' },
      ]
    },
    {
      category: 'Customers & Memberships',
      items: [
        { name: 'Customers CRM', desc: 'Customer profiles & garage', to: '/admin/customers', icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-100' },
        { name: 'Add Customer', desc: 'Manual walk-in registration', to: '/admin/add-customer', icon: PlusCircle, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-100' },
        { name: 'Packages Catalog', desc: 'Tier pricing & inclusions', to: '/admin/packages', icon: Layers, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100' },
        { name: 'Package Approvals', desc: 'Customer membership orders', to: '/admin/package-approvals', icon: Package, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100', badge: stats?.pending_package_requests || undefined },
        { name: 'Package EMI', desc: 'Installments, dues & collections', to: '/admin/package-emi', icon: CreditCard, color: 'text-[#D32F2F]', bgColor: 'bg-red-50 border-red-100' },
        { name: 'Package Tracking', desc: 'Active subscription quotas', to: '/admin/package-tracking', icon: Layers, color: 'text-cyan-600', bgColor: 'bg-cyan-50 border-cyan-100' },
        { name: 'Loyalty Points', desc: 'Points ratio & customer lookup', to: '/admin/loyalty', icon: Star, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-100' },
        { name: 'Customer Rewards', desc: 'Welcome wash & gift perks', to: '/admin/customer-rewards', icon: Gift, color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-100' },
        { name: 'Coupons & Offers', desc: 'Promo codes & discounts', to: '/admin/coupons', icon: Tag, color: 'text-red-600', bgColor: 'bg-red-50 border-red-100' },
      ]
    },
    {
      category: 'Services',
      items: [
        { name: 'All Services', desc: 'Wash, detailing & pricing', to: '/admin/services', icon: Wrench, color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
        { name: 'Premium Services', desc: 'Ceramic, PPF & Add-ons', to: '/admin/premium-services', icon: Sparkles, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100' },
      ]
    },
    {
      category: 'Inventory & Stock',
      items: [
        { name: 'Inventory Stock', desc: 'Warehouse parts & chemicals', to: '/admin/inventory', icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100', badge: stats?.low_stock_items ? `${stats.low_stock_items} low` : undefined },
        { name: 'Buy & Sell', desc: 'Wholesale parts trading', to: '/admin/buy-sell', icon: ShoppingCart, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100' },
        { name: 'Product Orders', desc: 'Customer online store orders', to: '/admin/product-orders', icon: ShoppingBag, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-100', badge: stats?.pending_product_orders || undefined },
      ]
    },
    {
      category: 'Finance & Billing',
      items: [
        { name: 'Accounts Ledger', desc: 'Cashbook, GST & expenses', to: '/admin/accounts', icon: DollarSign, color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-100' },
        { name: 'Quick Billing', desc: 'Counter POS terminal', to: '/admin/billing', icon: FileText, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-100' },
        { name: 'All Invoices', desc: 'PDF invoices repository', to: '/admin/invoices', icon: Archive, color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-100' },
        { name: 'Quotations', desc: 'Estimates & conversions', to: '/admin/quotations', icon: ClipboardList, color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-100' },
        { name: 'Payments', desc: 'Razorpay, UPI & counter', to: '/admin/payments', icon: CreditCard, color: 'text-teal-700', bgColor: 'bg-teal-50 border-teal-100' },
        { name: 'Vendors', desc: 'Suppliers directory', to: '/admin/vendors', icon: Users, color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
        { name: 'Balance Sheet', desc: 'Executive P&L overview', to: '/admin/balance-sheet', icon: BarChart3, color: 'text-[#D32F2F]', bgColor: 'bg-red-50 border-red-100' },
        { name: 'Reports', desc: 'Sales & technician analytics', to: '/admin/reports', icon: BarChart3, color: 'text-red-600', bgColor: 'bg-red-50 border-red-100' },
      ]
    },
    {
      category: 'Staff & HR',
      items: [
        { name: 'Staff Roster', desc: 'Technicians & employees', to: '/admin/staff', icon: Users, color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
        { name: 'Salary Slips', desc: 'Monthly payroll processing', to: '/admin/salary', icon: Wallet, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100' },
        { name: 'Tasks & Leaves', desc: 'HR tasks, leaves & rankings', to: '/admin/staff-hr', icon: CheckSquare, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100' },
      ]
    },
    {
      category: 'Communication',
      items: [
        { name: 'AI Bot Monitoring', desc: 'Live chat queries & knowledge tuning', to: '/admin/chatbot', icon: Bot, color: 'text-red-600', bgColor: 'bg-red-50 border-red-100', badge: 'Live' },
        { name: 'Messages & SMS', desc: 'Campaigns & bulk alerts', to: '/admin/messages', icon: MessageSquare, color: 'text-[#D32F2F]', bgColor: 'bg-red-50 border-red-100' },
        { name: 'WhatsApp Inbox & Bot', desc: 'Auto-replies, reminders & inbox', to: '/admin/whatsapp', icon: MessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100' },
        { name: 'Festival Offers', desc: 'Festive WhatsApp offers, scheduled', to: '/admin/festival-offers', icon: Sparkles, color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-100' },
        { name: 'Birthday & Anniversary', desc: 'Automatic wishes & personal offers', to: '/admin/greetings', icon: Gift, color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-100' },
        { name: 'Customer Inquiries', desc: 'Lead pipeline & followups', to: '/admin/inquiries', icon: HelpCircle, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100', badge: stats?.newLeads || undefined },
        { name: 'Feedback & Reviews', desc: '5-star reviews & ratings', to: '/admin/feedback', icon: Star, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-100' },
      ]
    },
    {
      category: 'System & Security',
      items: [
        { name: 'Roles & RBAC', desc: 'Permissions & access control', to: '/admin/roles', icon: Shield, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-100' },
        { name: 'Audit Logs', desc: 'System security change log', to: '/admin/audit-logs', icon: Shield, color: 'text-[#D32F2F]', bgColor: 'bg-red-50 border-red-100' },
        { name: 'Data Import', desc: 'CSV/Excel bulk uploader', to: '/admin/import', icon: Upload, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100' },
        { name: 'Recycle Bin', desc: 'Restore archived records', to: '/admin/archive', icon: Trash2, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-100' },
        { name: 'Studio Settings', desc: 'Company profile & defaults', to: '/admin/settings', icon: Settings, color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
      ]
    }
  ], [stats]);

  // Filter apps by search term
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();

    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(
          item => 
            item.name.toLowerCase().includes(query) || 
            item.desc.toLowerCase().includes(query) ||
            cat.category.toLowerCase().includes(query)
        )
      }))
      .filter(cat => cat.items.length > 0);
  }, [categories, searchQuery]);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <BottomSheet open={isOpen} onClose={onClose} title="All apps" maxHeight="92dvh">
      <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 bg-white">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages and tools"
            className="app-input pl-10 bg-slate-50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center" aria-label="Clear">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {filteredCategories.length > 0 ? (
        <div className="space-y-6 pb-4">
          {filteredCategories.map((group) => (
            <section key={group.category}>
              <h3 className="font-display text-[15px] font-extrabold text-slate-900 mb-3">{group.category}</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-x-2 gap-y-4">
                {group.items.map((item) => (
                  <button key={item.to} onClick={() => handleNavigate(item.to)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                    <span className={`relative h-[52px] w-[52px] rounded-2xl border ${item.bgColor} flex items-center justify-center`}>
                      <item.icon size={22} className={item.color} />
                      {item.badge && (
                        <span className="absolute -top-1.5 -right-1.5 max-w-[56px] truncate px-1.5 h-[18px] leading-[18px] rounded-full bg-[#D32F2F] text-white text-[9.5px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    <span className="text-[11.5px] font-display font-bold text-slate-700 text-center leading-tight line-clamp-2">{item.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400">
          <Search size={30} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No page matches "{searchQuery}"</p>
        </div>
      )}
    </BottomSheet>
  );
}
