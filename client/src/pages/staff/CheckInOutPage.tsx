import { Clock, LogIn, LogOut, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ErrorState from '../../components/shared/ErrorState';
import { useMyAttendance, useCheckIn, useCheckOut } from '../../api/hooks/useStaff';
import { formatTime } from '../../utils/formatters';
import { OpsPageTitle, StatTile, SectionTitle, Skeleton, EmptyBlock } from '../../components/ops/ui';

export default function CheckInOutPage() {
  const { data: attRes, isLoading, isError, refetch } = useMyAttendance();
  const checkInMut = useCheckIn();
  const checkOutMut = useCheckOut();

  const attendanceRecords = attRes?.data || [];
  // att_date arrives as a timestamp at IST midnight — compare calendar days, not ISO strings
  const todayKey = new Date().toDateString();
  const todayRecord = attendanceRecords.find((r: any) => r.att_date && new Date(r.att_date).toDateString() === todayKey);

  const handleCheckIn = async () => {
    try {
      await checkInMut.mutateAsync();
      toast.success('Clocked in successfully');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to clock in');
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to check out for today?')) return;
    try {
      await checkOutMut.mutateAsync();
      toast.success('Clocked out successfully');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to clock out');
    }
  };

  const onShift = todayRecord?.check_in_time && !todayRecord?.check_out_time;
  const done = Boolean(todayRecord?.check_out_time);
  const presentDays = attendanceRecords.filter((r: any) => r.status === 'present').length;
  const halfDays = attendanceRecords.filter((r: any) => r.status === 'half').length;

  return (
    <div className="space-y-5">
      <OpsPageTitle kicker="Attendance" title="My shift" subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} />

      {isError ? (
        <ErrorState message="Failed to load attendance records. Please check your connection and try again." onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          {/* Big clock card */}
          <div className="relative overflow-hidden rounded-3xl bg-[#111] text-white p-6 shadow-app">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#D32F2F]/30 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className={`h-12 w-12 rounded-2xl flex items-center justify-center ${onShift ? 'bg-emerald-500/20 text-emerald-400' : done ? 'bg-white/10 text-white/70' : 'bg-amber-500/20 text-amber-400'}`}>
                {done ? <CheckCircle2 size={24} /> : <Clock size={24} />}
              </span>
              <div>
                <p className="text-[12px] font-semibold text-white/60">Status</p>
                <p className="font-display text-[20px] font-extrabold">{onShift ? 'On shift' : done ? 'Shift completed' : 'Not clocked in'}</p>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[11px] font-semibold text-white/60 flex items-center gap-1"><LogIn size={12} /> Clock in</p>
                <p className="font-display text-[18px] font-extrabold mt-0.5">{todayRecord?.check_in_time ? formatTime(todayRecord.check_in_time) : '--:--'}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[11px] font-semibold text-white/60 flex items-center gap-1"><LogOut size={12} /> Clock out</p>
                <p className="font-display text-[18px] font-extrabold mt-0.5">{todayRecord?.check_out_time ? formatTime(todayRecord.check_out_time) : '--:--'}</p>
              </div>
            </div>

            <div className="relative mt-5">
              {!todayRecord?.check_in_time ? (
                <button onClick={handleCheckIn} disabled={checkInMut.isPending} className="app-btn h-13 py-3.5 w-full bg-emerald-500 text-white text-[15px]">
                  {checkInMut.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />} Clock in
                </button>
              ) : !todayRecord.check_out_time ? (
                <button onClick={handleCheckOut} disabled={checkOutMut.isPending} className="app-btn-primary w-full text-[15px]">
                  {checkOutMut.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />} Clock out
                </button>
              ) : (
                <div className="rounded-xl bg-white/10 py-3 text-center text-[13px] font-semibold text-white/70">Shift logged for today</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="Present days" value={presentDays} icon={CheckCircle2} tone="green" />
            <StatTile label="Half days" value={halfDays} icon={Clock} tone="amber" />
          </div>

          <section>
            <SectionTitle>This month</SectionTitle>
            {!attendanceRecords.length ? (
              <EmptyBlock icon={<Calendar size={26} />} title="No attendance yet" text="Your clock-ins will show here." />
            ) : (
              <div className="app-card divide-y divide-slate-100">
                {attendanceRecords.slice(0, 31).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-3.5">
                    <span className="h-10 w-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center leading-none">
                      <span className="font-display text-[15px] font-extrabold text-slate-900">{new Date(r.att_date).getDate()}</span>
                      <span className="text-[9px] font-bold uppercase text-slate-400">{new Date(r.att_date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                    </span>
                    <div className="flex-1 min-w-0 text-[13px] text-slate-600">
                      {r.check_in_time ? `In ${formatTime(r.check_in_time)}` : 'No clock-in'}
                      {r.check_out_time ? ` · Out ${formatTime(r.check_out_time)}` : ''}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${r.status === 'present' ? 'bg-emerald-50 text-emerald-700' : r.status === 'half' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
