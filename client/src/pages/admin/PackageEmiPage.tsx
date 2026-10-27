import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, CreditCard, IndianRupee, Loader2, Send, AlertTriangle, Phone } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useUIStore } from '../../store/uiStore';
import { OpsPageTitle, SearchBar, ChipRow, StatTile, EmptyBlock, Skeleton, BottomSheet } from '../../components/ops/ui';

type Installment = { id: number; installment_no: number; amount: number; due_date: string; status: 'pending' | 'paid' | 'waived'; paid_at?: string; payment_method?: string; payment_ref?: string };
type Plan = {
  id: number; package_name: string; customer_name?: string; customer_mobile?: string; registration_no?: string; brand?: string; model?: string;
  months: number; total_amount: number; status: string; installments: Installment[]; created_at: string;
  paid_count: number; paid_amount: number; balance: number; next_installment: Installment | null; overdue_count: number; is_paused: boolean;
};

const TABS = [
  { key: 'active', label: 'Running' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
] as const;
type Tab = (typeof TABS)[number]['key'];

const METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'bank', label: 'Bank' },
];

const rupees = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const day = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const isLate = (i: Installment) => i.status === 'pending' && new Date(i.due_date) < new Date(new Date().toDateString());

export default function PackageEmiPage() {
  const toast = useUIStore((s) => s.toast);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [openPlan, setOpenPlan] = useState<Plan | null>(null);
  const [collect, setCollect] = useState<{ plan: Plan; inst: Installment } | null>(null);
  const [method, setMethod] = useState('cash');
  const [ref, setRef] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['package-emi', tab, search],
    queryFn: async () => (await api.get('/package-emi', { params: { status: tab, search: search || undefined } })).data,
  });
  const plans: Plan[] = data?.data || [];
  const totals = data?.totals || {};

  const record = useMutation({
    mutationFn: async (vars: { id: number; waive?: boolean }) =>
      (await api.post(`/package-emi/installments/${vars.id}/pay`, { method, ref: ref || undefined, waive: vars.waive })).data,
    onSuccess: (res) => {
      toast('success', res.message || 'Saved');
      setCollect(null);
      setRef('');
      if (openPlan && res.data) setOpenPlan(res.data);
      qc.invalidateQueries({ queryKey: ['package-emi'] });
    },
    onError: (e: any) => toast('error', e.response?.data?.error || 'Could not save'),
  });

  const remind = useMutation({
    mutationFn: async (id: number) => (await api.post(`/package-emi/${id}/remind`)).data,
    onSuccess: (res) => {
      if (res.wa_link) window.open(res.wa_link, '_blank');
      toast(res.success ? 'success' : 'error', res.message);
    },
    onError: (e: any) => toast('error', e.response?.data?.error || 'Could not send'),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-28 font-sans">
      <OpsPageTitle kicker="Packages" title="Package EMI" subtitle="Installments, dues and collections" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Outstanding" value={rupees(totals.outstanding)} icon={IndianRupee} tone="red" />
        <StatTile label="Overdue" value={rupees(totals.overdue)} icon={AlertTriangle} tone="amber" onClick={() => setTab('overdue')} />
        <StatTile label="Due in 7 days" value={rupees(totals.due_this_week)} icon={CalendarClock} tone="blue" />
        <StatTile label="Running plans" value={totals.active_plans ?? 0} icon={CreditCard} tone="green" onClick={() => setTab('active')} />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Name, mobile or number plate" />
      <ChipRow value={tab} onChange={setTab} items={TABS.map((t) => ({ key: t.key, label: t.label }))} />

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      ) : plans.length === 0 ? (
        <EmptyBlock icon={<CreditCard size={26} />} title="No EMI plans here"
          text="Turn on EMI for a package in Packages → Edit → Allow EMI. Plans appear here once a customer buys on EMI." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => {
            const next = p.next_installment;
            return (
              <div key={p.id} className="app-card p-4 min-w-0">
                <button className="w-full text-left" onClick={() => setOpenPlan(p)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-extrabold text-slate-900 truncate">{p.customer_name || 'Customer'}</p>
                      <p className="text-xs text-slate-500 truncate">{p.package_name} · {[p.registration_no, p.brand, p.model].filter(Boolean).join(' ')}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : p.overdue_count ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {p.status === 'completed' ? 'Paid' : p.overdue_count ? `${p.overdue_count} overdue` : `${p.paid_count}/${p.months}`}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#D32F2F]" style={{ width: `${(p.paid_count / p.months) * 100}%` }} /></div>
                  <div className="mt-2 flex justify-between text-xs text-slate-600">
                    <span>{rupees(p.paid_amount)} of {rupees(p.total_amount)}</span>
                    <span className="font-bold text-slate-900">{rupees(p.balance)} left</span>
                  </div>
                </button>
                {next && (
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${isLate(next) ? 'text-red-700 font-bold' : 'text-slate-500'}`}>
                        #{next.installment_no} · {rupees(next.amount)} · {isLate(next) ? 'was due' : 'due'} {day(next.due_date)}
                      </p>
                    </div>
                    <button onClick={() => remind.mutate(p.id)} disabled={remind.isPending}
                      className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600" title="Send reminder">
                      <Send size={15} />
                    </button>
                    <button onClick={() => { setMethod('cash'); setRef(''); setCollect({ plan: p, inst: next }); }}
                      className="h-9 rounded-xl bg-[#D32F2F] px-3 text-xs font-bold text-white">
                      Collect
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet open={!!openPlan} onClose={() => setOpenPlan(null)} title={openPlan ? `${openPlan.customer_name || 'Customer'} · ${openPlan.package_name}` : ''}>
        {openPlan && (
          <div className="space-y-3 pb-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {openPlan.customer_mobile && <a href={`tel:${openPlan.customer_mobile}`} className="flex items-center gap-1 font-bold text-slate-900"><Phone size={13} />{openPlan.customer_mobile}</a>}
              <span>Started {day(openPlan.created_at)}</span>
              <span>{openPlan.months} months · {rupees(openPlan.total_amount)}</span>
            </div>
            {openPlan.installments.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                {i.status === 'pending'
                  ? <CalendarClock size={18} className={isLate(i) ? 'text-red-600' : 'text-slate-400'} />
                  : <CheckCircle2 size={18} className="text-emerald-600" />}
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-bold text-slate-900">#{i.installment_no} · {rupees(i.amount)}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {i.status === 'pending'
                      ? `Due ${day(i.due_date)}${isLate(i) ? ' · overdue' : ''}`
                      : `${i.status === 'waived' ? 'Waived' : 'Paid'} ${i.paid_at ? day(i.paid_at) : ''} · ${i.payment_method || ''}${i.payment_ref ? ` · ${i.payment_ref}` : ''}`}
                  </p>
                </div>
                {i.status === 'pending' && (
                  <button onClick={() => { setMethod('cash'); setRef(''); setCollect({ plan: openPlan, inst: i }); }}
                    className="h-9 rounded-xl bg-[#111] px-3 text-xs font-bold text-white">Collect</button>
                )}
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!collect} onClose={() => setCollect(null)} title="Record installment payment"
        footer={collect && (
          <div className="flex gap-2">
            <button onClick={() => record.mutate({ id: collect.inst.id, waive: true })} disabled={record.isPending}
              className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Waive</button>
            <button onClick={() => record.mutate({ id: collect.inst.id })} disabled={record.isPending}
              className="h-12 flex-1 rounded-xl bg-[#D32F2F] text-sm font-bold text-white flex items-center justify-center gap-2">
              {record.isPending && <Loader2 size={16} className="animate-spin" />} Received {rupees(collect.inst.amount)}
            </button>
          </div>
        )}>
        {collect && (
          <div className="space-y-4 pb-2">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-bold text-slate-900">{collect.plan.customer_name} · {collect.plan.package_name}</p>
              <p className="text-slate-500">Installment {collect.inst.installment_no} of {collect.plan.months} · due {day(collect.inst.due_date)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Paid by</p>
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map((m) => (
                  <button key={m.key} onClick={() => setMethod(m.key)}
                    className={`h-11 rounded-xl border text-sm font-bold ${method === m.key ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]' : 'border-slate-200 text-slate-700'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {method !== 'cash' && (
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UPI / card reference (optional)"
                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm" />
            )}
            <p className="text-[11px] text-slate-500">The customer gets a WhatsApp receipt. Waive only when you agree not to collect this installment.</p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
