import { useState } from 'react';
import { MessageSquare, PhoneCall, Trash2, ArrowRight, UserCheck, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { useInquiries, useUpdateInquiryStatus, useDeleteInquiry, useConvertInquiry } from '../../api/hooks/useInquiries';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/shared/EmptyState';
import { useUIStore } from '../../store/uiStore';
import StatusBadge from '../../components/ui/StatusBadge';

export default function InquiriesPage() {
  const toast = useUIStore((s) => s.toast);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<{ status?: string, source?: string }>({});
  const { data, isLoading } = useInquiries(filter);
  const updateMut = useUpdateInquiryStatus();
  const deleteMut = useDeleteInquiry();
  const convertMut = useConvertInquiry();

  const [removeId, setRemoveId] = useState<number | null>(null);

  const inquiries = data?.data || [];

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateMut.mutateAsync({ id, status });
      toast('success', 'Status updated');
    } catch {
      toast('error', 'Failed to update status');
    }
  };

  const handleConvert = async (id: number) => {
    try {
      const res = await convertMut.mutateAsync(id);
      toast('success', 'Inquiry ready to convert');
      navigate('/admin/job-carts/new', { state: { prefill: res.data } });
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to convert inquiry');
    }
  };

  const handleDelete = async () => {
    if (!removeId) return;
    try {
      await deleteMut.mutateAsync(removeId);
      toast('success', 'Inquiry removed');
    } catch {
      toast('error', 'Failed to remove inquiry');
    }
    setRemoveId(null);
  };

  const newCount = inquiries.filter((i: any) => i.status === 'new').length;
  const followUpCount = inquiries.filter((i: any) => i.status === 'followed_up').length;
  const convertedCount = inquiries.filter((i: any) => i.status === 'converted').length;

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Customer Leads & Detailing Inquiries"
        subtitle="Manage prospective client leads, quote requests, and fast-track job conversion"
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Total Inquiries Received"
          value={inquiries.length}
          trend={{ text: 'Lead Pool', positive: true }}
          icon={<MessageSquare size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="New Leads"
          value={newCount}
          trend={{ text: 'Pending response', positive: true }}
          icon={<Sparkles size={20} />}
          accentColor="sky"
        />
        <AdminMetricCard
          label="Followed Up"
          value={followUpCount}
          trend={{ text: 'In consultation', positive: true }}
          icon={<UserCheck size={20} />}
          accentColor="amber"
        />
        <AdminMetricCard
          label="Converted to Jobs"
          value={convertedCount}
          trend={{ text: 'Active workshops', positive: true }}
          icon={<CheckCircle2 size={20} />}
          accentColor="emerald"
        />
      </div>

      {/* Filter Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
          <Filter size={14} className="text-slate-400" />
          <span>Filter Leads:</span>
        </div>
        <select
          className="bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-red-500/20"
          value={filter.status || ''}
          onChange={e => setFilter({ ...filter, status: e.target.value || undefined })}
        >
          <option value="">All Statuses</option>
          <option value="new">New Inquiries</option>
          <option value="followed_up">Followed Up</option>
          <option value="converted">Converted</option>
        </select>
        <select
          className="bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-red-500/20"
          value={filter.source || ''}
          onChange={e => setFilter({ ...filter, source: e.target.value || undefined })}
        >
          <option value="">All Lead Sources</option>
          <option value="website">Website Portal</option>
          <option value="staff">Studio Walk-in</option>
        </select>
      </div>

      {/* Inquiry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <><SkeletonCard/><SkeletonCard/><SkeletonCard/></>
        ) : !inquiries.length ? (
          <div className="col-span-full rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <EmptyState icon={MessageSquare} title="No Inquiries Found" description="There are no prospective client inquiries matching your active filters" />
          </div>
        ) : (
          inquiries.map((inq: any) => (
            <div
              key={inq.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-red-200 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <StatusBadge status={inq.status} />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2.5 py-1 bg-slate-100 rounded-full border border-slate-200/60">
                    {inq.source === 'website' ? '🌐 Web Lead' : '🚶 Studio Walk-in'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{inq.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <PhoneCall size={13} className="text-[#D32F2F]" />
                    <a href={`tel:${inq.mobile}`} className="hover:text-[#D32F2F] font-bold hover:underline">{inq.mobile}</a>
                  </div>
                </div>

                {(inq.vehicle_brand || inq.vehicle_model) && (
                  <div className="pt-1">
                    <VehicleBrandBadge
                      brand={inq.vehicle_brand}
                      model={inq.vehicle_model}
                      size="sm"
                    />
                  </div>
                )}

                {inq.services_interested && (
                  <div className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wider">Service of Interest:</span>
                    <span className="font-medium text-slate-700">{inq.services_interested}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(inq.id, 'followed_up')}
                    disabled={inq.status === 'followed_up' || inq.status === 'converted'}
                    className="px-3 py-2 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 text-xs font-bold active:scale-95 transition-all shadow-xs"
                  >
                    Follow Up
                  </button>
                  <button
                    onClick={() => handleConvert(inq.id)}
                    disabled={inq.status === 'converted' || convertMut.isPending}
                    className="px-3.5 py-2 rounded-2xl bg-[#D32F2F] text-white disabled:opacity-40 text-xs font-bold hover:bg-[#b71c1c] active:scale-95 transition-all shadow-sm shadow-red-200 flex items-center gap-1.5"
                  >
                    <span>Convert</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
                <button
                  onClick={() => setRemoveId(inq.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 text-xs active:scale-95 transition-all"
                  title="Delete Lead"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog 
        open={!!removeId} 
        onClose={() => setRemoveId(null)} 
        onConfirm={handleDelete}
        title="Delete Inquiry" 
        message="Are you sure you want to remove this prospective inquiry? It will be permanently removed from the pipeline." 
        confirmLabel="Delete Lead" 
        loading={deleteMut.isPending} 
      />
    </div>
  );
}
