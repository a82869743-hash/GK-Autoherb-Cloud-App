import { useState, useMemo } from 'react';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import { useStaffTasks, useUpdateTaskStatus } from '../../api/hooks/useStaffHR';
import { useUIStore } from '../../store/uiStore';
import ErrorState from '../../components/shared/ErrorState';
import { Briefcase, Clock, PlusCircle, Sparkles, ListTodo, CheckCircle2, Play, Check, Calendar, Car, Wrench, Timer } from 'lucide-react';
import { OpsHero, StatTile, SearchBar, ChipRow, EmptyBlock, Skeleton, SectionTitle, StatusPill } from '../../components/ops/ui';
import { Link } from 'react-router-dom';

export default function StaffJobCartsPage() {
  const { data, isLoading, isError, refetch } = useJobCarts({});
  const jobs = data?.data || [];

  const toast = useUIStore((s) => s.toast);
  const { data: myTasks = [], isLoading: isTasksLoading } = useStaffTasks();
  const updateStatusMutation = useUpdateTaskStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'open' | 'complete'>('all');
  const [showTasks, setShowTasks] = useState(true);

  const pendingTasksCount = useMemo(() => {
    return (myTasks || []).filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length;
  }, [myTasks]);

  const handleTaskStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
      toast('success', `Task marked as ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to update task status');
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job: any) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        job.registration_no?.toLowerCase().includes(q) ||
        job.brand?.toLowerCase().includes(q) ||
        job.model?.toLowerCase().includes(q) ||
        job.customer_name?.toLowerCase().includes(q);

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'in_progress' && (job.status === 'in_progress' || job.status === 'repairing' || job.status === 'washing')) ||
        (statusFilter === 'open' && (job.status === 'open' || job.status === 'draft' || job.status === 'pending')) ||
        (statusFilter === 'complete' && (job.status === 'complete' || job.status === 'delivered'));

      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: jobs.length,
      in_progress: jobs.filter((j: any) => j.status === 'in_progress' || j.status === 'washing' || j.status === 'repairing').length,
      open: jobs.filter((j: any) => j.status === 'open' || j.status === 'draft' || j.status === 'pending').length,
      complete: jobs.filter((j: any) => j.status === 'complete' || j.status === 'delivered').length,
    };
  }, [jobs]);

  const PRIORITY: Record<string, string> = {
    urgent: 'bg-rose-50 text-rose-700',
    high: 'bg-amber-50 text-amber-700',
    medium: 'bg-sky-50 text-sky-700',
    low: 'bg-slate-100 text-slate-600',
  };
  const STATUS_BAR: Record<string, string> = {
    in_progress: 'bg-sky-500', washing: 'bg-sky-500', repairing: 'bg-sky-500',
    open: 'bg-amber-500', draft: 'bg-amber-500', pending: 'bg-amber-500',
    complete: 'bg-emerald-500', delivered: 'bg-emerald-500',
  };

  return (
    <div className="space-y-5">
      <OpsHero
        kicker="Workshop floor"
        title={<>{counts.in_progress} in bay · {counts.open} waiting</>}
        subtitle={`${jobs.length} vehicle${jobs.length === 1 ? '' : 's'} on the floor today`}
      >
        <div className="flex gap-2">
          <Link to="/staff/job-carts/new" className="app-btn h-11 px-4 bg-white text-slate-900">
            <PlusCircle size={17} /> New job cart
          </Link>
          <Link to="/staff/quick-wash" className="app-btn h-11 px-4 bg-white/15 text-white border border-white/20">
            <Sparkles size={16} /> Quick wash
          </Link>
        </div>
      </OpsHero>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="In bay" value={counts.in_progress} icon={Wrench} tone="blue" onClick={() => setStatusFilter('in_progress')} />
        <StatTile label="Queued" value={counts.open} icon={Timer} tone="amber" onClick={() => setStatusFilter('open')} />
        <StatTile label="Done" value={counts.complete} icon={CheckCircle2} tone="green" onClick={() => setStatusFilter('complete')} />
      </div>

      {/* ── My tasks ── */}
      <section>
        <SectionTitle
          action={
            (myTasks || []).length > 0 ? (
              <button onClick={() => setShowTasks(!showTasks)} className="text-[13px] font-bold text-[#D32F2F]">
                {showTasks ? 'Hide' : `Show (${(myTasks || []).length})`}
              </button>
            ) : undefined
          }
        >
          <span className="inline-flex items-center gap-2">
            My tasks
            {pendingTasksCount > 0 && <span className="rounded-full bg-[#D32F2F] px-2 py-0.5 text-[11px] font-bold text-white">{pendingTasksCount}</span>}
          </span>
        </SectionTitle>

        {showTasks &&
          (isTasksLoading ? (
            <Skeleton className="h-24" />
          ) : (myTasks || []).length === 0 ? (
            <div className="app-card p-4 flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={20} /></span>
              <div>
                <p className="font-display font-bold text-slate-900 text-[14px]">All caught up</p>
                <p className="text-xs text-slate-500">No pending tasks assigned to you.</p>
              </div>
            </div>
          ) : (
            <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x lg:mx-0 lg:px-0 lg:grid lg:grid-cols-2 lg:overflow-visible">
              {(myTasks || []).map((t: any) => {
                const isCompleted = t.status === 'completed';
                return (
                  <div key={t.id} className={`app-card snap-start shrink-0 w-[80%] lg:w-auto p-4 flex flex-col ${isCompleted ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${PRIORITY[t.priority] || PRIORITY.low}`}>{t.priority}</span>
                      {t.job_cart_id && (
                        <Link to={`/staff/job-carts/${t.job_cart_id}`} className="text-[12px] font-bold text-[#D32F2F]">JC #{t.job_cart_id}</Link>
                      )}
                    </div>
                    <h4 className={`mt-2 font-display font-extrabold text-[15px] leading-snug text-slate-900 ${isCompleted ? 'line-through' : ''}`}>{t.title}</h4>
                    {t.description && <p className="mt-1 text-[12.5px] text-slate-500 line-clamp-2">{t.description}</p>}
                    <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[12px] text-slate-400">
                        <Calendar size={13} />
                        {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'No due date'}
                      </span>
                      {t.status === 'pending' && (
                        <button onClick={() => handleTaskStatusChange(t.id, 'in_progress')} disabled={updateStatusMutation.isPending} className="app-btn h-9 px-3.5 bg-[#111] text-white text-[13px]">
                          <Play size={13} /> Start
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button onClick={() => handleTaskStatusChange(t.id, 'completed')} disabled={updateStatusMutation.isPending} className="app-btn h-9 px-3.5 bg-emerald-600 text-white text-[13px]">
                          <Check size={14} /> Mark done
                        </button>
                      )}
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-600"><CheckCircle2 size={14} /> Done</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </section>

      {/* ── Job queue ── */}
      <section className="space-y-3">
        <SectionTitle>
          <span className="inline-flex items-center gap-2"><ListTodo size={18} className="text-[#D32F2F]" /> Job queue</span>
        </SectionTitle>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search number plate, car or customer" />
        <ChipRow
          value={statusFilter}
          onChange={setStatusFilter}
          items={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'in_progress', label: 'In bay', count: counts.in_progress },
            { key: 'open', label: 'Queued', count: counts.open },
            { key: 'complete', label: 'Completed', count: counts.complete },
          ]}
        />

        {isError ? (
          <ErrorState message="Failed to load today's job queue. Please check your connection and try again." onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : !filteredJobs.length ? (
          <EmptyBlock
            icon={<Briefcase size={26} />}
            title={searchQuery || statusFilter !== 'all' ? 'No matching jobs' : 'No cars in the queue'}
            text={searchQuery || statusFilter !== 'all' ? 'Try another search or filter.' : 'No job carts have been created today yet.'}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredJobs.map((job: any) => (
              <Link key={job.id} to={`/staff/job-carts/${job.id}`} className="app-card relative overflow-hidden p-4 pl-5 block active:scale-[0.99] transition-transform">
                <span className={`absolute left-0 top-0 h-full w-1.5 ${STATUS_BAR[job.status] || 'bg-slate-300'}`} />
                <div className="flex items-start gap-3">
                  <span className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><Car size={21} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-extrabold text-[17px] tracking-tight text-slate-900 truncate">{job.registration_no}</h3>
                      <StatusPill status={job.status} />
                    </div>
                    <p className="text-[13px] text-slate-500 truncate">
                      {[job.brand, job.model].filter(Boolean).join(' ')}
                      {job.customer_name ? ` · ${job.customer_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
                  <span className="font-semibold">{job.services_count ? `${job.services_count} service${job.services_count > 1 ? 's' : ''}` : 'No services yet'}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {new Date(job.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · #JC-{job.id}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
