import { useState } from 'react';
import {
  BarChart3, FileText, Download, Calendar, ShieldAlert,
  Clock, CheckCircle, Package, ArrowUpRight, ArrowDownRight, TrendingUp, Star, Filter, Sparkles
} from 'lucide-react';
import { useSalesReport, useInventoryReport, useJobCardReport, useWelcomeRewardsReport, downloadReport } from '../../api/hooks/useReports';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { PageTransition } from '../../components/ui/Animations';

type TabType = 'sales' | 'inventory' | 'jobcards' | 'welcomerewards' | 'packagehistory';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  
  // Date states for reports
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: firstDayOfMonth, to: today });
  
  // Job card report additional filters
  const [jobCardFilters, setJobCardFilters] = useState({ status: 'all', staff_id: '' });

  // Query Hooks
  const { data: salesData, isLoading: salesLoading } = useSalesReport({
    from_date: dateRange.from,
    to_date: dateRange.to
  });
  
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryReport();
  
  const { data: jobCardData, isLoading: jobCardLoading } = useJobCardReport({
    from_date: dateRange.from,
    to_date: dateRange.to,
    status: jobCardFilters.status,
    staff_id: jobCardFilters.staff_id
  });

  const { data: welcomeRewardsData, isLoading: welcomeRewardsLoading } = useWelcomeRewardsReport();

  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: 'sales' | 'inventory' | 'job-cards' | 'package-history', format: 'xlsx' | 'pdf') => {
    const key = `${type}-${format}`;
    setDownloading(key);
    try {
      const params = type === 'inventory' || type === 'package-history' ? {} : {
        from_date: dateRange.from,
        to_date: dateRange.to,
        ...(type === 'job-cards' ? jobCardFilters : {})
      };
      await downloadReport(type, params, format);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'sales', label: 'Financial Performance', icon: TrendingUp },
    { key: 'jobcards', label: 'Job Cards & Throughput', icon: FileText },
    { key: 'inventory', label: 'Inventory & Consumption', icon: Package },
    { key: 'welcomerewards', label: 'Rewards Ledger', icon: Star },
    { key: 'packagehistory', label: 'Package Archives', icon: ShieldAlert },
  ];

  return (
    <PageTransition className="space-y-6 max-w-[1400px] mx-auto pb-28 lg:pb-12">
      <AdminHeaderBar
        title="Reports & Analytics"
        subtitle="Consolidated studio revenue, job throughput, inventory velocity, and client rewards"
        badge="Executive BI"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload(activeTab === 'sales' ? 'sales' : 'job-cards', 'xlsx')}
              disabled={!!downloading}
              className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <Download size={14} />
              {downloading?.includes('xlsx') ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        }
      />

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`h-11 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date & Dimension Filter Bar */}
      {activeTab !== 'inventory' && activeTab !== 'welcomerewards' && activeTab !== 'packagehistory' && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Calendar size={15} className="text-[#D32F2F]" />
              <span>Period Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                className="h-10 text-xs font-medium border border-slate-200 rounded-2xl px-3.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                className="h-10 text-xs font-medium border border-slate-200 rounded-2xl px-3.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
              />
            </div>

            {activeTab === 'jobcards' && (
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={jobCardFilters.status}
                  onChange={(e) => setJobCardFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="h-10 text-xs font-bold border border-slate-200 rounded-2xl px-3.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F]"
                >
                  <option value="all">All Stages</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload(activeTab === 'sales' ? 'sales' : 'job-cards', 'xlsx')}
              className="h-10 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5"
              disabled={!!downloading}
            >
              <Download size={14} />
              {downloading === `${activeTab === 'sales' ? 'sales' : 'job-cards'}-xlsx` ? 'Generating...' : 'XLSX'}
            </button>
            {activeTab === 'sales' && (
              <button
                onClick={() => handleDownload('sales', 'pdf')}
                className="h-10 px-4 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5"
                disabled={!!downloading}
              >
                <FileText size={14} />
                {downloading === 'sales-pdf' ? 'Generating...' : 'PDF'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* SALES TAB */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {salesLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-3xl" />
              ))}
            </div>
          ) : salesData?.success ? (
            <>
              {/* Financial Metric Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminMetricCard
                  title="Total Revenue"
                  value={`₹${Number(salesData.data.summary.total_income).toLocaleString('en-IN')}`}
                  subtitle="Gross studio inflow"
                  icon={ArrowUpRight}
                  variant="emerald"
                  trend={{ text: "Gross Inflow", positive: true }}
                />
                <AdminMetricCard
                  title="Total Expenses"
                  value={`₹${Number(salesData.data.summary.total_expenses).toLocaleString('en-IN')}`}
                  subtitle="Vendor & studio overhead"
                  icon={ArrowDownRight}
                  variant="rose"
                  trend={{ text: "Operational Outflow", positive: false }}
                />
                <AdminMetricCard
                  title="Job Card Sales"
                  value={`₹${Number(salesData.data.summary.job_revenue).toLocaleString('en-IN')}`}
                  subtitle="Detailing, PPF & Coatings"
                  icon={FileText}
                  variant="red"
                  trend="Core workshop services"
                />
                <AdminMetricCard
                  title="Product Sales"
                  value={`₹${Number(Number(salesData.data.summary.b2b_sales) + Number(salesData.data.summary.b2c_sales)).toLocaleString('en-IN')}`}
                  subtitle="B2B & Retail Chem sales"
                  icon={Package}
                  variant="amber"
                  trend="Merchandise & chemical stock"
                />
              </div>

              {/* Daily Ledger Breakdown Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Daily Cash Flow Ledger</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Day-by-day revenue vs expense reconciliation</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                    {salesData.data.daily.length} Operating Days
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4 pl-6">Posting Date</th>
                        <th className="p-4 text-right">Gross Inflow</th>
                        <th className="p-4 text-right">Gross Outflow</th>
                        <th className="p-4 pr-6 text-right">Net Daily Cash Flow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {salesData.data.daily.map((day: any, i: number) => {
                        const netNum = Number(day.net);
                        return (
                          <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4 pl-6 font-bold text-slate-800">
                              {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-4 text-right text-emerald-600 font-bold">
                              +₹{Number(day.income).toLocaleString('en-IN')}
                            </td>
                            <td className="p-4 text-right text-rose-600 font-bold">
                              -₹{Number(day.expenses).toLocaleString('en-IN')}
                            </td>
                            <td className={`p-4 pr-6 text-right font-black ${netNum >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {netNum >= 0 ? '+' : ''}₹{netNum.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                      {!salesData.data.daily.length && (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-slate-400">
                            No ledger transactions recorded in this selected timeframe
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-rose-50 text-rose-700 p-5 rounded-3xl border border-rose-200 text-sm font-semibold">
              Failed to load sales analytics data.
            </div>
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {inventoryLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-28 bg-slate-100 rounded-3xl" />
              <div className="h-80 bg-slate-100 rounded-3xl" />
            </div>
          ) : inventoryData?.success ? (
            <>
              {/* Summary Header Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AdminMetricCard
                  title="Catalog SKU Count"
                  value={inventoryData.data.total_items}
                  subtitle="Active stock articles"
                  icon={Package}
                  variant="red"
                  trend="Studio stock warehouse"
                />
                <AdminMetricCard
                  title="Restock Alerts"
                  value={inventoryData.data.low_stock_count}
                  subtitle="SKUs below threshold"
                  icon={ShieldAlert}
                  variant={inventoryData.data.low_stock_count > 0 ? "rose" : "emerald"}
                  trend={inventoryData.data.low_stock_count > 0 ? "Reorder recommended" : "All optimal"}
                />
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inventory Export</span>
                    <h4 className="text-sm font-extrabold text-slate-800 mt-1">Audit Ledger Download</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Export full stock valuation & batch count</p>
                  </div>
                  <button
                    onClick={() => handleDownload('inventory', 'xlsx')}
                    className="h-10 px-4 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 mt-4"
                    disabled={!!downloading}
                  >
                    <Download size={14} />
                    {downloading === 'inventory-xlsx' ? 'Exporting...' : 'Export Stock CSV/XLSX'}
                  </button>
                </div>
              </div>

              {/* Two Column Grid: Stock Levels & Usage */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                      <Package className="text-[#D32F2F]" size={18} />
                      Stock Status Table
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0">
                          <th className="p-4 pl-6">Item Name</th>
                          <th className="p-4 text-right">Available Qty</th>
                          <th className="p-4 pr-6 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {inventoryData.data.stock.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4 pl-6 font-bold text-slate-800">{item.product_name}</td>
                            <td className="p-4 text-right font-black text-slate-900">{item.quantity} {item.unit}</td>
                            <td className="p-4 pr-6 text-center">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                item.is_low_stock
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {item.is_low_stock ? 'Low Stock' : 'In Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <h3 className="font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Clock className="text-[#D32F2F]" size={18} />
                    Top Chemical Velocity (30d)
                  </h3>
                  <div className="space-y-3">
                    {inventoryData.data.usage_last_30_days.map((usage: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-700 font-bold truncate max-w-[170px]">{usage.product_name}</span>
                        <span className="font-black text-[#b71c1c] shrink-0 bg-red-50 px-2.5 py-1 rounded-xl border border-red-100">
                          {usage.total_used} units
                        </span>
                      </div>
                    ))}
                    {!inventoryData.data.usage_last_30_days.length && (
                      <p className="text-xs text-slate-400 text-center py-10">No chemical usage recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-rose-50 text-rose-700 p-5 rounded-3xl border border-rose-200 text-sm font-semibold">
              Failed to load inventory intelligence.
            </div>
          )}
        </div>
      )}

      {/* JOB CARDS TAB */}
      {activeTab === 'jobcards' && (
        <div className="space-y-6">
          {jobCardLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-24 bg-slate-100 rounded-3xl" />
                <div className="h-24 bg-slate-100 rounded-3xl" />
                <div className="h-24 bg-slate-100 rounded-3xl" />
              </div>
              <div className="h-80 bg-slate-100 rounded-3xl" />
            </div>
          ) : jobCardData?.success ? (
            <>
              {/* Job Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AdminMetricCard
                  title="Total Job Cards"
                  value={jobCardData.data.total_jobs}
                  subtitle="Vehicles serviced in period"
                  icon={FileText}
                  variant="red"
                  trend="Studio workshop entries"
                />
                <AdminMetricCard
                  title="Total Billing Volume"
                  value={`₹${Number(jobCardData.data.total_revenue).toLocaleString('en-IN')}`}
                  subtitle="Labor, chemicals & coatings"
                  icon={ArrowUpRight}
                  variant="emerald"
                  trend="Completed job turnover"
                />
                <AdminMetricCard
                  title="Completed & Delivered"
                  value={Number(jobCardData.data.status_breakdown.completed || 0) + Number(jobCardData.data.status_breakdown.delivered || 0)}
                  subtitle="Vehicles returned to client"
                  icon={CheckCircle}
                  variant="sky"
                  trend="Fulfillment efficiency"
                />
              </div>

              {/* Job Card Log Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-base">Completed Job Card Records</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4 pl-6">Visit Info</th>
                        <th className="p-4">Vehicle</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Services Rendered</th>
                        <th className="p-4 text-right">Total Amount</th>
                        <th className="p-4 pr-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {jobCardData.data.jobs.map((job: any) => (
                        <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="font-extrabold text-slate-900">Visit #{job.visit_number}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{new Date(job.visit_date).toLocaleDateString('en-IN')}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{job.registration_no}</div>
                            <div className="text-[11px] text-slate-500">{job.brand} {job.model}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{job.customer_name}</div>
                            <div className="text-xs text-slate-400 font-medium">{job.customer_mobile}</div>
                          </td>
                          <td className="p-4 max-w-xs truncate text-xs text-slate-600 font-medium" title={job.services_done}>
                            {job.services_done || 'Standard Studio Detailing'}
                          </td>
                          <td className="p-4 text-right font-black text-slate-900">₹{Number(job.total_amount).toLocaleString('en-IN')}</td>
                          <td className="p-4 pr-6 text-center">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              job.status === 'delivered' ? 'bg-red-50 text-[#b71c1c] border border-red-200' :
                              job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              job.status === 'in_progress' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!jobCardData.data.jobs.length && (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400">
                            No job cards found matching the criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-rose-50 text-rose-700 p-5 rounded-3xl border border-rose-200 text-sm font-semibold">
              Failed to load job cards analytics.
            </div>
          )}
        </div>
      )}

      {/* REWARDS LEDGER TAB */}
      {activeTab === 'welcomerewards' && (
        <div className="space-y-6">
          {welcomeRewardsLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-80 bg-slate-100 rounded-3xl" />
            </div>
          ) : welcomeRewardsData?.success ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Welcome Reward & Loyalty Ledger</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track reward grants, redemption status, and expirations</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Customer</th>
                      <th className="p-4">Awarded Benefits</th>
                      <th className="p-4">Description</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Expiry Date</th>
                      <th className="p-4 pr-6 text-center">Issued At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {welcomeRewardsData.data.map((r: any, idx: number) => {
                      const isExpired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="font-bold text-slate-900">{r.customer_name || `Customer #${r.customer_id}`}</div>
                            <div className="text-[10px] text-slate-400">{r.customer_mobile || ''}</div>
                          </td>
                          <td className="p-4">
                            {r.points_awarded > 0 && (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-extrabold text-xs">
                                <Star size={12} className="fill-amber-500 text-amber-500" /> {r.points_awarded} pts
                              </span>
                            )}
                            {r.discount_pct > 0 && (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold ml-2">
                                {r.discount_pct}% Off
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-600 text-xs font-medium">{r.description || 'Welcome onboarding bonus'}</td>
                          <td className="p-4 text-center">
                            {r.redeemed ? (
                              <span className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black uppercase tracking-wider">
                                Redeemed
                              </span>
                            ) : isExpired ? (
                              <span className="text-[10px] px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-black uppercase tracking-wider">
                                Expired
                              </span>
                            ) : (
                              <span className="text-[10px] px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full font-black uppercase tracking-wider">
                                Active Valid
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center text-xs text-slate-500 font-medium">
                            {r.expires_at ? new Date(r.expires_at).toLocaleDateString('en-IN') : 'Lifetime'}
                          </td>
                          <td className="p-4 pr-6 text-center text-xs text-slate-400">
                            {new Date(r.created_at).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                    {!welcomeRewardsData.data.length && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          No welcome reward logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 text-rose-700 p-5 rounded-3xl border border-rose-200 text-sm font-semibold">
              Failed to load welcome rewards data.
            </div>
          )}
        </div>
      )}

      {/* PACKAGE HISTORY ARCHIVE TAB */}
      {activeTab === 'packagehistory' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-xl mx-auto space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 border border-red-100 text-[#D32F2F] rounded-3xl flex items-center justify-center shadow-inner">
              <Package size={28} />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-900">Export Customer Package History</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Download consolidated logs of all assigned customer detailing packages, including service consumption, pricing segmentations, and active/expired status flags.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => handleDownload('package-history', 'xlsx')}
                className="h-11 px-6 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <Download size={14} /> Export XLSX Spreadsheet
              </button>
              <button
                onClick={() => handleDownload('package-history', 'pdf')}
                className="h-11 px-6 bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
              >
                <Download size={14} /> Export PDF Report
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
