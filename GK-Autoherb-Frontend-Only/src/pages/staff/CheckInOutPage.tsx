import { useState } from 'react';
import { Clock, LogIn, LogOut, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminTopBar from '../../components/layout/AdminTopBar';
import ErrorState from '../../components/shared/ErrorState';
import { useMyAttendance, useCheckIn, useCheckOut } from '../../api/hooks/useStaff';
import { formatTime } from '../../utils/formatters';

export default function CheckInOutPage() {
  const { data: attRes, isLoading, isError, refetch } = useMyAttendance();
  const checkInMut = useCheckIn();
  const checkOutMut = useCheckOut();

  const attendanceRecords = attRes?.data || [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = attendanceRecords.find((r: any) => r.att_date.startsWith(todayStr));

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

  return (
    <>
      <AdminTopBar title="Staff Check-In / Check-Out" subtitle="Log your daily attendance and shift hours" />

      <div className="max-w-xl mx-auto mt-6">
        {isError ? (
          <div className="pt-4">
            <ErrorState
              message="Failed to load attendance records. Please check your connection and try again."
              onRetry={() => refetch()}
            />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#D32F2F] w-8 h-8" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm card-premium relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D32F2F] via-orange-500 to-green-500" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  !todayRecord ? 'bg-amber-50 text-amber-600' :
                  todayRecord.check_out_time ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#1c1b1b]">Shift Status</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>

              {/* Status Details */}
              <div className="bg-[#faf7f5] rounded-xl p-4 border border-gray-100 mb-6 space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-gray-200/50 pb-2">
                  <span className="text-gray-500 font-medium">Status</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-lg text-xs uppercase tracking-wider ${
                    !todayRecord ? 'bg-amber-100 text-amber-700' :
                    todayRecord.check_out_time ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {!todayRecord ? 'Absent / Not Checked In' :
                     todayRecord.check_out_time ? 'Shift Completed' : 'Active Duty'}
                  </span>
                </div>

                {todayRecord?.check_in_time && (
                  <div className="flex justify-between items-center text-sm border-b border-gray-200/50 pb-2">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <LogIn size={14} className="text-emerald-500" /> Clocked In
                    </span>
                    <span className="font-bold text-gray-900">{formatTime(todayRecord.check_in_time)}</span>
                  </div>
                )}

                {todayRecord?.check_out_time && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <LogOut size={14} className="text-red-400" /> Clocked Out
                    </span>
                    <span className="font-bold text-gray-900">{formatTime(todayRecord.check_out_time)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                {!todayRecord ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInMut.isPending}
                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-green-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
                  >
                    {checkInMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                    Clock In
                  </button>
                ) : !todayRecord.check_out_time ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={checkOutMut.isPending}
                    className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-[#af101a] text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
                  >
                    {checkOutMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                    Clock Out
                  </button>
                ) : (
                  <div className="flex-1 py-3 bg-gray-50 text-gray-400 text-center font-bold text-sm rounded-xl border border-gray-200">
                    Shift Logged successfully for today
                  </div>
                )}
              </div>
            </div>

            {/* Attendance History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-2">
                <Calendar size={18} className="text-[#D32F2F]" />
                <h3 className="font-extrabold text-[#1c1b1b] text-base">This Month's Attendance</h3>
              </div>

              {!attendanceRecords.length ? (
                <p className="text-sm text-gray-500 text-center py-8">No attendance records found.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {attendanceRecords.slice(0, 10).map((r: any, idx: number) => (
                    <div
                      key={r.id}
                      className="p-4 flex items-center justify-between hover:bg-[#faf7f5] transition-colors opacity-0 animate-fade-in-up"
                      style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
                    >
                      <div>
                        <p className="font-bold text-[#1c1b1b]">
                          {new Date(r.att_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                          {r.check_in_time && <span>In: {formatTime(r.check_in_time)}</span>}
                          {r.check_out_time && <span>Out: {formatTime(r.check_out_time)}</span>}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        r.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
