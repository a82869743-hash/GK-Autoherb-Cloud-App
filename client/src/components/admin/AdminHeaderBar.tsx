import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AdminHeaderBarProps {
  title: string;
  subtitle?: string;
  category?: string;
  badge?: React.ReactNode;
  /** Kept for compatibility — the app header already has alerts & settings. */
  showDatePicker?: boolean;
  dateRangeText?: string;
  onDateRangeChange?: (range: string) => void;
  showQuickActions?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/** Page title in the customer-app style: back arrow, big title, actions in a scrollable row. */
export default function AdminHeaderBar({ title, subtitle, category, badge, actions, children }: AdminHeaderBarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isRoot = pathname === '/admin' || pathname === '/admin/';
  const hasActions = Boolean(actions || children);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        {!isRoot && (
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/admin'))}
            className="mt-0.5 -ml-1 h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-slate-900 active:bg-slate-200 lg:hidden"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {category && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D32F2F]">{category}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-[24px] font-extrabold text-slate-900 leading-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-[13px] text-slate-500 mt-0.5 line-clamp-2">{subtitle}</p>}
        </div>
      </div>

      {hasActions && (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
