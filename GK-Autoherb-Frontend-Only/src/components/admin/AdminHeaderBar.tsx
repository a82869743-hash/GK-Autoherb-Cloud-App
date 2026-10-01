import React, { useState } from 'react';
import { CalendarCheck, ChevronDown, Bell, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminHeaderBarProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  showDatePicker?: boolean;
  dateRangeText?: string;
  onDateRangeChange?: (range: string) => void;
  showQuickActions?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AdminHeaderBar({
  title,
  subtitle,
  badge,
  showDatePicker = false,
  dateRangeText = 'May 20 – May 27, 2026',
  onDateRangeChange,
  showQuickActions = true,
  actions,
  children,
}: AdminHeaderBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRange, setSelectedRange] = useState(dateRangeText);

  const ranges = ['Today', 'Yesterday', 'May 20 – May 27, 2026', 'This Month', 'Last 30 Days'];

  const handleSelect = (r: string) => {
    setSelectedRange(r);
    setShowDropdown(false);
    if (onDateRangeChange) onDateRangeChange(r);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-6 py-4 rounded-3xl border border-slate-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
        {showDatePicker && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 transition-all shadow-xs"
            >
              <CalendarCheck size={14} className="text-[#D32F2F]" />
              <span>{selectedRange}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                {ranges.map(d => (
                  <button
                    key={d}
                    onClick={() => handleSelect(d)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showQuickActions && (
          <div className="flex items-center gap-2">
            <Link
              to="/admin/customer-bookings"
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 relative transition-all shadow-xs"
              title="Customer Bookings"
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </Link>

            <Link
              to="/admin/settings"
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 transition-all shadow-xs"
              title="Studio Settings"
            >
              <Settings size={16} />
            </Link>
          </div>
        )}

        {actions}
        {children}
      </div>
    </div>
  );
}
