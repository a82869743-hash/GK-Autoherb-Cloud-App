import { NavLink } from 'react-router-dom';
import { 
  LucideIcon,
  ClipboardList, 
  Package, 
  Truck, 
  HelpCircle, 
  Award 
} from 'lucide-react';

interface TabItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const TABS: TabItem[] = [
  { to: '/staff/job-carts', icon: ClipboardList, label: 'Jobs' },
  { to: '/staff/inventory', icon: Package, label: 'Inventory' },
  { to: '/staff/delivery', icon: Truck, label: 'Delivery' },
  { to: '/staff/inquiry', icon: HelpCircle, label: 'Inquiries' },
  { to: '/staff/benefits', icon: Award, label: 'Benefits' },
];

export default function StaffBottomNav() {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111]/95 text-white backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.25)] select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-4xl mx-auto px-1 sm:px-4 h-14 flex items-center justify-around">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 max-w-[80px] h-full flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 touch-manipulation relative ${
                isActive
                  ? 'text-[#D32F2F] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative flex items-center justify-center">
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.4 : 1.7} 
                    className={`transition-all duration-200 ${
                      isActive ? 'text-[#D32F2F] drop-shadow-[0_0_8px_rgba(211,47,47,0.5)]' : ''
                    }`} 
                  />
                </div>
                <span className={`text-[10px] sm:text-[11px] tracking-tight leading-none ${
                  isActive ? 'text-white font-semibold' : 'text-zinc-400 font-normal'
                }`}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-4 h-0.5 bg-[#D32F2F] rounded-full shadow-[0_0_6px_rgba(211,47,47,0.8)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
