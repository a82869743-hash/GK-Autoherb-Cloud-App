import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface AdminMetricCardProps {
  label?: string;
  title?: string;
  subtitle?: string;
  value: string | number;
  icon: React.ReactNode | React.ElementType;
  trend?: string | { text: string; positive?: boolean };
  trendDirection?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  variant?: 'red' | 'indigo' | 'blue' | 'purple' | 'rose' | 'amber' | 'emerald' | 'sky';
  accentColor?: string;
  className?: string;
}

export default function AdminMetricCard({
  label,
  title,
  subtitle,
  value,
  icon,
  trend,
  trendDirection = 'up',
  trendLabel,
  variant = 'red',
  accentColor,
  className = '',
}: AdminMetricCardProps) {
  const chosenVariant = (accentColor || variant) as string;

  const variantStyles: Record<string, string> = {
    red: 'bg-red-50 text-[#D32F2F]',
    indigo: 'bg-red-50 text-[#D32F2F]',
    blue: 'bg-red-50 text-[#D32F2F]',
    sky: 'bg-sky-50 text-sky-600',
    purple: 'bg-[#F5F3FF] text-[#7C3AED]',
    rose: 'bg-[#FFF1F2] text-[#E11D48]',
    amber: 'bg-[#FFFBEB] text-[#D97706]',
    emerald: 'bg-[#ECFDF5] text-[#059669]',
  };

  const styleClass = variantStyles[chosenVariant] || variantStyles.red;

  // Normalize trend
  const trendText = typeof trend === 'object' && trend !== null ? trend.text : trend;
  const isPositive = typeof trend === 'object' && trend !== null ? (trend.positive ?? true) : trendDirection === 'up';

  const displayTitle = title || label || '';

  // Render Icon helper
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && ('render' in icon || 'displayName' in icon))) {
      const IconComponent = icon as React.ElementType;
      return <IconComponent size={20} />;
    }
    return icon as React.ReactNode;
  };

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow group ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{displayTitle}</p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {value}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-2xl ${styleClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
          {renderIcon()}
        </div>
      </div>

      {(trendText || trendLabel) && (
        <div className="flex items-center gap-1.5 text-xs font-bold pt-1">
          {trendText && (
            <span className={`inline-flex items-center gap-1 ${
              isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {trendText}
            </span>
          )}
          {trendLabel && (
            <span className="text-slate-400 font-normal">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
