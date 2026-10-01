import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Trash2, FileText, Clock, CheckCircle2, IndianRupee, ExternalLink } from 'lucide-react';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import EmptyState from '../../components/shared/EmptyState';
import { formatINR, formatDate } from '../../utils/formatters';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmModal from '../../components/ui/ConfirmModal';

// Status Badge Helper
function JobStatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'open' || s === 'in_progress' || s === 'repairing' || s === 'washing') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        In Progress
      </span>
    );
  }
  if (s === 'draft' || s === 'pending') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Draft / Queue
      </span>
    );
  }
  if (s === 'complete' || s === 'completed' || s === 'delivered' || s === 'paid') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-50 text-[#b71c1c] border border-red-200 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]" />
        Completed
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Cancelled
    </span>
  );
}

export default function JobCartListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useJobCarts({ search, status: status === 'all' ? undefined : status, page, limit });
  const queryClient = useQueryClient();
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleDeleteClick = (id: number) => {
    setCancelTargetId(id);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    setCancelling(true);
    try {
      await api.delete(`/job-carts/${cancelTargetId}`);
      toast.success('Job card cancelled');
      setCancelTargetId(null);
      queryClient.invalidateQueries({ queryKey: ['job-carts'] });
    } catch {
      toast.error('Failed to cancel job cart');
    } finally {
      setCancelling(false);
    }
  };

  const statusOptions = [
    { label: 'Status: All ⌵', value: 'all' },
    { label: 'Open / In Bay', value: 'open' },
    { label: 'Draft', value: 'draft' },
    { label: 'Completed', value: 'complete' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const sortOptions = [
    { label: 'Sort: Recent ⌵', value: 'recent' },
    { label: 'Sort: Amount ⌵', value: 'amount' },
  ];

  // Calculate live stats
  const stats = useMemo(() => {
    const list = data?.data || [];
    const total = data?.pagination?.total || list.length;
    const open = list.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;
    const completed = list.filter((c: any) => c.status === 'complete' || c.status === 'completed' || c.status === 'delivered').length;
    const revenue = list.reduce((acc: number, c: any) => acc + (Number(c.total_amount) || 0), 0);

    return { total, open, completed, revenue };
  }, [data]);

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      
      {/* ─── Top Header Bar ────────────────────────────────────────── */}
      <AdminHeaderBar
        title="Job Cards"
        subtitle={`${stats.total} total vehicle job cards in studio`}
      >
        <button
          onClick={() => navigate('/admin/job-carts/new')}
          className="px-4 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <Plus size={15} />
          <span>+ New Job Card</span>
        </button>
      </AdminHeaderBar>

      {/* ─── Top 4 KPI Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <AdminMetricCard
          label="Total Job Cards"
          value={stats.total.toLocaleString()}
          icon={<FileText size={18} />}
          trend="↑ 12.5%"
          variant="red"
        />
        <AdminMetricCard
          label="Active In Bays"
          value={stats.open.toLocaleString()}
          icon={<Clock size={18} />}
          trend="In Progress"
          variant="red"
        />
        <AdminMetricCard
          label="Completed Jobs"
          value={stats.completed.toLocaleString()}
          icon={<CheckCircle2 size={18} />}
          trend="Delivered / Ready"
          variant="emerald"
        />
        <AdminMetricCard
          label="Active Pipeline"
          value={formatINR(stats.revenue)}
          icon={<IndianRupee size={18} />}
          trend="Studio Volume"
          variant="purple"
        />
      </div>

      {/* ─── Main Content Container Card ───────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
        
        {/* Filter Bar */}
        <AdminFilterBar
          searchPlaceholder="Search by reg no, customer, brand, model..."
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          statusValue={status}
          onStatusChange={(s) => { setStatus(s); setPage(1); }}
          statusOptions={statusOptions}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={sortOptions}
        />

        {/* Empty State */}
        {!isLoading && !data?.data?.length ? (
          <EmptyState
            icon={ClipboardList}
            title="No Job Cards Found"
            description={search || status !== 'all' ? 'Try changing your search keywords or status filter' : 'Create your first job card to begin studio workflow'}
            actionLabel={!search && status === 'all' ? '+ New Job Card' : undefined}
            onAction={!search && status === 'all' ? () => navigate('/admin/job-carts/new') : undefined}
          />
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/70">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Visit Date</th>
                    <th className="py-3.5 px-4 text-center">Visit #</th>
                    <th className="py-3.5 px-4 text-center">Services</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="py-4 px-4"><div className="h-4 bg-slate-100 rounded-lg w-full" /></td>
                      </tr>
                    ))
                  ) : (
                    (data?.data || []).map((cart: any) => (
                      <tr
                        key={cart.id}
                        onClick={() => navigate(`/admin/job-carts/${cart.id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <VehicleBrandBadge brand={cart.brand || cart.car_brand} model={cart.model || cart.car_model} showText={false} />
                            <div>
                              <span className="font-black text-slate-900 tracking-tight text-xs block">
                                {cart.registration_no}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {cart.brand || cart.car_brand} {cart.model || cart.car_model}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">{cart.customer_name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{cart.customer_mobile}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {formatDate(cart.visit_date)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            #{cart.visit_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-red-50 text-[#D32F2F] text-[10px] font-bold">
                            {cart.services_count} service(s)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-slate-900 text-xs">
                            {formatINR(cart.total_amount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <JobStatusBadge status={cart.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/admin/job-carts/${cart.id}`)}
                              className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-[#D32F2F] transition-colors"
                              title="View Details"
                            >
                              <ExternalLink size={14} />
                            </button>
                            {cart.status !== 'cancelled' && (
                              <button
                                onClick={() => handleDeleteClick(cart.id)}
                                className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Cancel Job Cart"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="block md:hidden space-y-3">
              {isLoading ? (
                [1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)
              ) : (
                (data?.data || []).map((cart: any) => (
                  <div
                    key={cart.id}
                    onClick={() => navigate(`/admin/job-carts/${cart.id}`)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs active:scale-[0.98] transition-all hover:border-[#D32F2F]/40 relative"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <VehicleBrandBadge brand={cart.brand || cart.car_brand} model={cart.model || cart.car_model} size="sm" showText={false} />
                        <div>
                          <span className="font-black text-xs text-slate-900 tracking-tight block">
                            {cart.registration_no}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {cart.brand || cart.car_brand} {cart.model || cart.car_model}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <JobStatusBadge status={cart.status} />
                        {cart.status !== 'cancelled' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(cart.id); }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 mt-2">
                      <div>
                        <p className="font-bold text-slate-800">{cart.customer_name}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(cart.visit_date)} · Visit #{cart.visit_number}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">{formatINR(cart.total_amount)}</span>
                        <span className="text-[10px] text-slate-400">{cart.services_count} service(s)</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.total > limit && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-semibold px-2">
                <span>Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total}</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 font-bold"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 font-bold text-slate-900">Page {page}</span>
                  <button
                    disabled={page >= Math.ceil(data.pagination.total / limit)}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      <ConfirmModal
        open={cancelTargetId !== null}
        onClose={() => setCancelTargetId(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Job Cart"
        description="Are you sure you want to cancel this job cart? It will be moved to the Recycle Bin."
        confirmText="Cancel Job Cart"
        isDestructive={true}
        loading={cancelling}
      />
    </div>
  );
}
