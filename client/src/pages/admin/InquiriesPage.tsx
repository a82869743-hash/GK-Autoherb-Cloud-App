import { useState } from 'react';
import { MessageSquare, PhoneCall } from 'lucide-react';
import { useInquiries, useUpdateInquiryStatus, useDeleteInquiry, useConvertInquiry } from '../../api/hooks/useInquiries';
import AdminTopBar from '../../components/layout/AdminTopBar';
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

  return (
    <>
      <AdminTopBar
        title="Customer Inquiries"
        subtitle={`${inquiries.length} leads`}
      />

      <div className="flex items-center gap-3 mb-6">
        <select className="bg-white border border-gray-200 rounded px-3 py-1.5 text-sm" value={filter.status || ''} onChange={e => setFilter({ ...filter, status: e.target.value || undefined })}>
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="followed_up">Followed Up</option>
          <option value="converted">Converted</option>
        </select>
        <select className="bg-white border border-gray-200 rounded px-3 py-1.5 text-sm" value={filter.source || ''} onChange={e => setFilter({ ...filter, source: e.target.value || undefined })}>
          <option value="">All Sources</option>
          <option value="website">Website</option>
          <option value="staff">Staff Walk-ins</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <><SkeletonCard/><SkeletonCard/><SkeletonCard/></>
        ) : !inquiries.length ? (
          <div className="col-span-full">
            <EmptyState icon={MessageSquare} title="No Inquiries" description="There are no inquiries matching your filters" />
          </div>
        ) : (
          inquiries.map((inq: any) => (
            <div key={inq.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transform transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex justify-between items-start mb-3">
                <StatusBadge status={inq.status} />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(inq.id, 'followed_up')} 
                    disabled={inq.status === 'followed_up' || inq.status === 'converted'}
                    className="text-yellow-600 hover:text-yellow-800 disabled:opacity-50 text-xs font-medium"
                  >
                    Follow Up
                  </button>
                  <button 
                    onClick={() => handleConvert(inq.id)} 
                    disabled={inq.status === 'converted' || convertMut.isPending}
                    className="text-green-600 hover:text-green-800 disabled:opacity-50 text-xs font-medium"
                  >
                    Convert
                  </button>
                  <button 
                    onClick={() => setRemoveId(inq.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-[#1c1b1b] text-lg mb-1">{inq.name}</h3>
              <div className="flex items-center gap-2 mb-3 text-sm text-[#5f5e5e]">
                <PhoneCall size={14} /> 
                <a href={`tel:${inq.mobile}`} className="hover:text-[#D32F2F] hover:underline transition">{inq.mobile}</a>
              </div>

              {(inq.vehicle_brand || inq.vehicle_model) && (
                <div className="bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded mb-3">
                  <span className="font-medium">Vehicle:</span> {inq.vehicle_brand} {inq.vehicle_model}
                </div>
              )}

              {inq.services_interested && (
                <p className="text-xs text-gray-600 mb-3"><span className="font-medium text-gray-800 block mb-1">Interested in:</span> {inq.services_interested}</p>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                <span>{inq.source === 'website' ? 'Via Website' : 'Via Staff'}</span>
                <span>{new Date(inq.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog open={!!removeId} onClose={() => setRemoveId(null)} onConfirm={handleDelete}
        title="Delete Inquiry" message="Are you sure you want to remove this inquiry? It cannot be fully restored." confirmLabel="Delete" loading={deleteMut.isPending} />
    </>
  );
}
