import React from 'react';
import { Search } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface AdminFilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: FilterOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: FilterOption[];
  children?: React.ReactNode;
}

export default function AdminFilterBar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  statusOptions,
  sortValue,
  onSortChange,
  sortOptions,
  children,
}: AdminFilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-red-500/20 focus:border-[#D32F2F] text-slate-800 placeholder-slate-400 transition-all"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusOptions && onStatusChange && (
          <select
            value={statusValue}
            onChange={e => onStatusChange(e.target.value)}
            className="h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none hover:bg-slate-100 transition-all cursor-pointer"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {sortOptions && onSortChange && (
          <select
            value={sortValue}
            onChange={e => onSortChange(e.target.value)}
            className="h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none hover:bg-slate-100 transition-all cursor-pointer"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {children}
      </div>
    </div>
  );
}
