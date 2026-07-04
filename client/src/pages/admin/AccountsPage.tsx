import { useState } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Clock, Download, Package, Calendar, Briefcase, RefreshCw, CheckCircle2, ChevronRight, BarChart3, Receipt, FileText } from 'lucide-react';
import { useAccountSummary, useTransactions, useExportReport, useAccountKPIs } from '../../api/hooks/useAccounts';
import { useUIStore } from '../../store/uiStore';
import PremiumPageHeader from '../../components/shared/PremiumPageHeader';
import PremiumStatCard from '../../components/shared/PremiumStatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useNavigate } from 'react-router-dom';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import { useBuySellList, useCompleteBuySell } from '../../api/hooks/useBuySell';
import { useInventory } from '../../api/hooks/useInventory';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatINR, formatDate } from '../../utils/formatters';

export default function AccountsPage() {
  const toast = useUIStore(s => s.toast);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  
  const [dateFilter, setDateFilter] = useState({
    from_date: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
  });

  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useAccountSummary(dateFilter);
  const { data: kpiData, isLoading: isKpiLoading, refetch: refetchKPI } = useAccountKPIs(dateFilter);
  const { data: txns, isLoading: isTxnsLoading, refetch: refetchTxns } = useTransactions({ limit: 100, ...dateFilter });
  
  const exportMutation = useExportReport();

  const [showExport, setShowExport] = useState(false);
  const [exportForm, setExportForm] = useState({ 
    from_date: new Date(new Date().setDate(1)).toISOString().slice(0,10), 
    to_date: new Date().toISOString().slice(0,10), 
    format: 'excel' as 'excel' | 'pdf' 
  });

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync(exportForm);
      toast('success', 'Report downloaded successfully');
      setShowExport(false);
    } catch(err: any) {
      toast('error', 'Failed to generate report');
    }
  };

  const { data: jobCarts, isLoading: isJobCartsLoading, refetch: refetchJobCarts } = useJobCarts({ page: 1, limit: 100, ...dateFilter });
  const { data: buySell, isLoading: isBuySellLoading, refetch: refetchBuySell } = useBuySellList({ page: 1, limit: 100, ...dateFilter });
  const { data: inventory, isLoading: isInventoryLoading } = useInventory({ page: 1, limit: 100 });
  const completeBuySellMutation = useCompleteBuySell();

  const handleCompleteBs = async (id: number) => {
    try {
      await completeBuySellMutation.mutateAsync(id);
      toast('success', 'Transaction marked complete');
      refetchSummary();
      refetchKPI();
      refetchBuySell();
      refetchTxns();
    } catch(err: any) {
      toast('error', 'Failed to complete transaction');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <PremiumPageHeader
        title="Consolidated Financial Command"
        subtitle="Consolidated financial overview of revenue streams, vendor ledgers, inventory assets, and payroll cycles."
        icon={BarChart3}
        iconColor="#10B981"
        accentGradient="from-emerald-600 to-teal-600"
        actions={
          <Button variant="primary" onClick={() => setShowExport(true)} className="shadow-lg shadow-emerald-500/20">
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        }
      />

      {/* Date Filter & Tab Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <Tabs 
          tabs={[
            { key: 'summary', label: 'Summary Overview' },
            { key: 'transactions', label: 'General Ledger' },
            { key: 'buy_sell', label: 'Buy & Sell Trade' },
            { key: 'job_carts', label: 'Service Job Carts' },
            { key: 'inventory', label: 'Inventory Capital' },
          ]} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        <div className="flex items-center gap-2 border border-gray-100 p-1.5 bg-gray-50 rounded-lg shrink-0">
          <span className="text-[11px] font-bold text-gray-400 uppercase px-2">Period</span>
          <input
            type="date"
            className="px-2 py-1 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={dateFilter.from_date}
            onChange={e => setDateFilter({...dateFilter, from_date: e.target.value})}
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            className="px-2 py-1 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={dateFilter.to_date}
            onChange={e => setDateFilter({...dateFilter, to_date: e.target.value})}
          />
        </div>
      </div>

      {/* Tab Content: Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-fade-in">
          {isSummaryLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Computing summaries...</p>
            </div>
          ) : (
            <>
              {/* Row 1 Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <PremiumStatCard
                  title="Today's Revenue"
                  value={summary?.today_revenue || 0}
                  prefix="₹"
                  icon={IndianRupee}
                  color="#10B981"
                  gradient="from-emerald-500/10 to-teal-400/5"
                  delay={0.1}
                />
                <PremiumStatCard
                  title="Period Revenue"
                  value={summary?.month_revenue || 0}
                  prefix="₹"
                  icon={TrendingUp}
                  color="#2563EB"
                  gradient="from-blue-500/10 to-indigo-400/5"
                  delay={0.2}
                />
                <PremiumStatCard
                  title="Period Procurements"
                  value={summary?.total_purchases_month || 0}
                  prefix="₹"
                  icon={TrendingDown}
                  color="#EF4444"
                  gradient="from-red-500/10 to-rose-400/5"
                  delay={0.3}
                />
                <PremiumStatCard
                  title="Pending Salaries"
                  value={summary?.pending_staff_payments || 0}
                  prefix="₹"
                  icon={Clock}
                  color="#F59E0B"
                  gradient="from-amber-500/10 to-yellow-400/5"
                  delay={0.4}
                />
              </div>

              {/* Row 2 Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PremiumStatCard
                  title="B2B Bulk Sales"
                  value={summary?.total_b2b_sales_month || 0}
                  prefix="₹"
                  icon={TrendingUp}
                  color="#8B5CF6"
                  gradient="from-purple-500/10 to-indigo-400/5"
                  delay={0.1}
                />
                <PremiumStatCard
                  title="B2C Retail Sales"
                  value={summary?.total_b2c_sales_month || 0}
                  prefix="₹"
                  icon={TrendingUp}
                  color="#EC4899"
                  gradient="from-pink-500/10 to-rose-400/5"
                  delay={0.2}
                />
                <PremiumStatCard
                  title="Active Job Carts"
                  value={summary?.open_job_carts || 0}
                  icon={Briefcase}
                  color="#6B7280"
                  gradient="from-gray-500/10 to-slate-400/5"
                  delay={0.3}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: Transactions Ledger */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-fade-in">
          {isTxnsLoading || isKpiLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Reconciling Ledger...</p>
            </div>
          ) : (
            <>
              {/* Ledger KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PremiumStatCard
                  title="Total Cash Inflow"
                  value={kpiData?.ledger?.total_in || 0}
                  prefix="₹"
                  icon={TrendingUp}
                  color="#10B981"
                  gradient="from-emerald-500/10 to-teal-400/5"
                  delay={0.1}
                />
                <PremiumStatCard
                  title="Total Cash Outflow"
                  value={kpiData?.ledger?.total_out || 0}
                  prefix="₹"
                  icon={TrendingDown}
                  color="#EF4444"
                  gradient="from-red-500/10 to-rose-400/5"
                  delay={0.2}
                />
                <PremiumStatCard
                  title="Net Financial Flow"
                  value={kpiData?.ledger?.net_flow || 0}
                  prefix="₹"
                  icon={IndianRupee}
                  color={(kpiData?.ledger?.net_flow || 0) >= 0 ? '#10B981' : '#EF4444'}
                  gradient={(kpiData?.ledger?.net_flow || 0) >= 0 ? 'from-emerald-500/10 to-teal-400/5' : 'from-red-500/10 to-rose-400/5'}
                  delay={0.3}
                />
              </div>

              {/* Ledger Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Ledger Records</span>
                  <Receipt size={16} className="text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Transaction Date</th>
                        <th className="p-4">Source Category</th>
                        <th className="p-4">Cashflow Direction</th>
                        <th className="p-4">Total Amount</th>
                        <th className="p-4">Audit Note</th>
                        <th className="p-4">Processed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(txns?.data || []).map((row: any) => {
                        const isIn = row.direction === 'in';
                        return (
                          <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-medium text-gray-600">
                              {new Date(row.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-4 font-bold text-gray-900 uppercase text-xs">
                              {row.type.replace(/_/g, ' ')}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isIn ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
                              }`}>
                                {isIn ? 'INFLOW ↑' : 'OUTFLOW ↓'}
                              </span>
                            </td>
                            <td className={`p-4 font-black ${isIn ? 'text-green-700' : 'text-red-700'}`}>
                              {formatINR(row.amount)}
                            </td>
                            <td className="p-4 text-gray-500 text-xs font-medium">
                              {row.note || '—'}
                            </td>
                            <td className="p-4 text-gray-600 font-semibold text-xs">
                              {row.created_by_name || 'System Auto'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: Buy & Sell */}
      {activeTab === 'buy_sell' && (
        <div className="space-y-6 animate-fade-in">
          {isBuySellLoading || isKpiLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Loading trade ledger...</p>
            </div>
          ) : (
            <>
              {/* Buy Sell KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PremiumStatCard
                  title="Procured Materials Value"
                  value={kpiData?.buy_sell?.total_purchases || 0}
                  prefix="₹"
                  icon={TrendingDown}
                  color="#EF4444"
                  gradient="from-red-500/10 to-rose-400/5"
                  delay={0.1}
                />
                <PremiumStatCard
                  title="Trade Revenue (Sales)"
                  value={kpiData?.buy_sell?.total_sales || 0}
                  prefix="₹"
                  icon={TrendingUp}
                  color="#10B981"
                  gradient="from-emerald-500/10 to-teal-400/5"
                  delay={0.2}
                />
                <PremiumStatCard
                  title="Pending Receivables"
                  value={kpiData?.buy_sell?.pending_value || 0}
                  prefix="₹"
                  icon={Clock}
                  color="#F59E0B"
                  gradient="from-amber-500/10 to-yellow-400/5"
                  delay={0.3}
                />
              </div>

              {/* Buy Sell Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">B2B / B2C Trade Ledger</span>
                  <FileText size={16} className="text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Date</th>
                        <th className="p-4">Transaction Type</th>
                        <th className="p-4">Counterparty Name</th>
                        <th className="p-4">Product details</th>
                        <th className="p-4">Volume</th>
                        <th className="p-4">Gross total</th>
                        <th className="p-4">Current Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(buySell?.data || []).map((row: any) => {
                        let badgeColor = '';
                        let typeLabel = '';
                        if (row.type === 'buy') {
                          badgeColor = 'text-red-700 bg-red-50 border-red-200';
                          typeLabel = 'BUY';
                        } else if (row.type === 'sell_b2b') {
                          badgeColor = 'text-blue-700 bg-blue-50 border-blue-200';
                          typeLabel = 'SELL (B2B)';
                        } else {
                          badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                          typeLabel = 'SELL (B2C)';
                        }

                        return (
                          <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-medium text-gray-600">
                              {new Date(row.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                                {typeLabel}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-gray-900">
                              {row.party_name}
                            </td>
                            <td className="p-4 text-gray-700 font-medium">
                              {row.product_name}
                            </td>
                            <td className="p-4 font-bold text-gray-900">
                              {row.quantity}
                            </td>
                            <td className="p-4 font-black text-gray-900">
                              {formatINR(row.total_amount)}
                            </td>
                            <td className="p-4">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="p-4 text-right">
                              {row.status === 'pending' ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleCompleteBs(row.id)}
                                  loading={completeBuySellMutation.isPending}
                                >
                                  Complete
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-xs font-bold uppercase">Settled</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: Job Carts */}
      {activeTab === 'job_carts' && (
        <div className="space-y-6 animate-fade-in">
          {isJobCartsLoading || isKpiLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Analyzing job carts...</p>
            </div>
          ) : (
            <>
              {/* Job Carts KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PremiumStatCard
                  title="Total Workshop Pipeline"
                  value={kpiData?.job_carts?.total_value || 0}
                  prefix="₹"
                  icon={IndianRupee}
                  color="#2563EB"
                  gradient="from-blue-500/10 to-indigo-400/5"
                  delay={0.1}
                />
                <PremiumStatCard
                  title="Settled Revenue"
                  value={kpiData?.job_carts?.completed_value || 0}
                  prefix="₹"
                  icon={CheckCircle2}
                  color="#10B981"
                  gradient="from-emerald-500/10 to-teal-400/5"
                  delay={0.2}
                />
                <PremiumStatCard
                  title="Active Workshop Carts"
                  value={kpiData?.job_carts?.open_count || 0}
                  icon={Briefcase}
                  color="#F59E0B"
                  gradient="from-amber-500/10 to-yellow-400/5"
                  delay={0.3}
                />
              </div>

              {/* Job Carts Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Service Workshop Operations</span>
                  <Briefcase size={16} className="text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Job ID</th>
                        <th className="p-4">Vehicle Details</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Visit Date</th>
                        <th className="p-4">Gross Revenue</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(jobCarts?.data || []).map((row: any) => {
                        return (
                          <tr key={row.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/job-carts/${row.id}`)}>
                            <td className="p-4 font-mono text-xs text-gray-400">
                              #JC-{String(row.id).padStart(4, '0')}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{row.registration_no}</span>
                                <span className="text-xs text-gray-500">{row.brand} {row.model}</span>
                              </div>
                            </td>
                            <td className="p-4 font-semibold text-gray-900">
                              {row.customer_name}
                            </td>
                            <td className="p-4 text-gray-500 font-medium">
                              {formatDate(row.visit_date)}
                            </td>
                            <td className="p-4 font-black text-gray-900">
                              {formatINR(row.total_amount)}
                            </td>
                            <td className="p-4">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-xs font-bold text-[#D32F2F] hover:underline flex items-center justify-end gap-0.5">
                                View Details <ChevronRight size={12} />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-fade-in">
          {isInventoryLoading || isKpiLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Valuing assets...</p>
            </div>
          ) : (
            <>
              {/* Inventory KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PremiumStatCard
                  title="Unique Catalog Items"
                  value={kpiData?.inventory?.total_items || 0}
                  icon={Package}
                  color="#2563EB"
                  gradient="from-blue-500/10 to-indigo-400/5"
                  delay={0.1}
                />
                <PremiumStatCard
                  title="In-Stock Units"
                  value={kpiData?.inventory?.total_units || 0}
                  icon={TrendingUp}
                  color="#10B981"
                  gradient="from-emerald-500/10 to-teal-400/5"
                  delay={0.2}
                />
                <PremiumStatCard
                  title="Low Stock Warning Thresholds"
                  value={kpiData?.inventory?.low_stock_count || 0}
                  icon={TrendingDown}
                  color={kpiData?.inventory?.low_stock_count > 0 ? '#EF4444' : '#10B981'}
                  gradient={kpiData?.inventory?.low_stock_count > 0 ? 'from-red-500/10 to-rose-400/5' : 'from-emerald-500/10 to-teal-400/5'}
                  delay={0.3}
                />
              </div>

              {/* Inventory Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Material Asset Registry</span>
                  <Package size={16} className="text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Asset ID</th>
                        <th className="p-4">Material / Product Name</th>
                        <th className="p-4">Active Stock Count</th>
                        <th className="p-4">Base Unit Price</th>
                        <th className="p-4">Retail Value</th>
                        <th className="p-4">Status Alert</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(inventory?.data || []).map((row: any) => {
                        const isLow = parseFloat(row.quantity) <= parseFloat(row.low_stock_threshold);
                        const isOut = parseFloat(row.quantity) === 0;

                        return (
                          <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-mono text-xs text-gray-400">
                              #INV-{String(row.id).padStart(4, '0')}
                            </td>
                            <td className="p-4 font-semibold text-gray-900">
                              {row.product_name}
                            </td>
                            <td className={`p-4 font-black ${isLow ? 'text-red-700' : 'text-emerald-700'}`}>
                              {parseFloat(row.quantity)} <span className="text-[10px] font-bold uppercase text-gray-400">{row.unit}</span>
                            </td>
                            <td className="p-4 font-medium text-gray-900">
                              {row.unit_price ? formatINR(row.unit_price) : '—'}
                            </td>
                            <td className="p-4 font-medium text-gray-900">
                              {row.retail_price ? formatINR(row.retail_price) : '—'}
                            </td>
                            <td className="p-4">
                              {isOut ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Export Modal */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export Financial Statement">
        <div className="space-y-4 py-2">
          <Input type="date" label="From Date" value={exportForm.from_date} onChange={e => setExportForm({...exportForm, from_date: e.target.value})} />
          <Input type="date" label="To Date" value={exportForm.to_date} onChange={e => setExportForm({...exportForm, to_date: e.target.value})} />
          <Select label="Format" options={[{value:'excel', label:'Excel (.xlsx)'}, {value:'pdf', label:'PDF (.pdf)'}]} value={exportForm.format} onChange={e => setExportForm({...exportForm, format: e.target.value as any})} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowExport(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleExport} loading={exportMutation.isPending}>Download Document</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
