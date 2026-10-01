import { useState, useMemo } from 'react';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Briefcase, Clock, ChevronRight, PlusCircle, Search, Sparkles, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StaffJobCartsPage() {
  const { data, isLoading, isError, refetch } = useJobCarts({});
  const jobs = data?.data || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'open' | 'complete'>('all');

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-50 border border-red-100 text-[#D32F2F] text-[10px] font-black uppercase tracking-wider">
              Workshop Bays
            </span>
            <span className="text-xs text-slate-400 font-bold">• Today's Floor</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Today's Job Queue
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {jobs.length} vehicle{jobs.length === 1 ? '' : 's'} registered on the workshop floor today
          </p>
        </div>

        <Link
          to="/staff/job-carts/new"
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#af101a] to-[#D32F2F] hover:from-[#b71c1c] hover:to-[#991b1b] text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all text-xs uppercase tracking-wider shrink-0 self-start sm:self-center"
        >
          <PlusCircle size={16} />
          <span>New Job Cart</span>
        </Link>
      </div>

      {/* ── Filter & Search Controls ── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by license plate, car brand, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] shadow-2xs transition-all"
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
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === chip.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600'
              }`}
            >
              <span>{chip.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
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
