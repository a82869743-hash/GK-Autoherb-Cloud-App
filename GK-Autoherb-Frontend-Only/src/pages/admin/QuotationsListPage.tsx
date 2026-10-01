import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Search, Filter, Calendar,
  RefreshCw, Loader2, ChevronLeft, ChevronRight,
  X, Trash2, Plus, Edit, Briefcase, IndianRupee, Sparkles, CheckCircle2, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useQuotations, useDeleteQuotation } from '../../api/hooks/useQuotations';
import api from '../../api/axiosInstance';
import ConfirmModal from '../../components/ui/ConfirmModal';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatINR(n: number) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: '#D97706', bg: '#FFFBEB' },
  sent:     { label: 'Sent',     color: '#D32F2F', bg: '#EFF6FF' },
  accepted: { label: 'Accepted', color: '#059669', bg: '#ECFDF5' },
  declined: { label: 'Declined', color: '#E11D48', bg: '#FFF1F2' },
  converted:{ label: 'Converted',color: '#D32F2F', bg: '#EEF2FF' },
};

export default function QuotationsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [downloading, setDownloading] = useState<number | null>(null);
  const [voidConfirmId, setVoidConfirmId] = useState<number | null>(null);

  const { data: res, isLoading, refetch } = useQuotations({
    page,
    limit,
    status,
    search,
    from_date: fromDate,
    to_date: toDate
  });

  const deleteMutation = useDeleteQuotation();

  const handleDownloadPDF = async (id: number, quotationNumber: string) => {
    setDownloading(id);
    try {
      const resp = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${quotationNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('PDF downloaded successfully');
    } catch (e) {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleVoidConfirm = async () => {
    if (!voidConfirmId) return;
    try {
      await deleteMutation.mutateAsync(voidConfirmId);
      toast.success('Quotation voided (moved to archive)');
      setVoidConfirmId(null);
    } catch (err) {
      toast.error('Failed to void quotation');
    }
  };

  const handleConvertToJobCart = (q: any) => {
    navigate('/admin/job-carts/new', {
      state: {
        prefill: {
          customer_name: q.customer_name,
          customer_mobile: q.customer_mobile,
          customer_email: q.customer_email || '',
          car_brand: q.car_brand || '',
          car_model: q.car_model || '',
          vehicle_reg_no: q.vehicle_no || '',
          notes: `Converted from Quotation #${q.quotation_number}. ${q.notes || ''}`
        }
      }
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const records = res?.data || [];
  const total = res?.pagination?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const hasFilters = search || status || fromDate || toDate;

  const totalPageValue = records.reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);
  const convertedCount = records.filter((r: any) => r.status === 'converted' || r.status === 'accepted').length;

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Estimates & Service Quotations"
        subtitle="Manage detailing proposals, print branded PDFs, and fast-track convert into Job Cards"
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 transition-all shadow-xs active:scale-95"
              title="Refresh Estimates"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin text-[#D32F2F]' : 'text-slate-500'} />
            </button>
            <button
              onClick={() => navigate('/admin/quotations/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs shadow-md shadow-red-200 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>New Quotation</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Total Estimates Created"
          value={total}
          trend={{ text: 'Quote pipeline', positive: true }}
          icon={<FileText size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Estimated Pipeline Value"
          value={`₹${formatINR(totalPageValue)}`}
          trend={{ text: `${records.length} visible quotes`, positive: true }}
          icon={<IndianRupee size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Converted to Jobs"
          value={convertedCount}
          trend={{ text: 'Client approvals', positive: true }}
          icon={<CheckCircle2 size={20} />}
          accentColor="purple"
        />
        <AdminMetricCard
          label="Acceptance Conversion"
          value={records.length > 0 ? `${Math.round((convertedCount / records.length) * 100)}%` : '0%'}
          trend={{ text: 'Proposal win rate', positive: true }}
          icon={<TrendingUp size={20} />}
          accentColor="sky"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 flex-1 bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-200/80 focus-within:border-[#D32F2F] focus-within:bg-white transition-all">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by quote number, customer name, vehicle plate or phone..."
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3.5 py-2 border border-slate-200/80 text-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-800 cursor-pointer font-bold"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="converted">Converted</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3.5 py-2 border border-slate-200/80 text-xs">
            <Calendar size={13} className="text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-800 p-0 font-medium"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold active:scale-95 transition-all shadow-xs"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
            <Loader2 size={28} className="animate-spin text-[#D32F2F] mx-auto" />
            <p className="text-xs text-slate-400 mt-3 font-medium">Loading quotations...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
            <FileText size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No quotations found</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Create a new proposal using the button above</p>
          </div>
        ) : (
          records.map((q: any) => {
            const statusConfig = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
            const isDownloading = downloading === q.id;

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black tracking-wide text-slate-900">
                    #{q.quotation_number}
                  </span>
                  <span
                    style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                    className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide"
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{q.customer_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 font-medium">📞 {q.customer_mobile}</div>
                  </div>
                  {(q.car_brand || q.vehicle_no) && (
                    <VehicleBrandBadge
                      brand={q.car_brand}
                      model={q.car_model}
                      regNo={q.vehicle_no}
                      size="sm"
                    />
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Estimated Total</div>
                    <div className="text-base font-black text-slate-900">
                      ₹{formatINR(Number(q.grand_total))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownloadPDF(q.id, q.quotation_number)}
                      disabled={isDownloading}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-50 transition-all shadow-2xs"
                      title="Download PDF"
                    >
                      {isDownloading ? <Loader2 size={14} className="animate-spin text-[#D32F2F]" /> : <Download size={14} />}
                    </button>

                    <button
                      onClick={() => navigate(`/admin/quotations/edit/${q.id}`)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
                      title="Edit Quotation"
                    >
                      <Edit size={14} />
                    </button>

                    <button
                      onClick={() => handleConvertToJobCart(q)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#D32F2F] text-white text-xs font-bold hover:bg-[#b71c1c] active:scale-95 transition-all shadow-sm"
                    >
                      <Briefcase size={13} />
                      <span>Convert</span>
                    </button>

                    <button
                      onClick={() => setVoidConfirmId(q.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Proposal Ref</th>
                <th className="py-4 px-6">Generated Date</th>
                <th className="py-4 px-6">Customer Dossier</th>
                <th className="py-4 px-6">Vehicle Garage</th>
                <th className="py-4 px-6">Grand Estimate</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <Loader2 size={28} className="animate-spin text-[#D32F2F] mx-auto" />
                    <p className="text-xs text-slate-400 mt-2 font-semibold">Loading proposals...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <FileText size={36} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No quotations found</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Create a new estimate with the New Quotation button</p>
                  </td>
                </tr>
              ) : (
                records.map((q: any) => {
                  const statusConfig = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                  const isDownloading = downloading === q.id;

                  return (
                    <tr key={q.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-slate-900">{q.quotation_number}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                        {formatDate(q.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{q.customer_name}</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">📞 {q.customer_mobile}</div>
                      </td>
                      <td className="py-4 px-6">
                        {(q.car_brand || q.vehicle_no) ? (
                          <VehicleBrandBadge
                            brand={q.car_brand}
                            model={q.car_model}
                            regNo={q.vehicle_no}
                            size="sm"
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">No car specified</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-black text-slate-900 text-sm">
                          ₹{formatINR(Number(q.grand_total))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                          className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide"
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownloadPDF(q.id, q.quotation_number)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white text-xs font-bold transition-all disabled:opacity-50 shadow-2xs"
                          >
                            {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => navigate(`/admin/quotations/edit/${q.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all"
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleConvertToJobCart(q)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-[#b71c1c] border border-red-200 hover:bg-[#D32F2F] hover:text-white text-xs font-bold transition-all"
                          >
                            <Briefcase size={12} />
                            <span>Convert</span>
                          </button>
                          <button
                            onClick={() => setVoidConfirmId(q.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Void / Archive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-xs"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          <span className="text-xs font-bold text-slate-500">
            Page <span className="text-slate-900 font-black">{page}</span> of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-xs"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <ConfirmModal
        open={voidConfirmId !== null}
        onClose={() => setVoidConfirmId(null)}
        onConfirm={handleVoidConfirm}
        title="Void Quotation"
        description="Are you sure you want to void this quotation? It will be archived and removed from active proposals."
        confirmText="Void Quotation"
        isDestructive={true}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
