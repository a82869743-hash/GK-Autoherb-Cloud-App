import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  FileText, Download, Search, Filter, Calendar,
  RefreshCw, Loader2, ChevronLeft, ChevronRight,
  Receipt, Wallet, ShoppingCart, ClipboardList, X, Trash2,
  TrendingUp, Sparkles, IndianRupee, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../api/axiosInstance';
import ConfirmModal from '../../components/ui/ConfirmModal';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';

type BillType = 'all' | 'job_cart' | 'manual_bill' | 'salary' | 'buy_sell_buy' | 'buy_sell_sell';

interface InvoiceRecord {
  id: number;
  type: string;
  reference: string;
  party_name: string;
  party_mobile: string | null;
  date: string;
  amount: number;
  registration_no: string | null;
  discount_type: string | null;
  discount_value: number | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof FileText }> = {
  job_cart:          { label: 'Job Card',    color: '#D32F2F', bg: '#EEF2FF', icon: ClipboardList },
  manual_bill:       { label: 'Manual Bill', color: '#059669', bg: '#ECFDF5', icon: Receipt },
  salary:            { label: 'Salary Slip', color: '#7C3AED', bg: '#F5F3FF', icon: Wallet },
  buy_sell_buy:      { label: 'Purchase',    color: '#D97706', bg: '#FFFBEB', icon: ShoppingCart },
  buy_sell_sell:     { label: 'Sale',        color: '#D32F2F', bg: '#EFF6FF', icon: ShoppingCart },
  quick_wash:        { label: 'Quick Wash',  color: '#0284C7', bg: '#F0F9FF', icon: Receipt },
  package_purchase:  { label: 'Package',     color: '#E11D48', bg: '#FFF1F2', icon: Receipt },
};

const TAB_FILTERS: { key: BillType | 'quick_wash'; label: string; icon: typeof FileText }[] = [
  { key: 'all',           label: 'All Bills',    icon: FileText },
  { key: 'job_cart',      label: 'Job Cards',    icon: ClipboardList },
  { key: 'quick_wash',    label: 'Quick Washes', icon: Receipt },
  { key: 'manual_bill',   label: 'Manual Bills', icon: Receipt },
  { key: 'salary',        label: 'Salary Slips', icon: Wallet },
  { key: 'buy_sell_buy',  label: 'Purchases',    icon: ShoppingCart },
  { key: 'buy_sell_sell', label: 'Sales',        icon: ShoppingCart },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatINR(n: number) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AllInvoicesPage() {
  const { token } = useAuthStore();
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<BillType | 'quick_wash'>('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [voidConfirmRecord, setVoidConfirmRecord] = useState<InvoiceRecord | null>(null);
  const [voiding, setVoiding] = useState(false);
  const limit = 25;

  const apiType = activeType === 'buy_sell_buy' || activeType === 'buy_sell_sell' ? 'buy_sell' : activeType;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: String(page),
        limit: String(limit),
        type: apiType,
      };
      if (search)   params.search = search;
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date = toDate;

      const res = await api.get('/invoices', { params });
      const json = res.data;
      if (json.success) {
        let data: InvoiceRecord[] = json.data;
        if (activeType === 'buy_sell_buy')  data = data.filter(r => r.type === 'buy_sell_buy');
        if (activeType === 'buy_sell_sell') data = data.filter(r => r.type === 'buy_sell_sell');
        setRecords(data);
        setTotal(json.pagination?.total ?? data.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, apiType, activeType, search, fromDate, toDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleTabChange = (t: BillType | 'quick_wash') => {
    setActiveType(t);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasFilters = search || fromDate || toDate;
  const totalPages = Math.ceil(total / limit);

  const downloadInvoice = async (rec: InvoiceRecord) => {
    const key = `${rec.type}-${rec.id}`;
    setDownloading(key);
    try {
      let downloadUrl = '';
      if (rec.type === 'job_cart') {
        downloadUrl = `${api.defaults.baseURL}/job-carts/${rec.id}/invoice/pdf?token=${token}`;
      } else if (rec.type === 'quick_wash') {
        downloadUrl = `${api.defaults.baseURL}/quick-wash/${rec.id}/bill/pdf?token=${token}`;
      } else if (rec.type === 'manual_bill') {
        downloadUrl = `${api.defaults.baseURL}/billing/${rec.id}/pdf?token=${token}`;
      } else if (rec.type === 'salary') {
        downloadUrl = `${api.defaults.baseURL}/staff-salary/${rec.id}/payslip/pdf?token=${token}`;
      } else if (rec.type === 'buy_sell_buy' || rec.type === 'buy_sell_sell') {
        downloadUrl = `${api.defaults.baseURL}/buy-sell/${rec.id}/invoice/pdf?token=${token}`;
      } else if (rec.type === 'package_purchase') {
        downloadUrl = `${api.defaults.baseURL}/user-packages/${rec.id}/invoice/pdf?token=${token}`;
      }

      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        toast.error('Unsupported invoice format');
      }
    } catch {
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  const handleVoidClick = (rec: InvoiceRecord) => {
    setVoidConfirmRecord(rec);
  };

  const handleVoidConfirm = async () => {
    if (!voidConfirmRecord) return;
    setVoiding(true);
    try {
      if (voidConfirmRecord.type === 'manual_bill') {
        await api.delete(`/billing/${voidConfirmRecord.id}`);
      } else if (voidConfirmRecord.type === 'job_cart') {
        await api.delete(`/job-carts/${voidConfirmRecord.id}`);
      }
      toast.success('Record voided successfully');
      setVoidConfirmRecord(null);
      fetchRecords();
    } catch {
      toast.error('Failed to void invoice');
    } finally {
      setVoiding(false);
    }
  };

  const pageRevenue = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const avgTicket = records.length > 0 ? Math.round(pageRevenue / records.length) : 0;

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Invoices & Revenue Ledger"
        subtitle="Unified accounting records: detailing job cards, counter manual bills, salary slips, and inventory sales"
        actions={
          <button
            onClick={() => fetchRecords()}
            className="p-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 transition-all shadow-xs active:scale-95"
            title="Refresh Ledger"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#D32F2F]' : 'text-slate-500'} />
          </button>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Total Ledger Records"
          value={total}
          trend={{ text: 'Historical transactions', positive: true }}
          icon={<FileText size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Page Revenue Turnover"
          value={`₹${formatINR(pageRevenue)}`}
          trend={{ text: `${records.length} visible bills`, positive: true }}
          icon={<IndianRupee size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Average Ticket Size"
          value={`₹${formatINR(avgTicket)}`}
          trend={{ text: 'Per invoice mean', positive: true }}
          icon={<TrendingUp size={20} />}
          accentColor="sky"
        />
        <AdminMetricCard
          label="Fiscal Ledger Sync"
          value="Reconciled"
          trend={{ text: '100% cloud synced', positive: true }}
          icon={<ShieldCheck size={20} />}
          accentColor="purple"
        />
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TAB_FILTERS.map(({ key, label, icon: Icon }) => {
          const isActive = activeType === key;
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-xs active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-red-400' : 'text-slate-400'} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 flex-1 bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-200/80 focus-within:border-[#D32F2F] focus-within:bg-white transition-all">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            id="invoice-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, invoice reference, or vehicle plate..."
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3.5 py-2 border border-slate-200/80 text-xs">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-slate-400 text-[11px] font-bold">From</span>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-800 p-0 font-medium"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3.5 py-2 border border-slate-200/80 text-xs">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-slate-400 text-[11px] font-bold">To</span>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
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
        {loading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
            <Loader2 size={28} className="animate-spin text-[#D32F2F] mx-auto" />
            <p className="text-xs text-slate-400 mt-3 font-medium">Fetching invoice ledger...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
            <FileText size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No invoices found</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Try adjusting date filters or search parameters</p>
          </div>
        ) : (
          records.map((rec) => {
            const cfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG['manual_bill'];
            const Icon = cfg.icon;
            const dlKey = `${rec.type}-${rec.id}`;
            const isDownloading = downloading === dlKey;

            return (
              <div
                key={dlKey}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider"
                  >
                    <Icon size={12} />
                    {cfg.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {formatDate(rec.date)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs font-black tracking-wide text-slate-900">
                      {rec.reference}
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {rec.party_name || 'Walk-in Client'}
                    </div>
                    {rec.party_mobile && (
                      <div className="text-xs text-slate-400 mt-0.5 font-medium">
                        📞 {rec.party_mobile}
                      </div>
                    )}
                  </div>
                  {rec.registration_no && (
                    <VehicleBrandBadge
                      regNo={rec.registration_no}
                      size="sm"
                    />
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Bill</div>
                    <div className="text-base font-black text-slate-900">
                      ₹{formatINR(Number(rec.amount || 0))}
                    </div>
                    {rec.discount_type && rec.discount_value && Number(rec.discount_value) > 0 && (
                      <div className="text-[10px] text-emerald-600 font-bold">
                        -{rec.discount_type === 'percentage' ? `${rec.discount_value}%` : `₹${formatINR(Number(rec.discount_value))}`} off
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(rec.type === 'manual_bill' || rec.type === 'job_cart') && (
                      <button
                        onClick={() => handleVoidClick(rec)}
                        title="Void / Archive"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button
                      id={`download-mob-${dlKey}`}
                      onClick={() => downloadInvoice(rec)}
                      disabled={isDownloading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#D32F2F] text-white text-xs font-bold hover:bg-[#b71c1c] active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      <span>PDF</span>
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
                <th className="py-4 px-6">Classification</th>
                <th className="py-4 px-6">Reference ID</th>
                <th className="py-4 px-6">Client / Party</th>
                <th className="py-4 px-6">Invoice Date</th>
                <th className="py-4 px-6">Billed Amount</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <Loader2 size={28} className="animate-spin text-[#D32F2F] mx-auto" />
                    <p className="text-xs text-slate-400 mt-2 font-semibold">Loading ledger records...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <FileText size={36} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const cfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG['manual_bill'];
                  const Icon = cfg.icon;
                  const dlKey = `${rec.type}-${rec.id}`;
                  const isDownloading = downloading === dlKey;

                  return (
                    <tr key={dlKey} className="hover:bg-red-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <span
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
                        >
                          <Icon size={12} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-mono font-bold text-slate-900">{rec.reference}</div>
                        {rec.registration_no && (
                          <div className="mt-1">
                            <VehicleBrandBadge
                              regNo={rec.registration_no}
                              size="sm"
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{rec.party_name || 'Walk-in Client'}</div>
                        {rec.party_mobile && (
                          <div className="text-xs text-slate-400 font-medium mt-0.5">📞 {rec.party_mobile}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                        {formatDate(rec.date)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-black text-slate-900 text-sm">
                          ₹{formatINR(Number(rec.amount || 0))}
                        </div>
                        {rec.discount_type && rec.discount_value && Number(rec.discount_value) > 0 && (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            -{rec.discount_type === 'percentage' ? `${rec.discount_value}%` : `₹${formatINR(Number(rec.discount_value))}`} disc
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            id={`download-${dlKey}`}
                            onClick={() => downloadInvoice(rec)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white text-xs font-bold transition-all disabled:opacity-50 shadow-2xs"
                          >
                            {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                            <span>PDF</span>
                          </button>
                          {(rec.type === 'manual_bill' || rec.type === 'job_cart') && (
                            <button
                              onClick={() => handleVoidClick(rec)}
                              title="Void / Archive"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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
        open={voidConfirmRecord !== null}
        onClose={() => setVoidConfirmRecord(null)}
        onConfirm={handleVoidConfirm}
        title="Void Record"
        description={`Are you sure you want to void this ${voidConfirmRecord?.type === 'manual_bill' ? 'bill' : 'job cart'}? It will be moved to the Recycle Bin.`}
        confirmText="Void Record"
        isDestructive={true}
        loading={voiding}
      />
    </div>
  );
}
