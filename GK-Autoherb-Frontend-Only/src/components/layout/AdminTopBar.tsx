import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backUrl?: string;
  onBack?: () => void;
  badge?: string;
  category?: string;
}

export default function AdminTopBar({ 
  title, 
  subtitle, 
  actions, 
  backUrl, 
  onBack,
  badge,
  category
}: AdminTopBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  const showBackButton = Boolean(backUrl || onBack);

  return (
    <motion.header 
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-5 sm:mb-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        
        {/* Left: Back button + Title & Badges */}
        <div className="flex items-start sm:items-center gap-3">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="mt-0.5 sm:mt-0 w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all active:scale-95 shrink-0"
              aria-label="Go Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              {category && (
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D32F2F]">
                  {category}
                </span>
              )}
              {badge && (
                <span className="text-[9px] font-bold bg-[#D32F2F] text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  {badge}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>

            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions (Add buttons, filters, date pickers) */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-auto shrink-0 w-full sm:w-auto justify-start sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </motion.header>
  );
}
