import { useState, useMemo } from 'react';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import { useStaffTasks, useUpdateTaskStatus } from '../../api/hooks/useStaffHR';
import { useUIStore } from '../../store/uiStore';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Briefcase, Clock, ChevronRight, PlusCircle, Search, Sparkles, Filter, ListTodo, CheckCircle2, Play, Check, AlertCircle, Calendar } from 'lucide-react';
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

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── Staff Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D32F2F] block mb-0.5">
            Workshop Bay Operations
          </span>
          <h1 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight leading-tight">
            Active Workshop Job Queue
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            {jobs.length} vehicle{jobs.length === 1 ? '' : 's'} registered on the workshop floor today
          </p>
        </div>

        <Link
          to="/staff/job-carts/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-center"
        >
          <PlusCircle size={15} />
          <span>New Job Cart</span>
        </Link>
      </div>

      {/* ── My Assigned Tasks Widget ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/70 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center font-bold">
              <ListTodo size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">My Assigned Tasks</h2>
                {pendingTasksCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D32F2F] text-white">
                    {pendingTasksCount} Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Bay actions & service duties assigned to your shift</p>
            </div>
          </div>
          <button
            onClick={() => setShowTasks(!showTasks)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {showTasks ? 'Minimize' : `View (${(myTasks || []).length})`}
          </button>
        </div>

        {showTasks && (
          <div className="p-4 sm:p-5">
            {isTasksLoading ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading your assigned duties...</div>
            ) : (myTasks || []).length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No pending tasks currently assigned to you.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(myTasks || []).map((t: any) => {
                  const priorityColors = {
                    urgent: 'bg-rose-50 text-rose-700 border-rose-200',
                    high: 'bg-amber-50 text-amber-700 border-amber-200',
                    medium: 'bg-sky-50 text-sky-700 border-sky-200',
                    low: 'bg-slate-50 text-slate-600 border-slate-200',
                  }[t.priority as 'urgent' | 'high' | 'medium' | 'low'] || 'bg-slate-50 text-slate-600 border-slate-200';

                  const isCompleted = t.status === 'completed';
                  const isInProgress = t.status === 'in_progress';

                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCompleted
                          ? 'bg-slate-50/60 border-slate-200/60 opacity-75'
                          : isInProgress
                          ? 'bg-amber-50/20 border-amber-200/80 shadow-2xs'
                          : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${priorityColors}`}>
                          {t.priority}
                        </span>
                        {t.job_cart_id && (
                          <Link
                            to={`/staff/job-carts/${t.job_cart_id}`}
                            className="text-[11px] font-bold text-[#D32F2F] hover:underline"
                          >
                            JC #{t.job_cart_id}
                          </Link>
                        )}
                      </div>

                      <h4 className={`text-xs font-bold text-slate-900 mb-1 leading-snug ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-2.5">
                          {t.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar size={12} />
                          <span>{t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'No due date'}</span>
                        </div>

                        <div>
                          {t.status === 'pending' && (
                            <button
                              onClick={() => handleTaskStatusChange(t.id, 'in_progress')}
                              disabled={updateStatusMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-2xs transition-colors"
                            >
                              <Play size={10} />
                              <span>Start</span>
                            </button>
                          )}
                          {t.status === 'in_progress' && (
                            <button
                              onClick={() => handleTaskStatusChange(t.id, 'completed')}
                              disabled={updateStatusMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors"
                            >
                              <Check size={11} />
                              <span>Mark Done</span>
                            </button>
                          )}
                          {isCompleted && (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                              <CheckCircle2 size={12} />
                              <span>Completed</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Filter & Search Controls ── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by license plate, car brand, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-red-500/20 focus:border-[#D32F2F] text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all' as const, label: 'All Jobs', count: counts.all },
            { key: 'in_progress' as const, label: 'In Progress', count: counts.in_progress },
            { key: 'open' as const, label: 'Intake / Queued', count: counts.open },
            { key: 'complete' as const, label: 'Completed', count: counts.complete },
          ].map((chip) => (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === chip.key
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600'
              }`}
            >
              <span>{chip.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                statusFilter === chip.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Deck ── */}
      {isError ? (
        <ErrorState
          message="Failed to load today's job queue. Please check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !filteredJobs.length ? (
        <EmptyState 
          icon={Briefcase} 
          title={searchQuery || statusFilter !== 'all' ? "No Matching Jobs" : "No Carts in Queue"} 
          description={searchQuery || statusFilter !== 'all' ? "Try adjusting your search terms or filter." : "No job carts have been created for today yet."} 
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job: any, idx: number) => (
            <Link
              key={job.id}
              to={`/staff/job-carts/${job.id}`}
              className="bg-white rounded-2xl shadow-xs hover:shadow-md border border-slate-200/80 p-5 block group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'forwards' }}
            >
              {/* Status color indicator bar */}
              <div className={`absolute top-0 left-0 w-1.5 h-full rounded-r ${
                job.status === 'in_progress' ? 'bg-blue-500' :
                job.status === 'open' ? 'bg-amber-500' :
                job.status === 'complete' || job.status === 'delivered' ? 'bg-emerald-500' : 'bg-slate-300'
              }`} />
              
              <div className="flex justify-between items-start mb-3 ml-2">
                 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  job.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  job.status === 'complete' || job.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                 }`}>
                   {job.status.replace('_', ' ')}
                 </span>
                 <span className="text-slate-400 text-xs font-semibold group-hover:text-[#D32F2F] flex items-center gap-1 transition-colors">
                   View Sheet <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                 </span>
              </div>

              <div className="ml-2">
                <h3 className="font-black text-slate-900 text-lg mb-0.5 group-hover:text-[#D32F2F] transition-colors tracking-tight">
                  {job.registration_no}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mb-3">{job.brand} {job.model}</p>

                <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 mb-3 border border-slate-100">
                  <span className="font-bold text-slate-900 block mb-1 text-[10px] uppercase tracking-wider text-slate-400">Assigned Services</span>
                  <span className="line-clamp-2 font-medium">
                    {job.services_count ? `${job.services_count} Service(s) in progress` : 'No services assigned yet'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    Intake: {new Date(job.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">#JC-{job.id}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
