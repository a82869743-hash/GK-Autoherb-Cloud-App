import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 hover:border-[#D32F2F]/40 transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 group ${className}`}>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-xs font-medium text-[#5f5e5e] group-hover:text-[#D32F2F] transition-colors truncate">
          {label}
        </span>
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D32F2F]/10 to-[#D32F2F]/5 flex items-center justify-center shrink-0">
          <Icon size={17} strokeWidth={1.75} className="text-[#D32F2F]" />
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl sm:text-[22px] font-semibold tracking-tight text-[#1c1b1b]">{value}</span>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center text-[11px] font-medium ${
          trend.positive ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
