import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Check, Share2, Gift, Ticket, History, Sparkles, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useLoyalty, useLoyaltyHistory } from '../../api/hooks/useLoyalty';
import { useReferralCode } from '../../api/hooks/useReferrals';
import { useMyVouchers, useRedeemReward, useRewardsCatalog } from '../../api/hooks/useCustomerApp';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { AppPageHeader, BottomSheet, EmptyBlock, SegmentedTabs, Skeleton } from '../../components/customer/ui';

type Tab = 'rewards' | 'vouchers' | 'history';

export default function LoyaltyPage() {
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'vouchers' ? 'vouchers' : params.get('tab') === 'history' ? 'history' : 'rewards');
  const { data: loyalty, isLoading } = useLoyalty('mine');
  const { data: history = [] } = useLoyaltyHistory('mine');
  const { data: referral } = useReferralCode(user?.id || 'mine');
  const { data: catalog } = useRewardsCatalog();
  const { data: vouchers = [] } = useMyVouchers();
  const redeem = useRedeemReward();
  const [copied, setCopied] = useState(false);
  const [confirmReward, setConfirmReward] = useState<any>(null);
  const [unlocked, setUnlocked] = useState<any>(null);

  const points = Math.floor(Number(loyalty?.points || 0));
  const earnPercent = Number(catalog?.settings?.earn_percent ?? loyalty?.loyalty_settings?.earn_percent ?? 10);
  const rewards: any[] = catalog?.data || [];
  const activeVouchers = vouchers.filter((v: any) => v.status === 'active');
  const nextReward = useMemo(() => rewards.filter((r) => r.points_required > points).sort((a, b) => a.points_required - b.points_required)[0], [rewards, points]);

  const copyCode = () => {
    if (!referral?.code) return;
    navigator.clipboard?.writeText(referral.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shareWhatsApp = () => {
    const text = `Get your car detailed at GK AutoHerb! Use my code *${referral?.code}* when you sign up — we both get ${referral?.reward_points || 100} reward points. ${window.location.origin}/register?ref=${referral?.code}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const doRedeem = async () => {
    try {
      const res = await redeem.mutateAsync(confirmReward.id);
      setConfirmReward(null);
      setUnlocked({ ...res.data, title: confirmReward.title });
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not redeem');
    }
  };

  return (
    <div>
      <AppPageHeader title="Rewards" back={false} />

      {/* Points hero */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#111] via-[#1e1e1e] to-[#7f0000] text-white p-5 shadow-app-lg mt-1">
        {isLoading ? (
          <Skeleton className="h-24 bg-white/10" />
        ) : (
          <>
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/60">Your GK points</p>
            <p className="font-display text-[44px] font-extrabold leading-none mt-1">{points.toLocaleString('en-IN')}</p>
            <p className="text-sm text-white/70 mt-1">Worth ₹{points.toLocaleString('en-IN')} in rewards</p>
            {nextReward && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/70 mb-1.5">
                  <span>{nextReward.points_required - points} pts to {nextReward.title}</span>
                  <span>{nextReward.points_required}</span>
                </div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full rounded-full bg-[#ff5252]" style={{ width: `${Math.min(100, (points / nextReward.points_required) * 100)}%` }} />
                </div>
              </div>
            )}
          </>
        )}
        <div className="mt-4 rounded-2xl bg-white/10 px-3.5 py-2.5 text-[13px] flex items-center gap-2">
          <Sparkles size={16} className="text-[#ff8a80] shrink-0" />
          <span>Earn <b>{earnPercent}% back</b> on every service — a ₹2,000 bill gives you {Math.floor(2000 * earnPercent / 100)} points.</span>
        </div>
      </div>

      {/* Refer & earn */}
      <div className="app-card p-4 mt-3">
        <p className="font-display font-extrabold text-slate-900 flex items-center gap-2"><Share2 size={18} className="text-[#D32F2F]" /> Invite friends & earn {referral?.reward_points || 100} points</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 pl-4 pr-1.5 h-12">
          <span className="flex-1 font-mono font-bold tracking-wider text-slate-900">{referral?.code || '—'}</span>
          <button onClick={copyCode} className="app-btn h-9 px-3 bg-white text-slate-800 text-xs">
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button onClick={shareWhatsApp} disabled={!referral?.code} className="app-btn w-full h-11 mt-2 bg-[#25D366] text-white">
          Share on WhatsApp
        </button>
      </div>

      <div className="mt-4">
        <SegmentedTabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'rewards', label: 'Redeem' },
            { value: 'vouchers', label: 'Vouchers', badge: activeVouchers.length ? <span className="h-5 min-w-5 px-1 rounded-full bg-[#D32F2F] text-white text-[10px] flex items-center justify-center">{activeVouchers.length}</span> : undefined },
            { value: 'history', label: 'History' },
          ]}
        />
      </div>

      <div className="mt-3 space-y-3">
        {tab === 'rewards' &&
          (rewards.length === 0 ? (
            <EmptyBlock icon={<Gift size={24} />} title="Rewards coming soon" text="The studio hasn't added rewards yet." />
          ) : (
            rewards.map((r) => {
              const can = points >= r.points_required;
              return (
                <div key={r.id} className="app-card p-4 flex items-center gap-3">
                  <span className="h-12 w-12 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0"><Gift size={22} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-bold text-slate-900">{r.title}</span>
                    <span className="block text-xs text-slate-500 line-clamp-2">{r.description || (r.service_name ? `Free ${r.service_name}` : '')}</span>
                    <span className="block text-xs font-bold text-[#C62828] mt-0.5">{r.points_required} points</span>
                  </span>
                  <button disabled={!can} onClick={() => setConfirmReward(r)} className={`app-btn h-9 px-3.5 text-xs ${can ? 'bg-[#111] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {can ? 'Redeem' : `Need ${r.points_required - points}`}
                  </button>
                </div>
              );
            })
          ))}

        {tab === 'vouchers' &&
          (vouchers.length === 0 ? (
            <EmptyBlock icon={<Ticket size={24} />} title="No vouchers yet" text="Redeem your points to unlock free services." />
          ) : (
            vouchers.map((v: any) => (
              <div key={v.id} className={`app-card overflow-hidden flex ${v.status !== 'active' ? 'opacity-60' : ''}`}>
                <div className="w-2 bg-gradient-to-b from-[#e53935] to-[#7f0000]" />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-bold text-slate-900">{v.reward_title}</p>
                    <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${v.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{v.status}</span>
                  </div>
                  <p className="font-mono text-lg font-extrabold tracking-wider text-[#C62828] mt-1">{v.voucher_code}</p>
                  <p className="text-xs text-slate-500">{v.status === 'active' && v.expires_at ? `Valid till ${new Date(v.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : v.used_at ? `Used on ${new Date(v.used_at).toLocaleDateString('en-IN')}` : ''}</p>
                  {v.status === 'active' && (
                    <button onClick={() => navigate(`/customer/bookings/new?voucher=${v.voucher_code}${v.service_id ? `&service_id=${v.service_id}` : ''}`)} className="mt-2 text-[13px] font-bold text-[#D32F2F]">
                      Use while booking →
                    </button>
                  )}
                </div>
              </div>
            ))
          ))}

        {tab === 'history' &&
          ((history as any[]).length === 0 ? (
            <EmptyBlock icon={<History size={24} />} title="No points activity yet" text="Points you earn and redeem show up here." />
          ) : (
            <div className="app-card divide-y divide-slate-100">
              {(history as any[]).map((h) => {
                const pts = Number(h.points);
                return (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`h-9 w-9 rounded-full flex items-center justify-center ${pts >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {pts >= 0 ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-900 truncate">{h.description || h.type}</span>
                      <span className="block text-[11px] text-slate-400">{new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </span>
                    <span className={`font-display font-extrabold ${pts >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pts >= 0 ? '+' : ''}{Math.round(pts)}</span>
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      <BottomSheet
        open={!!confirmReward}
        onClose={() => setConfirmReward(null)}
        title="Redeem reward?"
        footer={
          <button onClick={doRedeem} disabled={redeem.isPending} className="app-btn-primary w-full">
            {redeem.isPending && <Loader2 size={16} className="animate-spin" />} Use {confirmReward?.points_required} points
          </button>
        }
      >
        {confirmReward && (
          <div className="text-center py-2">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-red-50 text-[#D32F2F] flex items-center justify-center"><Gift size={30} /></div>
            <p className="font-display text-lg font-extrabold mt-3">{confirmReward.title}</p>
            <p className="text-sm text-slate-500 mt-1">{confirmReward.description}</p>
            <p className="text-sm text-slate-600 mt-3">Balance after: <b>{points - confirmReward.points_required} points</b> · voucher valid {confirmReward.validity_days} days</p>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!unlocked} onClose={() => setUnlocked(null)} title="Reward unlocked 🎉">
        {unlocked && (
          <div className="text-center pb-3">
            <p className="text-sm text-slate-600">{unlocked.title}</p>
            <p className="font-mono text-2xl font-extrabold tracking-widest text-[#C62828] mt-3 rounded-2xl bg-red-50 py-4">{unlocked.voucher_code}</p>
            <p className="text-xs text-slate-500 mt-2">We've also sent this code to your WhatsApp.</p>
            <button
              onClick={() => navigate(`/customer/bookings/new?voucher=${unlocked.voucher_code}`)}
              className="app-btn-primary w-full mt-4"
            >
              Book now with this voucher
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
