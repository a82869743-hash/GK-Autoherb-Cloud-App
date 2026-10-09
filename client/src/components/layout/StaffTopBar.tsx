import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useMyAttendance } from '../../api/hooks/useStaff';
import { 
  Clock, 
  LogOut, 
  Sparkles, 
  Award, 
  ChevronDown, 
  PlusCircle, 
  UserCircle 
} from 'lucide-react';

export default function StaffTopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time attendance status
  const { data: attRes } = useMyAttendance();
  const attendanceRecords = attRes?.data || [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = attendanceRecords.find((r: any) => r?.att_date?.startsWith(todayStr));

  const isClockedIn = Boolean(todayRecord?.check_in && !todayRecord?.check_out);
  const isShiftComplete = Boolean(todayRecord?.check_out);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const staffName = user?.name || 'Staff Member';
  const firstName = staffName.split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-40 bg-[#111111]/95 text-white backdrop-blur-xl border-b border-white/10 shadow-sm">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 h-full flex items-center justify-between">
        
        {/* Brand / Logo */}
        <Link to="/staff/job-carts" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#af101a] via-[#D32F2F] to-[#ff4d4d] p-[1px] shadow-sm flex items-center justify-center">
            <div className="w-full h-full bg-[#111111] rounded-[10px] flex items-center justify-center">
              <span className="text-white font-black text-xs tracking-tight">GK</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-sm font-bold text-white tracking-tight">AutoHerb</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] animate-pulse" />
            </div>
            <p className="text-[9px] text-zinc-400 font-medium tracking-wider uppercase mt-0.5">
              Staff Studio
            </p>
          </div>
        </Link>

        {/* Right Controls: Attendance Chip + Quick Wash + User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Attendance Check-in Status Chip */}
          <Link
            to="/staff/check-in"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all ${
              isClockedIn
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                : isShiftComplete
                ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
            }`}
            title="Attendance & Shifts"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isClockedIn
                  ? 'bg-emerald-400 animate-pulse'
                  : isShiftComplete
                  ? 'bg-zinc-400'
                  : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="text-[11px] whitespace-nowrap">
              {isClockedIn ? 'Clocked In' : isShiftComplete ? 'Shift Done' : 'Clock In'}
            </span>
          </Link>

          {/* Quick Wash / Quick Add Shortcut */}
          <Link
            to="/staff/quick-wash"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all"
            title="Quick Wash Express Queue"
          >
            <Sparkles size={12} className="text-[#D32F2F]" />
            <span className="text-[11px]">Quick Wash</span>
          </Link>

          {/* Profile / Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
              aria-label="Staff Menu"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
                {initial}
              </div>
              <span className="text-xs font-medium text-zinc-200 hidden md:inline max-w-[80px] truncate">
                {firstName}
              </span>
              <ChevronDown size={12} className={`text-zinc-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 top-11 w-56 bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-scale-in text-white text-xs">
                {/* Header */}
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="font-bold text-white text-sm truncate">{staffName}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Floor Staff • GK AutoHerb</p>
                </div>

                {/* Navigation items */}
                <div className="py-1 space-y-0.5">
                  <Link
                    to="/staff/job-carts/new"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <PlusCircle size={15} className="text-[#D32F2F]" />
                    <span>Create Job Cart</span>
                  </Link>

                  <Link
                    to="/staff/quick-wash"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-colors sm:hidden"
                  >
                    <Sparkles size={15} className="text-[#D32F2F]" />
                    <span>Quick Wash Queue</span>
                  </Link>

                  <Link
                    to="/staff/check-in"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Clock size={15} className="text-emerald-400" />
                    <span>Attendance & Shifts</span>
                  </Link>

                  <Link
                    to="/staff/benefits"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Award size={15} className="text-amber-400" />
                    <span>My Benefits & Bonus</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="pt-1 border-t border-white/10 mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-medium text-left"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
