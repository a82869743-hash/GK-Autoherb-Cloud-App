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
    <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-3">
      {/* Search */}
      <div className="relative flex-1 md:min-w-[220px]">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="app-input pl-10 bg-slate-50 focus:bg-white"
        />
      </div>

      {/* Status as chips (customer-app style), sort as a compact select */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {statusOptions && onStatusChange &&
          (statusOptions.length <= 7 ? (
            statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStatusChange(opt.value)}
                className={`app-chip shrink-0 ${statusValue === opt.value ? 'app-chip-on' : 'app-chip-off'}`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <select value={statusValue} onChange={(e) => onStatusChange(e.target.value)} className="app-chip app-chip-off shrink-0 pr-8 cursor-pointer outline-none">
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}

        {sortOptions && onSortChange && (
          <select value={sortValue} onChange={(e) => onSortChange(e.target.value)} className="app-chip app-chip-off shrink-0 pr-8 cursor-pointer outline-none" aria-label="Sort">
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {children}
      </div>
    </div>
  );
}
