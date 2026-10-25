import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useMyAttendance } from '../../api/hooks/useStaff';
import { Clock, LogOut, Sparkles, Award, PlusCircle, ChevronRight } from 'lucide-react';
import { BottomSheet } from '../customer/ui';

/** Light app header (customer-app style): brand, attendance chip, profile sheet. */
export default function StaffTopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: attRes } = useMyAttendance();
  const attendanceRecords = attRes?.data || [];
  const todayKey = new Date().toDateString();
  const todayRecord = attendanceRecords.find((r: any) => r?.att_date && new Date(r.att_date).toDateString() === todayKey);
  const isClockedIn = Boolean(todayRecord?.check_in_time && !todayRecord?.check_out_time);
  const isShiftComplete = Boolean(todayRecord?.check_out_time);

  const staffName = user?.name || 'Staff Member';
  const firstName = staffName.split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();

  const go = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  const menu = [
    { to: '/staff/job-carts/new', label: 'Create job cart', icon: PlusCircle, tone: 'bg-red-50 text-[#D32F2F]' },
    { to: '/staff/quick-wash', label: 'Quick wash queue', icon: Sparkles, tone: 'bg-sky-50 text-sky-600' },
    { to: '/staff/check-in', label: 'Attendance & shifts', icon: Clock, tone: 'bg-emerald-50 text-emerald-600' },
    { to: '/staff/benefits', label: 'My benefits & bonus', icon: Award, tone: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-[#f3f4f6]/95 backdrop-blur-md pt-safe">
        <div className="mx-auto max-w-md px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/staff/job-carts" className="flex items-center gap-2.5 min-w-0">
            <span className="h-9 w-9 rounded-xl bg-[#111] text-white flex items-center justify-center font-display font-black text-xs">GK</span>
            <span className="min-w-0">
              <span className="block font-display text-[15px] font-extrabold text-slate-900 leading-tight truncate">Hi, {firstName}</span>
              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">GK AutoHerb · Staff</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/staff/check-in"
              className={`app-chip h-8 px-3 text-[12px] ${
                isClockedIn
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isShiftComplete
                  ? 'bg-white border-slate-200 text-slate-500'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : isShiftComplete ? 'bg-slate-400' : 'bg-amber-500'}`} />
              {isClockedIn ? 'On shift' : isShiftComplete ? 'Shift done' : 'Clock in'}
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-[#e53935] to-[#b71c1c] text-white font-display font-extrabold text-sm"
              aria-label="Staff menu"
            >
              {initial}
            </button>
          </div>
        </div>
      </header>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={staffName}>
        <p className="-mt-2 mb-4 text-xs text-slate-500">Floor staff · GK AutoHerb</p>
        <div className="space-y-2">
          {menu.map(({ to, label, icon: Icon, tone }) => (
            <button key={to} onClick={() => go(to)} className="w-full app-card flex items-center gap-3 p-3 text-left active:scale-[0.99]">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone}`}><Icon size={19} /></span>
              <span className="flex-1 font-display font-bold text-[14px] text-slate-900">{label}</span>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setMenuOpen(false);
            logout();
          }}
          className="mt-4 w-full app-btn-outline text-[#D32F2F]"
        >
          <LogOut size={17} /> Sign out
        </button>
      </BottomSheet>
    </>
  );
}
