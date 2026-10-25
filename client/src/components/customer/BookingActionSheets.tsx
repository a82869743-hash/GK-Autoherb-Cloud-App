import { useEffect, useMemo, useState } from 'react';
import { Loader2, CalendarX2, CalendarClock } from 'lucide-react';
import { BottomSheet } from './ui';
import { useCancelBookingWithReason, useDaySlots, useRescheduleBooking } from '../../api/hooks/useCustomerApp';
import { formatTime } from '../../utils/formatters';
import { useUIStore } from '../../store/uiStore';

const CANCEL_REASONS = [
  'Plans changed',
  'Booked by mistake',
  'Want a different service',
  'Found a better price',
  'Car not available',
  'Other',
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CancelBookingSheet({ booking, onClose, onDone }: { booking: any | null; onClose: () => void; onDone?: () => void }) {
  const toast = useUIStore((s) => s.toast);
  const cancel = useCancelBookingWithReason();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setReason('');
    setNote('');
  }, [booking?.id]);

  const submit = async () => {
    try {
      const res = await cancel.mutateAsync({ id: booking.id, reason: [reason, note].filter(Boolean).join(' — ') || undefined });
      toast('success', res?.data?.refund_note ? `Booking cancelled. ${res.data.refund_note}` : 'Booking cancelled');
      onDone?.();
      onClose();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not cancel this booking');
    }
  };

  return (
    <BottomSheet
      open={!!booking}
      onClose={onClose}
      title="Cancel booking?"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="app-btn-outline">Keep booking</button>
          <button onClick={submit} disabled={cancel.isPending || !reason} className="app-btn h-12 bg-red-600 text-white">
            {cancel.isPending && <Loader2 size={16} className="animate-spin" />} Cancel it
          </button>
        </div>
      }
    >
      {booking && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-red-50/70 p-3.5 flex gap-3">
            <CalendarX2 className="text-red-600 shrink-0" size={22} />
            <div className="text-[13px] text-slate-700">
              <p className="font-display font-bold text-slate-900">{booking.service_name || booking.package_name || 'Car care service'}</p>
              <p>{new Date(`${String(booking.slot_date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(booking.start_time)}</p>
              {Number(booking.advance_amount) > 0 && booking.status === 'confirmed' && (
                <p className="mt-1 text-emerald-700 font-semibold">Your advance of ₹{Number(booking.advance_amount)} will be refunded.</p>
              )}
            </div>
          </div>
          <div>
            <p className="app-label">Why are you cancelling?</p>
            <div className="flex flex-wrap gap-2">
              {CANCEL_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} className={`app-chip ${reason === r ? 'app-chip-on' : 'app-chip-off'}`}>{r}</button>
              ))}
            </div>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything else? (optional)"
            className="app-input h-auto py-3"
          />
          <p className="text-xs text-slate-500">Prefer another time? You can reschedule instead — it's free.</p>
        </div>
      )}
    </BottomSheet>
  );
}

export function RescheduleSheet({ booking, onClose, onDone }: { booking: any | null; onClose: () => void; onDone?: () => void }) {
  const toast = useUIStore((s) => s.toast);
  const reschedule = useRescheduleBooking();
  const days = useMemo(() => {
    const out: Date[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) out.push(new Date(start.getTime() + i * 864e5));
    return out;
  }, []);
  const [date, setDate] = useState(ymd(days[0]));
  const [slotId, setSlotId] = useState<number | null>(null);
  const { data: slots = [], isLoading } = useDaySlots(booking ? date : undefined);

  useEffect(() => {
    if (booking?.slot_date) {
      const d = String(booking.slot_date).slice(0, 10);
      setDate(d >= ymd(days[0]) ? d : ymd(days[0]));
    }
    setSlotId(null);
  }, [booking?.id]);

  const now = Date.now();
  const visible = slots.filter((s: any) => new Date(`${s.slot_date}T${s.start_time}`).getTime() - now > 60 * 60 * 1000);

  const submit = async () => {
    if (!slotId) return;
    try {
      await reschedule.mutateAsync({ id: booking.id, slot_id: slotId });
      toast('success', 'Booking rescheduled — we sent you the new time on WhatsApp');
      onDone?.();
      onClose();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not reschedule');
    }
  };

  return (
    <BottomSheet
      open={!!booking}
      onClose={onClose}
      title="Reschedule"
      footer={
        <button onClick={submit} disabled={!slotId || reschedule.isPending} className="app-btn-primary w-full">
          {reschedule.isPending && <Loader2 size={16} className="animate-spin" />} Confirm new time
        </button>
      }
    >
      {booking && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-3.5 flex gap-3 text-[13px]">
            <CalendarClock className="text-[#D32F2F] shrink-0" size={20} />
            <div>
              <p className="font-display font-bold text-slate-900">{booking.service_name || booking.package_name || 'Car care service'}</p>
              <p className="text-slate-500">
                Currently {new Date(`${String(booking.slot_date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(booking.start_time)}
              </p>
            </div>
          </div>

          <div>
            <p className="app-label">Pick a date</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
              {days.map((d) => {
                const key = ymd(d);
                const on = key === date;
                return (
                  <button
                    key={key}
                    onClick={() => { setDate(key); setSlotId(null); }}
                    className={`shrink-0 w-14 rounded-2xl py-2 text-center border ${on ? 'bg-[#111] border-[#111] text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    <span className="block text-[11px] font-semibold uppercase opacity-70">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                    <span className="block font-display text-lg font-extrabold leading-tight">{d.getDate()}</span>
                    <span className="block text-[10px] opacity-70">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="app-label">Pick a time</p>
            {isLoading ? (
              <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : visible.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No slots open on this day — try another date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {visible.map((s: any) => {
                  const full = !s.is_available || s.booked_count >= s.max_capacity || s.is_blocked;
                  const current = Number(s.id) === Number(booking.slot_id);
                  return (
                    <button
                      key={s.id}
                      disabled={full || current}
                      onClick={() => setSlotId(s.id)}
                      className={`h-11 rounded-xl text-sm font-bold border transition-colors ${
                        slotId === s.id
                          ? 'bg-[#D32F2F] border-[#D32F2F] text-white'
                          : full || current
                          ? 'bg-slate-50 border-slate-100 text-slate-300 line-through'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      {formatTime(s.start_time)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
