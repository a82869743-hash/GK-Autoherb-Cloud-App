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
  const isNumericTrend = Boolean(trendText && /\d/.test(trendText) && /%/.test(trendText));

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
    <div className={`metric-card app-card p-3.5 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-500 leading-tight">{displayTitle}</p>
        <div className={`w-8 h-8 rounded-xl ${styleClass} flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4`}>
          {renderIcon()}
        </div>
      </div>
      <div className="mt-1">
        <h3 className="font-display text-[22px] font-extrabold text-slate-900 leading-tight truncate">{value}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 font-medium truncate">{subtitle}</p>}
      </div>

      {(trendText || trendLabel) && (
        <div className="flex items-center gap-1 text-[11px] font-semibold mt-1.5 min-w-0">
          {trendText && (
            isNumericTrend ? (
              <span className={`inline-flex items-center gap-1 truncate ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? <TrendingUp size={12} className="shrink-0" /> : <TrendingDown size={12} className="shrink-0" />}
                <span className="truncate">{trendText}</span>
              </span>
            ) : (
              <span className="truncate font-medium text-slate-400">{trendText}</span>
            )
          )}
          {trendLabel && <span className="text-slate-400 font-normal truncate">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
