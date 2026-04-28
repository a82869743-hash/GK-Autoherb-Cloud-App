import { useJobCarts } from '../../api/hooks/useJobCarts';
import AdminTopBar from '../../components/layout/AdminTopBar';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/shared/EmptyState';
import { Briefcase, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StaffJobCartsPage() {
  const { data, isLoading } = useJobCarts({});
  const jobs = data?.data || [];
  const activeJobs = jobs.filter((j: any) => j.status !== 'completed' && j.status !== 'delivered');

  return (
    <>
      <AdminTopBar title="My Assigned Jobs" subtitle={`${activeJobs.length} vehicles currently in progress`} />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><SkeletonCard/><SkeletonCard/><SkeletonCard/></div>
      ) : !activeJobs.length ? (
        <EmptyState icon={Briefcase} title="No Active Jobs" description="You don't have any pending job carts assigned." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeJobs.map((job: any, idx: number) => (
            <Link
              key={job.id}
              to={`/admin/job-carts/${job.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 card-premium block group relative overflow-hidden opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
            >
              {/* Status color bar */}
              <div className={`absolute top-0 left-0 w-1 h-full rounded-r ${
                job.status === 'in_progress' ? 'bg-blue-500' : job.status === 'open' ? 'bg-orange-500' : 'bg-gray-300'
              }`} />
              
              <div className="flex justify-between items-start mb-3 ml-2">
                 <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                  job.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                 }`}>
                   {job.status.replace('_', ' ')}
                 </span>
                 <span className="text-gray-400 text-xs font-medium group-hover:text-[#D32F2F] flex items-center gap-1 transition-colors">
                   View <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                 </span>
              </div>

              <div className="ml-2">
                <h3 className="font-bold text-[#1c1b1b] text-lg mb-1 group-hover:text-[#D32F2F] transition-colors">{job.registration_no}</h3>
                <p className="text-sm text-[#5f5e5e] mb-4">{job.brand} {job.model}</p>

                <div className="bg-[#faf7f5] p-3 rounded-lg text-sm text-gray-600 mb-4 border border-gray-100">
                  <span className="font-medium text-gray-800 block mb-1 text-xs uppercase tracking-wider">Services Needed:</span>
                  {job.items?.filter((i: any) => i.item_type === 'service').map((i: any) => i.name).join(', ') || 'Various services'}
                </div>

                <div className="mt-4 flex items-center text-xs text-gray-400 font-medium tracking-wide">
                  <Clock size={14} className="mr-1.5" />
                  Est. Completion: {job.estimated_completion ? new Date(job.estimated_completion).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
