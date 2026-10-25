import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, CalendarCheck, ClipboardList, LayoutGrid, Plus, CalendarPlus, Droplets, Receipt, UserPlus, FileText, Truck } from 'lucide-react';
import { BottomSheet } from '../customer/ui';
import { ActionTile } from '../ops/ui';

interface AdminMobileDockProps {
  onOpenLauncher: () => void;
  isLauncherOpen: boolean;
}

const TABS = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
  { to: '/admin/customer-bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/job-carts', label: 'Jobs', icon: ClipboardList },
];

const QUICK = [
  { label: 'Book slot', icon: CalendarPlus, to: '/admin/slots', tone: 'red' },
  { label: 'Job card', icon: ClipboardList, to: '/admin/job-carts/new', tone: 'red' },
  { label: 'Quick wash', icon: Droplets, to: '/admin/quick-wash', tone: 'blue' },
  { label: 'Quick bill', icon: Receipt, to: '/admin/billing', tone: 'green' },
  { label: 'Add customer', icon: UserPlus, to: '/admin/add-customer', tone: 'purple' },
  { label: 'Quotation', icon: FileText, to: '/admin/quotations/new', tone: 'amber' },
  { label: 'Deliveries', icon: Truck, to: '/admin/deliveries', tone: 'slate' },
];

/** White bottom tab bar, same as the customer app, with a centre "+" for quick actions. */
export default function AdminMobileDock({ onOpenLauncher, isLauncherOpen }: AdminMobileDockProps) {
  const [quickOpen, setQuickOpen] = useState(false);
  const navigate = useNavigate();

  const tab = (t: (typeof TABS)[number]) => (
    <NavLink key={t.to} to={t.to} end={t.end} className="flex flex-col items-center justify-center gap-0.5 touch-manipulation">
      {({ isActive }) => (
        <>
          <span className={`h-8 w-12 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-red-50 text-[#D32F2F]' : 'text-slate-400'}`}>
            <t.icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
          </span>
          <span className={`text-[11px] font-display ${isActive ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-400'}`}>{t.label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-[80] bg-white border-t border-slate-200/80 pb-safe select-none">
        <div className="mx-auto max-w-xl grid grid-cols-5 h-16">
          {tab(TABS[0])}
          {tab(TABS[1])}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setQuickOpen(true)}
              className="-mt-6 h-14 w-14 rounded-full bg-gradient-to-b from-[#e53935] to-[#b71c1c] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(211,47,47,0.4)] ring-4 ring-[#f3f4f6] active:scale-95 transition-transform"
              aria-label="Quick actions"
            >
              <Plus size={26} strokeWidth={2.6} />
            </button>
          </div>
          {tab(TABS[2])}
          <button onClick={onOpenLauncher} className="flex flex-col items-center justify-center gap-0.5">
            <span className={`h-8 w-12 rounded-full flex items-center justify-center transition-colors ${isLauncherOpen ? 'bg-red-50 text-[#D32F2F]' : 'text-slate-400'}`}>
              <LayoutGrid size={21} strokeWidth={isLauncherOpen ? 2.4 : 1.9} />
            </span>
            <span className={`text-[11px] font-display ${isLauncherOpen ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-400'}`}>All apps</span>
          </button>
        </div>
      </nav>

      <BottomSheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Quick actions">
        <div className="grid grid-cols-4 gap-y-5 gap-x-2 pt-1 pb-2">
          {QUICK.map((q) => (
            <ActionTile
              key={q.to}
              label={q.label}
              icon={q.icon}
              tone={q.tone}
              onClick={() => {
                setQuickOpen(false);
                navigate(q.to);
              }}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
