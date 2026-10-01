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
      <div className="relative flex-1">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusOptions && onStatusChange && (
          <select
            value={statusValue}
            onChange={e => onStatusChange(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 outline-none hover:bg-slate-100 transition-all cursor-pointer"
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
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 outline-none hover:bg-slate-100 transition-all cursor-pointer"
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
