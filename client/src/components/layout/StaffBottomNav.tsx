import { NavLink } from 'react-router-dom';
import { LucideIcon, ClipboardList, Package, Truck, HelpCircle, Award } from 'lucide-react';

interface TabItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const TABS: TabItem[] = [
  { to: '/staff/job-carts', icon: ClipboardList, label: 'Jobs' },
  { to: '/staff/inventory', icon: Package, label: 'Stock' },
  { to: '/staff/delivery', icon: Truck, label: 'Delivery' },
  { to: '/staff/inquiry', icon: HelpCircle, label: 'Inquiries' },
  { to: '/staff/benefits', icon: Award, label: 'Benefits' },
];

/** Same white tab bar as the customer app. */
export default function StaffBottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200/80 pb-safe select-none">
      <div className="mx-auto max-w-md grid grid-cols-5 h-16">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className="flex flex-col items-center justify-center gap-0.5 touch-manipulation">
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
  );
}
