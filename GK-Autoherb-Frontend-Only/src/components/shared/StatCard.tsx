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
    <div className={`bg-white p-6 rounded-lg border-b-2 border-transparent hover:border-[#D32F2F] transition-all duration-300 shadow-sm hover:shadow-card-hover hover:-translate-y-1 group ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] group-hover:text-[#D32F2F] transition-colors">
          {label}
        </span>
        <span className="bg-gradient-to-br from-[#D32F2F]/10 to-[#D32F2F]/5 p-2.5 rounded-lg group-hover:shadow-glow-red transition-shadow duration-300">
          <Icon size={20} className="text-[#D32F2F]" />
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black tracking-tighter text-[#1c1b1b]">{value}</span>
      </div>
      {trend && (
        <div className={`mt-4 flex items-center text-[10px] font-bold uppercase ${
          trend.positive ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
