import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Users, ClipboardList, Receipt, Loader2, RefreshCw } from 'lucide-react';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';

type Tab = 'customers' | 'jobCarts' | 'bills';

export default function ArchivePage() {
  const [tab, setTab] = useState<Tab>('customers');
  const [data, setData] = useState<any>({ customers: [], jobCarts: [], bills: [] });
  const [loading, setLoading] = useState(true);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await api.get('/archive');
      if (res.data.success) setData(res.data.data);
    } catch {
      toast.error('Failed to load archived records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArchived(); }, []);

  const restore = async (type: string, id: number) => {
    try {
      if (type === 'customer') await api.post(`/customers/${id}/restore`);
      else if (type === 'jobCart') await api.post(`/job-carts/${id}/restore`);
      else if (type === 'bill') await api.post(`/billing/${id}/restore`);
      toast.success('Record restored successfully');
      fetchArchived();
    } catch {
      toast.error('Failed to restore record');
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Users; count: number }[] = [
    { key: 'customers', label: 'Archived Customers', icon: Users, count: data.customers?.length || 0 },
    { key: 'jobCarts', label: 'Cancelled Job Cards', icon: ClipboardList, count: data.jobCarts?.length || 0 },
    { key: 'bills', label: 'Voided Invoices', icon: Receipt, count: data.bills?.length || 0 },
  ];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1400px] mx-auto">
      <AdminHeaderBar
        title="Recycle Bin & Archive"
        subtitle="Safely recover accidentally deleted clients, voided invoices, or closed jobs"
        badge="Data Safety"
        actions={
          <button
            onClick={fetchArchived}
            className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminMetricCard
          title="Archived Customers"
          value={data.customers?.length || 0}
          subtitle="Profiles eligible for recovery"
          icon={Users}
          variant="red"
          trend="Recoverable"
        />
        <AdminMetricCard
          title="Cancelled Job Cards"
          value={data.jobCarts?.length || 0}
          subtitle="Voided studio jobs"
          icon={ClipboardList}
          variant="amber"
          trend="Reactivable"
        />
        <AdminMetricCard
          title="Voided Invoices"
          value={data.bills?.length || 0}
          subtitle="Cancelled billings"
          icon={Receipt}
          variant="rose"
          trend="Auditable"
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-11 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2.5 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-[#D32F2F]" size={32} />
          </div>
        ) : (
          <>
            {/* Customers */}
            {tab === 'customers' && (
              <div>
                {(!data.customers || data.customers.length === 0) ? (
                  <div className="text-center py-20 text-slate-400 p-6">
                    <Trash2 size={36} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-800 font-bold text-base">No archived customers</p>
                    <p className="text-slate-400 text-xs mt-1">Deleted customer profiles will be held here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="p-4 pl-6">Customer Name</th>
                          <th className="p-4">Contact Phone</th>
                          <th className="p-4">Archived Date</th>
                          <th className="p-4 pr-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.customers.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4 pl-6 font-bold text-slate-900">{c.name}</td>
                            <td className="p-4 font-mono text-xs text-slate-600">{c.mobile || '—'}</td>
                            <td className="p-4 text-slate-500 text-xs font-medium">{formatDate(c.created_at)}</td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => restore('customer', c.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
                              >
                                <RotateCcw size={12} /> Restore Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Job Carts */}
            {tab === 'jobCarts' && (
              <div>
                {(!data.jobCarts || data.jobCarts.length === 0) ? (
                  <div className="text-center py-20 text-slate-400 p-6">
                    <Trash2 size={36} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-800 font-bold text-base">No cancelled job carts</p>
                    <p className="text-slate-400 text-xs mt-1">Voided vehicle job cards will be held here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="p-4 pl-6">Vehicle Registration</th>
                          <th className="p-4">Customer Name</th>
                          <th className="p-4">Job Date</th>
                          <th className="p-4 pr-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.jobCarts.map((jc: any) => (
                          <tr key={jc.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4 pl-6">
                              <span className="font-mono font-bold text-slate-900">{jc.registration_no}</span>
                              <p className="text-xs text-slate-400">{jc.brand} {jc.model}</p>
                            </td>
                            <td className="p-4 font-medium text-slate-800">{jc.customer_name}</td>
                            <td className="p-4 text-slate-500 text-xs font-medium">{formatDate(jc.visit_date || jc.created_at)}</td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => restore('jobCart', jc.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
                              >
                                <RotateCcw size={12} /> Restore Job Card
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Bills */}
            {tab === 'bills' && (
              <div>
                {(!data.bills || data.bills.length === 0) ? (
                  <div className="text-center py-20 text-slate-400 p-6">
                    <Trash2 size={36} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-800 font-bold text-base">No voided billing invoices</p>
                    <p className="text-slate-400 text-xs mt-1">Archived or cancelled bills will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="p-4 pl-6">Invoice #</th>
                          <th className="p-4">Customer Name</th>
                          <th className="p-4">Invoice Amount</th>
                          <th className="p-4">Voided Date</th>
                          <th className="p-4 pr-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.bills.map((b: any) => (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4 pl-6 font-bold text-slate-900 font-mono">MB-{b.id}</td>
                            <td className="p-4 font-medium text-slate-700">{b.customer_name || 'Walk-in'}</td>
                            <td className="p-4 font-black text-slate-900">₹{Number(b.amount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-4 text-slate-500 text-xs font-medium">{formatDate(b.created_at)}</td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => restore('bill', b.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
                              >
                                <RotateCcw size={12} /> Restore Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
