import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, LayoutDashboard, ClipboardList, Droplets, Calendar, CalendarCheck, MapPin, Truck,
  Users, PlusCircle, Layers, Package, Star, Gift, Wrench, Sparkles, ShoppingCart, ShoppingBag,
  DollarSign, CreditCard, FileText, Archive, BarChart3, Wallet, CheckSquare, MessageSquare,
  HelpCircle, Shield, Upload, Trash2, Settings, ExternalLink, ChevronRight, Bell
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
        { name: 'Package Tracking', desc: 'Active subscription quotas', to: '/admin/package-tracking', icon: Layers, color: 'text-cyan-600', bgColor: 'bg-cyan-50 border-cyan-100' },
        { name: 'Loyalty Points', desc: 'Points ratio & customer lookup', to: '/admin/loyalty', icon: Star, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-100' },
        { name: 'Customer Rewards', desc: 'Welcome wash & gift perks', to: '/admin/customer-rewards', icon: Gift, color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-100' },
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
        { name: 'Messages & SMS', desc: 'Campaigns & bulk alerts', to: '/admin/messages', icon: MessageSquare, color: 'text-[#D32F2F]', bgColor: 'bg-red-50 border-red-100' },
        { name: 'WhatsApp Gateway', desc: 'Direct WhatsApp messenger', to: '/admin/whatsapp', icon: MessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100' },
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
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-end justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-2xl bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-slate-200"
        >
          {/* Top Grab Handle */}
          <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header & Search */}
          <div className="px-6 py-3 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>GK AutoHerb Hub</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    Terminal
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">All 45 modules, services and studio tools</p>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Live Search Field */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any page, bill, inventory, customer..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#D32F2F] rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/20 transition-all text-slate-900 placeholder:text-slate-400"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Categories List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 dark-scroll pb-24 sm:pb-8">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((group) => (
                <div key={group.category} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {group.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {group.items.length} tools
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {group.items.map((item) => (
                      <button
                        key={item.to}
                        onClick={() => handleNavigate(item.to)}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl flex items-start gap-3 transition-all hover:border-slate-300 text-left active:scale-[0.98] group relative shadow-2xs hover:shadow-sm"
                      >
                        <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                          <item.icon size={20} className={item.color} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 truncate group-hover:text-[#D32F2F] transition-colors">
                              {item.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                            {item.desc}
                          </p>
                        </div>

                        {item.badge && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#D32F2F] text-white text-[8px] font-black rounded-full uppercase tracking-tight shadow-2xs">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Search size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">No apps found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
