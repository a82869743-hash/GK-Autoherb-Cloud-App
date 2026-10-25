import { useState } from 'react';
import { Gift, Plus, Pencil, Trash2, X, Loader2, Ticket, CheckCircle2, Ban } from 'lucide-react';
import { useAdminRewards, useDeleteReward, useRedemptions, useSaveReward, useUpdateRedemption } from '../../api/hooks/useAdminAutomation';
import { useServices } from '../../api/hooks/useServices';
import { useUIStore } from '../../store/uiStore';

const EMPTY = { title: '', description: '', reward_type: 'free_wash', service_id: '', discount_amount: '', points_required: 500, validity_days: 90, is_active: true, sort_order: 0 };
const TYPE_LABEL: Record<string, string> = { free_wash: 'Free wash', free_service: 'Free service', discount_amount: 'Flat ₹ off' };

/** Admin: what customers can redeem their points for, and the vouchers they've unlocked. */
export default function LoyaltyRewardsAdmin() {
  const toast = useUIStore((s) => s.toast);
  const { data } = useAdminRewards();
  const { data: servicesRes } = useServices({ active_only: true });
  const save = useSaveReward();
  const del = useDeleteReward();
  const [voucherStatus, setVoucherStatus] = useState('active');
  const { data: redemptions = [] } = useRedemptions(voucherStatus);
  const updateRedemption = useUpdateRedemption();
  const [editing, setEditing] = useState<any>(null);

  const rewards = data?.data || [];
  const earn = data?.settings?.earn_percent ?? 10;
  const services: any[] = servicesRes?.data || [];

  const submit = async () => {
    try {
      await save.mutateAsync(editing);
      toast('success', 'Reward saved');
      setEditing(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not save reward');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-[#111] to-[#7f0000] text-white p-5 flex flex-wrap items-center gap-4">
        <Gift size={28} className="text-[#ff8a80]" />
        <div className="flex-1 min-w-[220px]">
          <p className="font-bold">Customers earn {earn}% of every bill as points</p>
          <p className="text-xs text-white/70">₹2,000 service → {Math.floor(2000 * earn / 100)} points. 1 point = ₹1 of reward value. Change the % in Program Settings.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="h-10 px-4 rounded-2xl bg-white text-slate-900 text-xs font-bold flex items-center gap-1.5"><Plus size={15} /> Add reward</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rewards.map((r: any) => (
          <div key={r.id} className={`bg-white rounded-3xl border p-4 ${r.is_active ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D32F2F]">{TYPE_LABEL[r.reward_type]}</span>
                <p className="font-bold text-slate-900">{r.title}</p>
              </div>
              <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">{r.points_required} pts</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{r.description || (r.service_name ? `Free ${r.service_name}` : '')}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Voucher valid {r.validity_days} days{r.is_active ? '' : ' · hidden'}</span>
              <span className="flex gap-1">
                <button onClick={() => setEditing({ ...EMPTY, ...r, service_id: r.service_id || '', discount_amount: r.discount_amount || '', is_active: !!r.is_active })} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><Pencil size={14} /></button>
                {r.is_active ? (
                  <button onClick={() => confirm('Hide this reward from customers?') && del.mutate(r.id)} className="h-8 w-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500"><Trash2 size={14} /></button>
                ) : null}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center gap-2 border-b border-slate-100">
          <p className="font-bold text-slate-900 flex items-center gap-2 mr-auto"><Ticket size={17} className="text-[#D32F2F]" /> Unlocked vouchers</p>
          {['active', 'used', 'expired', 'cancelled', 'all'].map((s) => (
            <button key={s} onClick={() => setVoucherStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${voucherStatus === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{s}</button>
          ))}
        </div>
        {redemptions.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No vouchers here.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {redemptions.map((v: any) => (
              <div key={v.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <span className="font-mono font-bold text-[#C62828]">{v.voucher_code}</span>
                <span className="text-sm text-slate-900 font-semibold">{v.reward_title}</span>
                <span className="text-xs text-slate-500">{v.customer_name} · {v.customer_mobile}</span>
                <span className="text-xs text-slate-400 ml-auto">{v.points_spent} pts · {new Date(v.created_at).toLocaleDateString('en-IN')}</span>
                {v.status === 'active' && (
                  <span className="flex gap-1">
                    <button onClick={() => updateRedemption.mutate({ id: v.id, status: 'used' })} className="h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={13} /> Mark used</button>
                    <button onClick={() => confirm('Cancel voucher and refund points?') && updateRedemption.mutate({ id: v.id, status: 'cancelled' })} className="h-8 px-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1"><Ban size={13} /> Cancel</button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold">{editing.id ? 'Edit reward' : 'New reward'}</h3>
              <button onClick={() => setEditing(null)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title (e.g. Free Foam Wash)" className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
            <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Short description" rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TYPE_LABEL).map(([k, l]) => (
                <button key={k} onClick={() => setEditing({ ...editing, reward_type: k })} className={`h-10 rounded-xl text-xs font-bold border ${editing.reward_type === k ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}>{l}</button>
              ))}
            </div>
            {editing.reward_type === 'free_service' && (
              <select value={editing.service_id} onChange={(e) => setEditing({ ...editing, service_id: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm">
                <option value="">Choose the free service…</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {editing.reward_type === 'discount_amount' && (
              <input type="number" value={editing.discount_amount} onChange={(e) => setEditing({ ...editing, discount_amount: e.target.value })} placeholder="Discount amount ₹" className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-600">Points needed
                <input type="number" min={1} value={editing.points_required} onChange={(e) => setEditing({ ...editing, points_required: Number(e.target.value) })} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-600">Voucher valid (days)
                <input type="number" min={1} value={editing.validity_days} onChange={(e) => setEditing({ ...editing, validity_days: Number(e.target.value) })} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Show to customers
            </label>
            <button onClick={submit} disabled={save.isPending || !editing.title} className="w-full h-11 rounded-xl bg-[#D32F2F] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {save.isPending && <Loader2 size={15} className="animate-spin" />} Save reward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
