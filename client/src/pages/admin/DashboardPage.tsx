import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, CalendarCheck, Truck, AlertTriangle, Users, UserCheck, Star, Package,
  CalendarPlus, Droplets, Receipt, UserPlus, MessageSquare, BarChart3, Boxes, Gift,
  TrendingUp, TrendingDown, Car, Clock, MapPin, ChevronRight, ExternalLink, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStats } from '../../api/hooks/useDashboard';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import { useSettings } from '../../api/hooks/useSettings';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosInstance';
import { formatINR } from '../../utils/formatters';
import { resolveStudioLocation } from '../../utils/locationService';
import { OpsHero, StatTile, ActionTile, ChipRow, SectionTitle, EmptyBlock, Skeleton, BottomSheet, StatusPill } from '../../components/ops/ui';

const JOB_STATUSES: { value: string; label: string }[] = [
  { value: 'open', label: 'Queued' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'ready', label: 'Ready for pickup' },
  { value: 'complete', label: 'Complete' },
  { value: 'delivered', label: 'Delivered' },
];

const BAR: Record<string, string> = {
  in_progress: 'bg-sky-500', open: 'bg-amber-500', draft: 'bg-amber-500', delayed: 'bg-rose-500',
  ready: 'bg-purple-500', complete: 'bg-emerald-500', delivered: 'bg-emerald-500', cancelled: 'bg-slate-300',
};

type JobFilter = 'active' | 'in_progress' | 'open' | 'done' | 'all';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function slotLabel(b: any) {
  const date = b.slot_date || b.booking_date;
  const d = date ? new Date(String(date).length === 10 ? `${date}T00:00:00` : date) : null;
  const day = d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const t = b.start_time ? String(b.start_time).slice(0, 5) : '';
  return [day, t].filter(Boolean).join(' · ');
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: jobsRes, isLoading: jobsLoading } = useJobCarts({ limit: 30 });
  const { data: settingsData } = useSettings();
  const studio = useMemo(() => resolveStudioLocation(settingsData?.data), [settingsData]);

  const [pending, setPending] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [filter, setFilter] = useState<JobFilter>('active');
  const [statusFor, setStatusFor] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/bookings/pending', { params: { limit: 10 } })
      .then((res) => setPending(res.data?.data || []))
      .catch(() => setPending([]))
      .finally(() => setPendingLoading(false));
  }, []);

  const jobs: any[] = jobsRes?.data || [];
  const counts = useMemo(
    () => ({
      active: jobs.filter((j) => !['complete', 'delivered', 'cancelled'].includes(j.status)).length,
      in_progress: jobs.filter((j) => j.status === 'in_progress' || j.status === 'delayed').length,
      open: jobs.filter((j) => j.status === 'open' || j.status === 'draft').length,
      done: jobs.filter((j) => j.status === 'complete' || j.status === 'delivered').length,
      all: jobs.length,
    }),
    [jobs]
  );
  const shownJobs = useMemo(() => {
    switch (filter) {
      case 'active': return jobs.filter((j) => !['complete', 'delivered', 'cancelled'].includes(j.status));
      case 'in_progress': return jobs.filter((j) => j.status === 'in_progress' || j.status === 'delayed');
      case 'open': return jobs.filter((j) => j.status === 'open' || j.status === 'draft');
      case 'done': return jobs.filter((j) => j.status === 'complete' || j.status === 'delivered');
      default: return jobs;
    }
  }, [jobs, filter]);

  const changeStatus = async (status: string) => {
    if (!statusFor) return;
    setSaving(true);
    try {
      await api.patch(`/job-carts/${statusFor.id}/status`, { status });
      toast.success(`${statusFor.registration_no || 'Job'} → ${JOB_STATUSES.find((s) => s.value === status)?.label || status}`);
      setStatusFor(null);
      qc.invalidateQueries({ queryKey: ['job-carts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not update status');
    } finally {
      setSaving(false);
    }
  };

  const change = Number(stats?.revenue_change || 0);
  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${studio.lat},${studio.lng}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        {/* ── Left column ── */}
        <div className="space-y-6 min-w-0">
          <OpsHero
            kicker={`${greeting()}, ${firstName}`}
            title={statsLoading ? 'Loading today…' : <>{formatINR(stats?.today_revenue || 0)} <span className="text-white/60 text-[15px] font-bold">today</span></>}
            subtitle={
              <span className="inline-flex items-center gap-1.5">
                This month {formatINR(stats?.month_revenue || 0)}
                {change !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${change > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {change > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {Math.abs(change)}%
                  </span>
                )}
              </span>
            }
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'In bay', value: stats?.open_job_carts ?? 0 },
                { label: 'Bookings today', value: stats?.todayBookings ?? 0 },
                { label: 'On the road', value: stats?.activeDeliveries ?? 0 },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl bg-white/10 px-3 py-2.5">
                  <p className="font-display text-[20px] font-extrabold leading-none">{k.value}</p>
                  <p className="text-[11px] text-white/70 mt-1">{k.label}</p>
                </div>
              ))}
            </div>
          </OpsHero>

          {/* Quick actions */}
          <section className="app-card p-4">
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              <ActionTile label="Book slot" icon={CalendarPlus} to="/admin/slots" tone="red" />
              <ActionTile label="Job card" icon={ClipboardList} to="/admin/job-carts/new" tone="red" />
              <ActionTile label="Quick wash" icon={Droplets} to="/admin/quick-wash" tone="blue" />
              <ActionTile label="Quick bill" icon={Receipt} to="/admin/billing" tone="green" />
              <ActionTile label="Customer" icon={UserPlus} to="/admin/add-customer" tone="purple" />
              <ActionTile label="Stock" icon={Boxes} to="/admin/inventory" tone="amber" badge={stats?.low_stock_items || undefined} />
              <ActionTile label="WhatsApp" icon={MessageSquare} to="/admin/whatsapp" tone="green" />
              <ActionTile label="Reports" icon={BarChart3} to="/admin/reports" tone="slate" />
            </div>
          </section>

          {/* KPIs */}
          <section>
            <SectionTitle>Studio at a glance</SectionTitle>
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <StatTile label="Open job cards" value={stats?.open_job_carts ?? 0} hint={`${stats?.draft_job_carts ?? 0} drafts`} icon={ClipboardList} tone="red" to="/admin/job-carts" />
                <StatTile label="Waiting approval" value={stats?.total_pending_approvals ?? 0} hint={[[stats?.pending_service_bookings, 'bookings'], [stats?.pending_package_requests, 'packages'], [stats?.pending_product_orders, 'orders']].filter(([n]) => Number(n) > 0).map(([n, l]) => `${n} ${l}`).join(' · ') || 'all clear'} icon={CalendarCheck} tone="amber" to="/admin/customer-bookings" />
                <StatTile label="Deliveries live" value={stats?.activeDeliveries ?? 0} icon={Truck} tone="blue" to="/admin/deliveries" />
                <StatTile label="Low stock" value={stats?.low_stock_items ?? 0} hint="items to reorder" icon={AlertTriangle} tone="amber" to="/admin/inventory" />
                <StatTile label="Customers" value={stats?.totalCustomers ?? 0} hint={`${stats?.newLeads ?? 0} new leads`} icon={Users} tone="purple" to="/admin/customers" />
                <StatTile label="Staff present" value={stats?.staffPresent ?? 0} icon={UserCheck} tone="green" to="/admin/staff-hr" />
                <StatTile label="Rating" value={stats?.total_reviews ? Number(stats.avg_rating || 0).toFixed(1) : '—'} hint={`${stats?.total_reviews ?? 0} reviews`} icon={Star} tone="amber" to="/admin/feedback" />
                <StatTile label="Packages expiring" value={stats?.expiring_packages ?? 0} hint="next 7 days" icon={Package} tone="slate" to="/admin/package-tracking" />
                <StatTile label="Done this week" value={stats?.completedLast7Days ?? 0} hint={`${stats?.completedJobs ?? 0} all time`} icon={Gift} tone="green" />
              </div>
            )}
          </section>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6 min-w-0">
          {/* Bookings waiting */}
          <section>
            <SectionTitle action={<Link to="/admin/customer-bookings" className="text-[13px] font-bold text-[#D32F2F]">See all</Link>}>
              Needs your OK
            </SectionTitle>
            {pendingLoading ? (
              <Skeleton className="h-28" />
            ) : !pending.length ? (
              <div className="app-card p-4 flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CalendarCheck size={19} /></span>
                <div>
                  <p className="font-display font-bold text-[14px] text-slate-900">No bookings waiting</p>
                  <p className="text-xs text-slate-500">New customer bookings will show here.</p>
                </div>
              </div>
            ) : (
              <div className="app-card divide-y divide-slate-100">
                {pending.slice(0, 5).map((b) => (
                  <Link key={b.id} to="/admin/customer-bookings" className="flex items-center gap-3 p-3.5 active:bg-slate-50">
                    <span className="h-10 w-10 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0"><CalendarCheck size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-[14px] text-slate-900 truncate">{b.customer_name || 'Customer'}</p>
                      <p className="text-[12px] text-slate-500 truncate">{b.service_name || b.package_service_name || b.package_name || 'Service'} · {slotLabel(b)}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Expiring packages */}
          {(stats?.expiring_package_details || []).length > 0 && (
            <section>
              <SectionTitle>Packages ending soon</SectionTitle>
              <div className="app-card divide-y divide-slate-100">
                {(stats.expiring_package_details as any[]).slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3.5">
                    <span className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Package size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-[14px] text-slate-900 truncate">{p.customer_name}</p>
                      <p className="text-[12px] text-slate-500 truncate">{p.package_name} · ends {new Date(p.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    {p.customer_mobile && (
                      <a href={`tel:${p.customer_mobile}`} className="text-[12px] font-bold text-[#D32F2F]">Call</a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Studio */}
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="app-card flex items-center gap-3 p-4">
            <span className="h-11 w-11 rounded-xl bg-[#111] text-white flex items-center justify-center shrink-0"><MapPin size={20} /></span>
            <span className="flex-1 min-w-0">
              <span className="block font-display font-extrabold text-[14.5px] text-slate-900 truncate">{studio.name}</span>
              <span className="block text-[12px] text-slate-500 truncate">{studio.address}</span>
            </span>
            <ExternalLink size={16} className="text-slate-400 shrink-0" />
          </a>
        </div>
      </div>

      {/* ── Workshop jobs ── */}
      <section className="space-y-3">
        <SectionTitle action={<Link to="/admin/job-carts" className="text-[13px] font-bold text-[#D32F2F]">All job cards</Link>}>
          Workshop
        </SectionTitle>
        <ChipRow
          value={filter}
          onChange={setFilter}
          items={[
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'in_progress', label: 'In bay', count: counts.in_progress },
            { key: 'open', label: 'Queued', count: counts.open },
            { key: 'done', label: 'Done', count: counts.done },
            { key: 'all', label: 'Recent', count: counts.all },
          ]}
        />
        {jobsLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        ) : !shownJobs.length ? (
          <EmptyBlock
            icon={<Car size={26} />}
            title={jobs.length ? 'Nothing in this list' : 'No job cards yet'}
            text={jobs.length ? 'Try another filter.' : 'Create a job card when a car arrives at the studio.'}
            action={<Link to="/admin/job-carts/new" className="app-btn-primary h-11">New job card</Link>}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shownJobs.slice(0, 12).map((j) => (
              <div key={j.id} className="app-card relative overflow-hidden">
                <span className={`absolute left-0 top-0 h-full w-1.5 ${BAR[j.status] || 'bg-slate-300'}`} />
                <Link to={`/admin/job-carts/${j.id}`} className="block p-4 pl-5">
                  <div className="flex items-start gap-3">
                    <span className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><Car size={20} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-extrabold text-[16px] text-slate-900 truncate">{j.registration_no || `JC-${j.id}`}</p>
                        <StatusPill status={j.status} />
                      </div>
                      <p className="text-[12.5px] text-slate-500 truncate">
                        {[j.brand, j.model].filter(Boolean).join(' ')}
                        {j.customer_name ? ` · ${j.customer_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={13} /> {new Date(j.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-display font-extrabold text-[14px] text-slate-900">{Number(j.total_amount) > 0 ? formatINR(j.total_amount) : `${j.services_count || 0} services`}</span>
                  </div>
                </Link>
                {!['delivered', 'cancelled'].includes(j.status) && (
                  <button onClick={() => setStatusFor(j)} className="w-full border-t border-slate-100 py-2.5 text-[13px] font-bold text-[#D32F2F] active:bg-slate-50">
                    Update status
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomSheet open={!!statusFor} onClose={() => setStatusFor(null)} title={statusFor ? `Status · ${statusFor.registration_no || `JC-${statusFor.id}`}` : ''}>
        <div className="space-y-2">
          {JOB_STATUSES.map((s) => (
            <button
              key={s.value}
              disabled={saving}
              onClick={() => changeStatus(s.value)}
              className={`w-full flex items-center justify-between rounded-2xl border p-3.5 text-left font-display font-bold text-[14.5px] ${statusFor?.status === s.value ? 'border-[#111] bg-[#111] text-white' : 'border-slate-200 bg-white text-slate-900'}`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${BAR[s.value]}`} />
                {s.label}
              </span>
              {saving && statusFor?.status !== s.value ? null : statusFor?.status === s.value ? <span className="text-[12px] font-semibold opacity-70">Current</span> : null}
            </button>
          ))}
          {saving && <p className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Saving…</p>}
        </div>
      </BottomSheet>
    </div>
  );
}
