import { IndianRupee, Wallet, CheckCircle2, Clock } from 'lucide-react';
import ErrorState from '../../components/shared/ErrorState';
import { useMyPayments } from '../../api/hooks/useStaff';
import { formatDate } from '../../utils/formatters';
import { OpsPageTitle, StatTile, SectionTitle, EmptyBlock, Skeleton } from '../../components/ops/ui';

export default function StaffBenefitsPage() {
  const { data, isLoading, isError, refetch } = useMyPayments();
  const benefits = data?.data || [];

  const pendingAmount = benefits.filter((b: any) => b.status === 'pending').reduce((sum: number, b: any) => sum + Number(b.amount), 0);
  const paidAmount = benefits.filter((b: any) => b.status === 'paid').reduce((sum: number, b: any) => sum + Number(b.amount), 0);

  return (
    <div className="space-y-5">
      <OpsPageTitle kicker="Earnings" title="My benefits" subtitle="Bonuses, incentives and payouts" />

      {isError ? (
        <ErrorState message="Failed to load benefits history. Please check your connection and try again." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e53935] to-[#8e0000] p-5 text-white shadow-app">
            <div className="absolute -right-8 -bottom-10 h-36 w-36 rounded-full bg-white/10" />
            <p className="text-[12px] font-semibold text-white/75 flex items-center gap-1.5"><Wallet size={14} /> Pending clearance</p>
            <p className="font-display text-[34px] font-extrabold leading-tight mt-1">₹{pendingAmount.toLocaleString('en-IN')}</p>
            <p className="text-[12px] text-white/75 mt-1">Will be paid with your next payout</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="Paid so far" value={`₹${paidAmount.toLocaleString('en-IN')}`} icon={CheckCircle2} tone="green" />
            <StatTile label="Entries" value={benefits.length} icon={Clock} tone="slate" />
          </div>

          <section>
            <SectionTitle>Payout history</SectionTitle>
            {!benefits.length ? (
              <EmptyBlock icon={<IndianRupee size={26} />} title="No payments yet" text="Your incentives will appear here." />
            ) : (
              <div className="app-card divide-y divide-slate-100">
                {benefits.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 p-3.5">
                    <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${b.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <IndianRupee size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-[14px] text-slate-900 truncate">{b.purpose}</p>
                      <p className="text-[12px] text-slate-500">{formatDate(b.payment_date || b.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-extrabold text-[15px] text-slate-900">₹{Number(b.amount).toLocaleString('en-IN')}</p>
                      <span className={`text-[11px] font-bold capitalize ${b.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{b.status}</span>
                    </div>
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
