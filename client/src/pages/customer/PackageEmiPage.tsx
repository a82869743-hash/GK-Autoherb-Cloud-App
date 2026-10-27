import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, CreditCard, Loader2, Store, AlertTriangle } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { AppPageHeader, EmptyBlock, Skeleton } from '../../components/customer/ui';
import PaymentSandboxModal from '../../components/shared/PaymentSandboxModal';

type Installment = { id: number; installment_no: number; amount: number; due_date: string; status: 'pending' | 'paid' | 'waived'; paid_at?: string; payment_method?: string };
type Plan = {
  id: number; package_name: string; registration_no?: string; brand?: string; model?: string; months: number;
  total_amount: number; status: 'active' | 'completed' | 'cancelled'; installments: Installment[];
  paid_count: number; paid_amount: number; balance: number; next_installment: Installment | null; overdue_count: number; is_paused: boolean;
};

const rupees = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const day = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const isLate = (i: Installment) => i.status === 'pending' && new Date(i.due_date) < new Date(new Date().toDateString());

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PackageEmiPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const qc = useQueryClient();
  const [payingId, setPayingId] = useState<number | null>(null);
  const [sandbox, setSandbox] = useState<{ orderId: string; amount: number; name: string; loading?: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-emi-plans'],
    queryFn: async () => (await api.get('/package-emi/my')).data as { data: Plan[]; grace_days: number },
  });
  const plans = data?.data || [];
  const graceDays = data?.grace_days ?? 7;

  const verify = async (resp: any) => {
    const r = await api.post('/payments/razorpay/verify', resp);
    if (!r.data.success) throw new Error('Payment verification failed');
    addToast('success', 'Installment paid. Thank you!');
    qc.invalidateQueries({ queryKey: ['my-emi-plans'] });
  };

  const payInstallment = async (plan: Plan, inst: Installment) => {
    setPayingId(inst.id);
    try {
      const order = (await api.post('/payments/razorpay/order', { emi_installment_id: inst.id, amount: inst.amount })).data.data;
      const name = `${plan.package_name} · EMI ${inst.installment_no} of ${plan.months}`;
      if (String(order.id).startsWith('order_mock_')) {
        setSandbox({ orderId: order.id, amount: order.amount / 100, name });
        return;
      }
      if (!(await loadRazorpay())) throw new Error('Could not load the payment page. Check your internet.');
      new (window as any).Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'GK AutoHerb',
        description: name,
        order_id: order.id,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.mobile || '' },
        handler: (resp: any) => verify(resp).catch((e) => addToast('error', e.response?.data?.error || e.message)),
        theme: { color: '#D32F2F' },
      }).open();
    } catch (e: any) {
      addToast('error', e.response?.data?.error || e.message || 'Could not start the payment');
    } finally {
      setPayingId(null);
    }
  };

  const confirmSandbox = async () => {
    if (!sandbox) return;
    setSandbox({ ...sandbox, loading: true });
    try {
      await verify({ razorpay_order_id: sandbox.orderId, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: `sig_mock_${Date.now()}` });
    } catch (e: any) {
      addToast('error', e.response?.data?.error || e.message);
    }
    setSandbox(null);
  };

  return (
    <div className="pb-10">
      <AppPageHeader title="My EMI plans" subtitle="Package installments" />

      {isLoading ? (
        <div className="space-y-3 mt-3"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : plans.length === 0 ? (
        <div className="mt-3">
          <EmptyBlock icon={<CreditCard size={26} />} title="No EMI plans yet"
            text="Packages with EMI let you pay a little every month."
            action={<Link to="/customer/buy-packages" className="inline-block rounded-xl bg-[#D32F2F] px-5 py-2.5 text-sm font-bold text-white">See packages</Link>} />
        </div>
      ) : (
        <div className="space-y-4 mt-3">
          {plans.map((plan) => {
            const pct = Math.round((plan.paid_count / plan.months) * 100);
            const next = plan.next_installment;
            return (
              <div key={plan.id} className="app-card overflow-hidden">
                <div className="bg-[#111] text-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-extrabold truncate">{plan.package_name}</p>
                      <p className="text-xs text-white/60 truncate">{[plan.brand, plan.model, plan.registration_no].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${plan.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : plan.overdue_count ? 'bg-red-500/30 text-red-200' : 'bg-white/10 text-white'}`}>
                      {plan.status === 'completed' ? 'Fully paid' : plan.overdue_count ? 'Overdue' : 'Active'}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#D32F2F]" style={{ width: `${pct}%` }} /></div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-white/70">{plan.paid_count} of {plan.months} paid · {rupees(plan.paid_amount)}</span>
                    <span className="font-bold">{plan.balance > 0 ? `${rupees(plan.balance)} left` : 'Done 🎉'}</span>
                  </div>
                </div>

                {plan.is_paused && (
                  <div className="flex gap-2 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>Package bookings are paused because an installment is more than {graceDays} days late. Pay it to book again.</span>
                  </div>
                )}

                {next && (
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isLate(next) ? 'Overdue' : 'Next installment'}</p>
                    <div className="mt-1 flex items-end justify-between gap-3">
                      <div>
                        <p className="font-display text-2xl font-extrabold text-slate-900">{rupees(next.amount)}</p>
                        <p className={`text-xs ${isLate(next) ? 'text-[#D32F2F] font-bold' : 'text-slate-500'}`}>Due {day(next.due_date)}</p>
                      </div>
                      <button onClick={() => payInstallment(plan, next)} disabled={payingId !== null}
                        className="h-11 rounded-xl bg-[#D32F2F] px-4 text-sm font-bold text-white flex items-center gap-2 disabled:opacity-60">
                        {payingId === next.id ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Pay now
                      </button>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><Store size={13} /> You can also pay by cash or UPI at the studio.</p>
                  </div>
                )}

                <div className="p-4 space-y-2.5">
                  {plan.installments.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 text-sm">
                      {i.status === 'pending'
                        ? <CalendarClock size={18} className={isLate(i) ? 'text-[#D32F2F]' : 'text-slate-400'} />
                        : <CheckCircle2 size={18} className="text-emerald-600" />}
                      <span className="flex-1 text-slate-700">
                        {i.installment_no}. {i.status === 'pending' ? `Due ${day(i.due_date)}` : `${i.status === 'waived' ? 'Waived' : 'Paid'} ${i.paid_at ? day(i.paid_at) : ''}`}
                      </span>
                      <span className={`font-bold ${i.status === 'pending' ? 'text-slate-900' : 'text-slate-400 line-through decoration-transparent'}`}>{rupees(i.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sandbox && (
        <PaymentSandboxModal isOpen onClose={() => setSandbox(null)} onConfirm={confirmSandbox}
          itemName={sandbox.name} amount={sandbox.amount} loading={sandbox.loading} />
      )}
    </div>
  );
}
