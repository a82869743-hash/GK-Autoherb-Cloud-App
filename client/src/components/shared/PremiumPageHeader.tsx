import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

interface PremiumPageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  accentGradient?: string;
  actions?: React.ReactNode;
  badge?: string;
}

export default function PremiumPageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = '#D32F2F',
  accentGradient = 'from-[#af101a] to-[#D32F2F]',
  actions,
  badge,
}: PremiumPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mb-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Animated icon container */}
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-sm shrink-0`}
          >
            <Icon size={18} className="text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-[22px] font-semibold text-[#1c1b1b] tracking-tight">
                {title}
              </h1>
              {badge && (
                <span className="text-[10px] font-medium bg-[#D32F2F] text-white px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-[13px] text-[#5f5e5e] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            {actions}
          </div>
        )}
      </div>

      {/* Underline accent */}
      <div
        className="mt-3.5 h-px"
        style={{ background: `linear-gradient(90deg, ${iconColor}40, transparent)` }}
      />
    </motion.div>
  );
}
