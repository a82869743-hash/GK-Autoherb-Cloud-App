import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, Wrench, Calendar, CalendarPlus, 
  MoreHorizontal, Plus, Droplets, Receipt, X, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminMobileDockProps {
  onOpenLauncher: () => void;
  isLauncherOpen: boolean;
}

export default function AdminMobileDock({ onOpenLauncher, isLauncherOpen }: AdminMobileDockProps) {
  const [quickFabOpen, setQuickFabOpen] = useState(false);
  const navigate = useNavigate();

  const handleFabAction = (path: string) => {
    setQuickFabOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* ── Quick FAB Action Popover Menu ─────────────────── */}
      <AnimatePresence>
        {quickFabOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[85] lg:hidden flex items-end justify-center pb-24 px-4"
            onClick={() => setQuickFabOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-5 shadow-2xl space-y-3 text-slate-900"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#D32F2F]" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">Quick Studio Booking & Jobs</span>
                </div>
                <button 
                  onClick={() => setQuickFabOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  onClick={() => handleFabAction('/admin/slots')}
                  className="p-3 bg-red-50 hover:bg-red-100/70 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D32F2F] text-white flex items-center justify-center shadow-md shadow-red-500/30 group-hover:scale-105 transition-transform">
                    <CalendarPlus size={20} />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 leading-tight">Book Bay</span>
                </button>

                <button
                  onClick={() => handleFabAction('/admin/job-carts/new')}
                  className="p-3 bg-red-50 hover:bg-red-100/70 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D32F2F] text-white flex items-center justify-center shadow-md shadow-red-500/30 group-hover:scale-105 transition-transform">
                    <Plus size={20} />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 leading-tight">Job Card</span>
                </button>

                <button
                  onClick={() => handleFabAction('/admin/quick-wash')}
                  className="p-3 bg-red-50 hover:bg-red-100/70 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D32F2F] text-white flex items-center justify-center shadow-md shadow-red-500/30 group-hover:scale-105 transition-transform">
                    <Droplets size={20} />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 leading-tight">Quick Wash</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Floating Capsule Bottom Nav (Matches Provided Screenshot) ── */}
      <nav className="fixed bottom-4 inset-x-0 mx-auto w-fit z-[80] safe-bottom-dock px-3">
        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.14)] rounded-full px-5 py-2 flex items-center justify-between gap-3 sm:gap-7 relative">
          
          {/* Tab 1: Home (Red with indicator pill when active) */}
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] transition-all duration-200 ${
                isActive ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutGrid size={22} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-black' : 'font-medium'}`}>
                  Home
                </span>
                {isActive && (
                  <div className="w-4 h-1 bg-[#D32F2F] rounded-full mt-0.5" />
                )}
              </>
            )}
          </NavLink>

          {/* Tab 2: Services */}
          <NavLink
            to="/admin/services"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] transition-all duration-200 ${
                isActive ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Wrench size={22} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-black' : 'font-medium'}`}>
                  Services
                </span>
                {isActive && (
                  <div className="w-4 h-1 bg-[#D32F2F] rounded-full mt-0.5" />
                )}
              </>
            )}
          </NavLink>

          {/* Center Elevated Action: BOOK (Popping out circle with red gradient + glow) */}
          <div className="relative -top-5 flex flex-col items-center px-1">
            <button
              onClick={() => setQuickFabOpen(!quickFabOpen)}
              className="w-14 h-14 rounded-full bg-gradient-to-b from-[#E53935] to-[#B71C1C] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(211,47,47,0.45)] border-2 border-white active:scale-95 transition-all duration-300 group"
              aria-label="Book Slot or Job Card"
            >
              <CalendarPlus 
                size={23} 
                className={`transition-transform duration-300 ${quickFabOpen ? 'rotate-45' : 'group-hover:scale-110'}`} 
              />
            </button>
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider mt-1 select-none">
              BOOK
            </span>
          </div>

          {/* Tab 4: Bookings */}
          <NavLink
            to="/admin/customer-bookings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] transition-all duration-200 ${
                isActive ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Calendar size={22} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-black' : 'font-medium'}`}>
                  Bookings
                </span>
                {isActive && (
                  <div className="w-4 h-1 bg-[#D32F2F] rounded-full mt-0.5" />
                )}
              </>
            )}
          </NavLink>

          {/* Tab 5: Menu */}
          <button
            onClick={onOpenLauncher}
            className={`flex flex-col items-center justify-center min-w-[56px] transition-all duration-200 ${
              isLauncherOpen ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MoreHorizontal size={24} strokeWidth={isLauncherOpen ? 2.5 : 2} />
            <span className={`text-[11px] mt-0.5 tracking-tight ${isLauncherOpen ? 'font-black' : 'font-medium'}`}>
              Menu
            </span>
            {isLauncherOpen && (
              <div className="w-4 h-1 bg-[#D32F2F] rounded-full mt-0.5" />
            )}
          </button>

        </div>
      </nav>
    </>
  );
}
