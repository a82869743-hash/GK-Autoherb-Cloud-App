/**
 * Small building blocks for the customer mobile app (Hoora-style, GK red/black).
 */
import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxHeight = '88dvh',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-sheet animate-sheet-up sm:animate-scale-in flex flex-col"
        style={{ maxHeight }}
      >
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
        {title !== undefined && (
          <div className="flex items-center justify-between px-5 pt-3 pb-3">
            <h3 className="font-display text-lg font-extrabold text-slate-900">{title}</h3>
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-5 flex-1">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3 pb-safe bg-white rounded-b-3xl">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/** White sticky header for inner pages: back arrow, title, optional right slot (e.g. vehicle chip). */
export function AppPageHeader({ title, subtitle, right, back = true, onBack }: { title: string; subtitle?: string; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 pt-safe bg-[#f3f4f6]/95 backdrop-blur-md">
      <div className="h-14 flex items-center gap-2">
        {back && (
          <button
            onClick={() => (onBack ? onBack() : window.history.length > 1 ? navigate(-1) : navigate('/customer'))}
            className="h-10 w-10 -ml-2 rounded-full flex items-center justify-center text-slate-900 active:bg-slate-200"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[19px] font-bold text-slate-900 truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-3 mt-1">
      <h2 className="font-display text-[17px] font-extrabold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; badge?: ReactNode }[];
}) {
  return (
    <div className="bg-white rounded-2xl p-1.5 flex gap-1 shadow-app">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-10 rounded-xl text-sm font-bold font-display transition-colors flex items-center justify-center gap-1.5 ${
            value === o.value ? 'bg-[#111] text-white' : 'text-slate-600'
          }`}
        >
          {o.label}
          {o.badge}
        </button>
      ))}
    </div>
  );
}

export function EmptyBlock({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="app-card px-6 py-10 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center mb-3">{icon}</div>
      <p className="font-display font-bold text-slate-900">{title}</p>
      {text && <p className="text-sm text-slate-500 mt-1">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    pending_approval: 'bg-amber-50 text-amber-700',
    pending_payment: 'bg-orange-50 text-orange-700',
    completed: 'bg-sky-50 text-sky-700',
    cancelled: 'bg-slate-100 text-slate-500',
    expired: 'bg-slate-100 text-slate-500',
    rejected: 'bg-red-50 text-red-600',
    in_progress: 'bg-sky-50 text-sky-700',
    washing: 'bg-sky-50 text-sky-700',
    repairing: 'bg-sky-50 text-sky-700',
    open: 'bg-amber-50 text-amber-700',
    draft: 'bg-amber-50 text-amber-700',
    pending: 'bg-amber-50 text-amber-700',
    complete: 'bg-emerald-50 text-emerald-700',
    delivered: 'bg-emerald-50 text-emerald-700',
    paid: 'bg-emerald-50 text-emerald-700',
    active: 'bg-emerald-50 text-emerald-700',
    approved: 'bg-emerald-50 text-emerald-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-600',
    unpaid: 'bg-red-50 text-red-600',
  };
  const label: Record<string, string> = {
    confirmed: 'Confirmed',
    pending_approval: 'Awaiting confirmation',
    pending_payment: 'Payment pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    rejected: 'Not accepted',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {label[status] || status.replace(/_/g, ' ')}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}
