import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Clock, Car, CreditCard, QrCode, Loader2, Plus, CheckCircle2, RotateCcw, Pencil, IndianRupee } from 'lucide-react';
import { useBookings, useChangeBookingServices } from '../../api/hooks/useBookings';
import { useServices } from '../../api/hooks/useServices';
import { useConfirmAttendance } from '../../api/hooks/useCustomerApp';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { formatTime } from '../../utils/formatters';
import { priceForSegment, formatPrice } from '../../utils/pricing';
import api from '../../api/axiosInstance';
import QrPaymentModal from '../../components/shared/QrPaymentModal';
import PaymentSandboxModal from '../../components/shared/PaymentSandboxModal';
import { AppPageHeader, BottomSheet, EmptyBlock, SegmentedTabs, Skeleton, StatusPill } from '../../components/customer/ui';
import { CancelBookingSheet, RescheduleSheet } from '../../components/customer/BookingActionSheets';
import ServiceImage from '../../components/customer/ServiceImage';

type Tab = 'upcoming' | 'past' | 'cancelled';

function PayCountdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setLeft('Expired');
        onExpire();
        return false;
      }
      setLeft(`${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`);
      return true;
    };
    tick();
    const t = setInterval(() => !tick() && clearInterval(t), 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  return <span className="text-[11px] font-bold text-orange-700 bg-orange-50 rounded-full px-2 py-0.5">Pay within {left}</span>;
}

function bookingStart(b: any) {
  return new Date(`${String(b.slot_date).slice(0, 10)}T${b.start_time || '00:00:00'}`);
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('upcoming');
  const { data, isLoading, refetch } = useBookings({ page: 1, limit: 100 });
  const { data: servicesRes } = useServices({ active_only: true });
  const changeServicesMut = useChangeBookingServices();
  const confirmAttendance = useConfirmAttendance();

  const [cancelFor, setCancelFor] = useState<any>(null);
  const [rescheduleFor, setRescheduleFor] = useState<any>(null);
  const [changeFor, setChangeFor] = useState<any>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [payFor, setPayFor] = useState<any>(null);
  const [qr, setQr] = useState<{ amount: number; bookingId: number } | null>(null);
  const [submittingOnline, setSubmittingOnline] = useState(false);
  const [sandboxModal, setSandboxModal] = useState<{
    isOpen: boolean; orderId: string; amount: number; itemName: string;
    handler: (resp: any) => Promise<void>; onDismiss: () => void; loading?: boolean;
  } | null>(null);

  const bookings: any[] = data?.data || [];
  const services: any[] = servicesRes?.data || [];

  const grouped = useMemo(() => {
    const now = Date.now();
    const out: Record<Tab, any[]> = { upcoming: [], past: [], cancelled: [] };
    for (const b of bookings) {
      if (['cancelled', 'expired', 'rejected'].includes(b.status)) out.cancelled.push(b);
      else if (b.status === 'completed' || bookingStart(b).getTime() < now - 3 * 36e5) out.past.push(b);
      else out.upcoming.push(b);
    }
    out.upcoming.sort((a, b) => bookingStart(a).getTime() - bookingStart(b).getTime());
    return out;
  }, [bookings]);

  // Deep link from the WhatsApp "RESCHEDULE" reply: /customer/bookings?reschedule=<id>
  useEffect(() => {
    const id = Number(params.get('reschedule'));
    if (!id || !bookings.length) return;
    const b = bookings.find((x) => Number(x.id) === id);
    if (b) setRescheduleFor(b);
    params.delete('reschedule');
    setParams(params, { replace: true });
  }, [bookings.length]);

  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const payOnline = async (bookingId: number, amount: number) => {
    setSubmittingOnline(true);
    try {
      if (!(await loadRazorpay())) throw new Error('Payment gateway failed to load. Are you online?');
      const resOrder = await api.post('/payments/razorpay/order', { amount, booking_id: bookingId });
      if (!resOrder.data.success) throw new Error(resOrder.data.error || 'Could not start payment');
      const order = resOrder.data.data;
      const user = useAuthStore.getState().user;
      const handler = async (response: any) => {
        await api.post('/payments/razorpay/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        toast('success', 'Payment successful! Your booking is awaiting confirmation.');
        setPayFor(null);
        refetch();
      };
      const onDismiss = () => toast('warning', 'Payment cancelled');
      if (String(order.id).startsWith('order_mock_')) {
        setSandboxModal({ isOpen: true, orderId: order.id, amount, itemName: 'Booking advance', handler, onDismiss });
        return;
      }
      const rzp = new (window as any).Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_123',
        amount: order.amount,
        currency: order.currency,
        name: 'GK AutoHerb',
        description: `Booking advance (#${bookingId})`,
        order_id: order.id,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.mobile || '' },
        handler: (r: any) => handler(r).catch((e: any) => toast('error', e?.response?.data?.error || 'Payment verification failed')),
        modal: { ondismiss: onDismiss },
        theme: { color: '#D32F2F' },
      });
      rzp.open();
    } catch (err: any) {
      toast('error', err.message || 'Payment failed to start');
    } finally {
      setSubmittingOnline(false);
    }
  };

  const openChangeServices = (b: any) => {
    setChangeFor(b);
    try {
      const items = JSON.parse(b.cart_items_json || '[]');
      setSelectedServiceIds(items.map((i: any) => i.id).filter(Boolean));
    } catch {
      setSelectedServiceIds(b.service_id ? [b.service_id] : []);
    }
  };

  const saveServices = async () => {
    try {
      await changeServicesMut.mutateAsync({ id: changeFor.id, service_ids: selectedServiceIds });
      toast('success', 'Services updated');
      setChangeFor(null);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not update services');
    }
  };

  const list = grouped[tab];

  return (
    <div>
      <AppPageHeader
        title="My Bookings"
        back={false}
        right={
          <button onClick={() => navigate('/customer/bookings/new')} className="app-btn h-10 px-3.5 bg-[#111] text-white text-[13px]">
            <Plus size={16} /> Book
          </button>
        }
      />

      <div className="mt-2">
        <SegmentedTabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: 'Upcoming', badge: grouped.upcoming.length ? <span className="text-[11px] opacity-70">{grouped.upcoming.length}</span> : undefined },
            { value: 'past', label: 'Past' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </>
        ) : list.length === 0 ? (
          <EmptyBlock
            icon={<CalendarDays size={26} />}
            title={tab === 'upcoming' ? 'No upcoming bookings' : tab === 'past' ? 'No past visits yet' : 'Nothing cancelled'}
            text={tab === 'upcoming' ? 'Book a wash or detailing slot in under a minute.' : undefined}
            action={tab === 'upcoming' ? <button onClick={() => navigate('/customer/bookings/new')} className="app-btn-primary px-6">Book a service</button> : undefined}
          />
        ) : (
          list.map((b) => {
            const start = bookingStart(b);
            const hoursAway = (start.getTime() - Date.now()) / 36e5;
            const canChangeServices = tab === 'upcoming' && hoursAway >= 24 && b.status !== 'pending_payment';
            return (
              <div key={b.id} className="app-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-extrabold text-slate-900 leading-tight">
                      {b.service_name || b.package_service_name || b.package_name || 'Car care service'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Booking #{b.id}{b.reschedule_count > 0 ? ` · rescheduled ${b.reschedule_count}×` : ''}</p>
                  </div>
                  <StatusPill status={b.status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                  <span className="flex items-center gap-1.5 text-slate-700"><CalendarDays size={15} className="text-[#D32F2F]" />{start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="flex items-center gap-1.5 text-slate-700"><Clock size={15} className="text-[#D32F2F]" />{formatTime(b.start_time)}</span>
                  <span className="flex items-center gap-1.5 text-slate-700 col-span-2 truncate"><Car size={15} className="text-[#D32F2F]" />{[b.vehicle_brand, b.vehicle_model].filter(Boolean).join(' ')}{b.vehicle_reg_no ? ` · ${b.vehicle_reg_no}` : ''}</span>
                  {Number(b.total_amount) > 0 && (
                    <span className="flex items-center gap-1.5 text-slate-700 col-span-2"><IndianRupee size={15} className="text-[#D32F2F]" />{formatPrice(Number(b.total_amount))}{Number(b.advance_amount) > 0 ? ` · advance ₹${Number(b.advance_amount)}` : ''}</span>
                  )}
                </div>

                {b.status === 'pending_payment' && (
                  <div className="mt-3 rounded-xl bg-orange-50/70 p-3 flex items-center justify-between gap-2">
                    {b.expires_at ? <PayCountdown expiresAt={b.expires_at} onExpire={() => refetch()} /> : <span className="text-xs font-semibold text-orange-700">Advance pending</span>}
                    <button onClick={() => setPayFor(b)} className="app-btn h-9 px-3 bg-[#D32F2F] text-white text-xs">Pay ₹{Number(b.advance_amount)}</button>
                  </div>
                )}

                {tab === 'upcoming' && b.customer_confirmation === 'pending' && (
                  <button
                    onClick={async () => { await confirmAttendance.mutateAsync(b.id); toast('success', "Thanks! We'll be ready for you."); }}
                    className="mt-3 w-full rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm h-10 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={16} /> Yes, I'll be there
                  </button>
                )}

                {b.cancel_reason && tab === 'cancelled' && (
                  <p className="mt-3 text-xs text-slate-500">Reason: {b.cancel_reason}</p>
                )}

                {tab === 'upcoming' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={!b.can_reschedule}
                      onClick={() => setRescheduleFor(b)}
                      className="app-btn h-10 bg-slate-100 text-slate-800"
                    >
                      <RotateCcw size={15} /> Reschedule
                    </button>
                    <button
                      disabled={!b.can_cancel}
                      onClick={() => setCancelFor(b)}
                      className="app-btn h-10 bg-white border border-slate-200 text-red-600"
                    >
                      Cancel
                    </button>
                    {canChangeServices && (
                      <button onClick={() => openChangeServices(b)} className="col-span-2 app-btn h-9 text-[13px] text-slate-600">
                        <Pencil size={14} /> Change services
                      </button>
                    )}
                    {(!b.can_cancel || !b.can_reschedule) && b.action_block_reason && (
                      <p className="col-span-2 text-[11px] text-slate-400 text-center">{b.action_block_reason}</p>
                    )}
                  </div>
                )}

                {tab !== 'upcoming' && (
                  <button
                    onClick={() => navigate(`/customer/bookings/new${b.service_id ? `?service_id=${b.service_id}` : ''}`)}
                    className="mt-3 w-full app-btn h-10 bg-slate-100 text-slate-800"
                  >
                    Book again
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <CancelBookingSheet booking={cancelFor} onClose={() => setCancelFor(null)} onDone={() => refetch()} />
      <RescheduleSheet booking={rescheduleFor} onClose={() => setRescheduleFor(null)} onDone={() => refetch()} />

      {/* Change services (≥ 24h before the slot) */}
      <BottomSheet
        open={!!changeFor}
        onClose={() => setChangeFor(null)}
        title="Change services"
        footer={
          <button onClick={saveServices} disabled={!selectedServiceIds.length || changeServicesMut.isPending} className="app-btn-primary w-full">
            {changeServicesMut.isPending && <Loader2 size={16} className="animate-spin" />} Update services
          </button>
        }
      >
        <div className="space-y-2">
          {services.filter((s) => s.vehicle_type !== 'bike').map((s) => {
            const on = selectedServiceIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedServiceIds((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                className={`w-full flex items-center gap-3 rounded-2xl border p-2.5 text-left ${on ? 'border-[#D32F2F] bg-red-50/40' : 'border-slate-200'}`}
              >
                <ServiceImage service={s} className="h-12 w-16 rounded-lg" />
                <span className="flex-1 min-w-0">
                  <span className="block font-display font-bold text-sm text-slate-900 truncate">{s.name}</span>
                  <span className="block text-xs font-bold text-[#C62828]">{formatPrice(priceForSegment(s, changeFor?.vehicle_category || 'sedan'))}</span>
                </span>
                <span className={`h-5 w-5 rounded-md border-2 ${on ? 'bg-[#D32F2F] border-[#D32F2F]' : 'border-slate-300'}`} />
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Advance payment choice */}
      <BottomSheet open={!!payFor} onClose={() => setPayFor(null)} title="Pay advance">
        {payFor && (
          <div className="space-y-3 pb-2">
            <p className="text-sm text-slate-600">Pay <b className="text-[#C62828]">₹{Number(payFor.advance_amount)}</b> to lock your slot.</p>
            <button disabled={submittingOnline} onClick={() => payOnline(payFor.id, Number(payFor.advance_amount))} className="app-btn-primary w-full">
              {submittingOnline ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={17} />} Pay online (UPI / Card)
            </button>
            <button
              onClick={() => { setQr({ amount: Number(payFor.advance_amount), bookingId: payFor.id }); setPayFor(null); }}
              className="app-btn-outline w-full"
            >
              <QrCode size={17} /> Scan & pay with UPI QR
            </button>
          </div>
        )}
      </BottomSheet>

      {qr && (
        <QrPaymentModal
          open={!!qr}
          onClose={() => { setQr(null); toast('warning', 'Payment not completed — your slot is held for 10 minutes.'); }}
          amount={qr.amount}
          bookingId={qr.bookingId}
          onSuccess={() => { setQr(null); toast('success', 'Payment submitted for verification.'); refetch(); }}
        />
      )}

      <PaymentSandboxModal
        isOpen={!!sandboxModal?.isOpen}
        orderId={sandboxModal?.orderId || ''}
        amount={sandboxModal?.amount || 0}
        itemName={sandboxModal?.itemName || 'Booking advance'}
        isLoading={!!sandboxModal?.loading}
        onSimulateSuccess={async () => {
          if (!sandboxModal) return;
          try {
            setSandboxModal((p) => (p ? { ...p, loading: true } : null));
            await sandboxModal.handler({ razorpay_order_id: sandboxModal.orderId, razorpay_payment_id: 'pay_mock_' + Date.now(), razorpay_signature: 'sig_mock_' + Date.now() });
            setSandboxModal(null);
          } catch {
            setSandboxModal((p) => (p ? { ...p, loading: false } : null));
          }
        }}
        onSimulateFailure={() => { sandboxModal?.onDismiss(); setSandboxModal(null); }}
        onClose={() => { sandboxModal?.onDismiss(); setSandboxModal(null); }}
      />
    </div>
  );
}
