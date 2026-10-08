import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { type LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PremiumStatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: string;
  gradient?: string;
  delay?: number;
  decimals?: number;
}

export default function PremiumStatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  trend,
  trendLabel,
  color = '#D32F2F',
  gradient = 'from-[#af101a]/10 to-[#D32F2F]/5',
  delay = 0,
  decimals = 0,
}: PremiumStatCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: `0 8px 24px ${color}12, 0 2px 8px rgba(0,0,0,0.04)` }}
      className="relative bg-white rounded-xl border border-gray-100 p-3.5 sm:p-4 overflow-hidden group cursor-default"
    >
      {/* Background gradient accent */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}12` }}
          >
            <Icon size={17} strokeWidth={1.75} style={{ color }} />
          </div>

          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
              isPositive ? 'text-emerald-600 bg-emerald-50' :
              isNegative ? 'text-red-600 bg-red-50' :
              'text-gray-500 bg-gray-100'
            }`}>
              {isPositive ? <TrendingUp size={11} /> : isNegative ? <TrendingDown size={11} /> : <Minus size={11} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <p className="text-xs font-medium text-[#5f5e5e] mb-0.5 truncate">{title}</p>

        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-[22px] font-semibold text-[#1c1b1b] tracking-tight">
            {prefix}
            <CountUp end={value} duration={1.2} delay={delay} separator="," decimals={decimals} />
            {suffix}
          </span>
        </div>

        {trendLabel && (
          <p className="text-[11px] text-[#8f6f6c] mt-0.5">{trendLabel}</p>
        )}
      </div>

      {/* Hover glow effect */}
      <div
        className="absolute -bottom-2 -right-2 w-20 h-20 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
}
