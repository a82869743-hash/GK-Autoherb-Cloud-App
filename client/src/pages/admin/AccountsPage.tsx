import { useState } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Clock, Download, Package } from 'lucide-react';
import { useAccountSummary, useTransactions, useExportReport, useAccountKPIs } from '../../api/hooks/useAccounts';
import { useUIStore } from '../../store/uiStore';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
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

  const { data: summary, isLoading: isSummaryLoading } = useAccountSummary(dateFilter);
  const { data: kpiData, isLoading: isKpiLoading } = useAccountKPIs(dateFilter);
  const { data: txns, isLoading: isTxnsLoading } = useTransactions({ limit: 100, ...dateFilter });
  
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

  const { data: jobCarts, isLoading: isJobCartsLoading } = useJobCarts({ page: 1, limit: 50, ...dateFilter });
  const { data: buySell, isLoading: isBuySellLoading } = useBuySellList({ page: 1, limit: 50, ...dateFilter });
  const { data: inventory, isLoading: isInventoryLoading } = useInventory({ page: 1, limit: 50 });
  const completeBuySellMutation = useCompleteBuySell();

  const handleCompleteBs = async (id: number) => {
    try {
      await completeBuySellMutation.mutateAsync(id);
      toast('success', 'Transaction marked complete');
    } catch(err: any) {
      toast('error', 'Failed to complete transaction');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Dashboard"
        subtitle="Consolidated financial overview of revenue, inventory, and staff payments"
        actions={
          <Button variant="primary" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs 
          tabs={[
            { key: 'summary', label: 'Summary' },
            { key: 'transactions', label: 'Ledger (Transactions)' },
            { key: 'buy_sell', label: 'Buy & Sell' },
            { key: 'job_carts', label: 'Job Carts' },
            { key: 'inventory', label: 'Inventory' },
          ]} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm w-full sm:w-auto">
          <Input type="date" value={dateFilter.from_date} onChange={e => setDateFilter({...dateFilter, from_date: e.target.value})} />
          <span className="text-gray-400">to</span>
          <Input type="date" value={dateFilter.to_date} onChange={e => setDateFilter({...dateFilter, to_date: e.target.value})} />
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6 animate-fade-in">
          {isSummaryLoading ? <SkeletonLoader lines={2} /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Today's Revenue" value={`₹${summary?.today_revenue?.toLocaleString('en-IN') || 0}`} icon={IndianRupee} />
                <StatCard label="Filtered Revenue" value={`₹${summary?.month_revenue?.toLocaleString('en-IN') || 0}`} icon={TrendingUp} />
                <StatCard label="Filtered Purchases" value={`₹${summary?.total_purchases_month?.toLocaleString('en-IN') || 0}`} icon={TrendingDown} />
                <StatCard label="Pending Salaries" value={`₹${summary?.pending_staff_payments?.toLocaleString('en-IN') || 0}`} icon={Clock} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="B2B Sales (Period)" value={`₹${summary?.total_b2b_sales_month?.toLocaleString('en-IN') || 0}`} icon={TrendingUp} />
                <StatCard label="B2C Sales (Period)" value={`₹${summary?.total_b2c_sales_month?.toLocaleString('en-IN') || 0}`} icon={TrendingUp} />
                <StatCard label="Open Job Carts" value={summary?.open_job_carts?.toString() || '0'} icon={Clock} />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-fade-in">
          {(isTxnsLoading || isKpiLoading) ? <SkeletonLoader lines={5} /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <StatCard label="Total Cash In" value={`₹${kpiData?.ledger?.total_in?.toLocaleString('en-IN') || 0}`} icon={TrendingUp} />
                <StatCard label="Total Cash Out" value={`₹${kpiData?.ledger?.total_out?.toLocaleString('en-IN') || 0}`} icon={TrendingDown} />
                <StatCard label="Net Flow" value={`₹${kpiData?.ledger?.net_flow?.toLocaleString('en-IN') || 0}`} icon={IndianRupee} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm card-premium">
                <DataTable
                  columns={[
                    { key: 'transaction_date', header: 'Date', render: (row: any) => new Date(row.transaction_date).toLocaleDateString() },
                    { key: 'type', header: 'Type', render: (row: any) => <span className="font-medium text-[#1c1b1b]">{row.type.replace(/_/g, ' ').toUpperCase()}</span> },
                    { key: 'direction', header: 'Dir', render: (row: any) => row.direction === 'in' ? <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">IN ↑</span> : <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">OUT ↓</span> },
                    { key: 'amount', header: 'Amount', render: (row: any) => (
                      <span className={row.direction === 'in' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        ₹{parseFloat(row.amount).toLocaleString('en-IN')}
                      </span>
                    )},
                    { key: 'note', header: 'Note', render: (row: any) => <span className="text-[#5f5e5e] text-sm">{row.note}</span> },
                    { key: 'created_by_name', header: 'User' }
                  ]}
                  data={txns?.data || []}
                  keyExtractor={(r: any) => r.id}
                />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'buy_sell' && (
        <div className="space-y-4 animate-fade-in">
          {(isBuySellLoading || isKpiLoading) ? <SkeletonLoader lines={5} /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <StatCard label="Total Purchases" value={`₹${kpiData?.buy_sell?.total_purchases?.toLocaleString('en-IN') || 0}`} icon={TrendingDown} />
                <StatCard label="Total Sales" value={`₹${kpiData?.buy_sell?.total_sales?.toLocaleString('en-IN') || 0}`} icon={TrendingUp} />
                <StatCard label="Pending Value" value={`₹${kpiData?.buy_sell?.pending_value?.toLocaleString('en-IN') || 0}`} icon={Clock} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm card-premium">
                <DataTable
                  columns={[
                    { key: 'transaction_date', header: 'Date', render: (row: any) => new Date(row.transaction_date).toLocaleDateString() },
                    { key: 'type', header: 'Type', render: (row: any) => {
                        let badgeColor = '';
                        let label = '';
                        if (row.type === 'buy') { badgeColor = 'bg-blue-100 text-blue-700'; label = 'BUY'; }
                        else if (row.type === 'sell_b2b') { badgeColor = 'bg-purple-100 text-purple-700'; label = 'SELL (B2B)'; }
                        else { badgeColor = 'bg-orange-100 text-orange-700'; label = 'SELL (B2C)'; }
                        return <span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>{label}</span>;
                    }},
                    { key: 'party_name', header: 'Party' },
                    { key: 'product_name', header: 'Product' },
                    { key: 'quantity', header: 'Qty' },
                    { key: 'total_amount', header: 'Total', render: (row: any) => `₹${parseFloat(row.total_amount).toLocaleString('en-IN')}` },
                    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
                    { key: 'actions', header: 'Action', render: (row: any) => 
                      row.status === 'pending' ? (
                        <Button variant="secondary" size="sm" onClick={() => handleCompleteBs(row.id)} loading={completeBuySellMutation.isPending}>Complete</Button>
                      ) : <span className="text-gray-400 text-sm font-medium">Done</span>
                    }
                  ]}
                  data={buySell?.data || []}
                  keyExtractor={(r: any) => r.id}
                />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'job_carts' && (
        <div className="space-y-4 animate-fade-in">
          {(isJobCartsLoading || isKpiLoading) ? <SkeletonLoader lines={5} /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <StatCard label="Total Carts Value" value={`₹${kpiData?.job_carts?.total_value?.toLocaleString('en-IN') || 0}`} icon={IndianRupee} />
                <StatCard label="Completed Value" value={`₹${kpiData?.job_carts?.completed_value?.toLocaleString('en-IN') || 0}`} icon={TrendingUp} />
                <StatCard label="Open Job Carts" value={kpiData?.job_carts?.open_count?.toString() || '0'} icon={Clock} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm card-premium">
                 <DataTable
                   columns={[
                     { key: 'registration_no', header: 'Vehicle', render: (row: any) => <span className="font-bold text-[#1c1b1b]">{row.registration_no}</span> },
                     { key: 'customer_name', header: 'Customer' },
                     { key: 'visit_date', header: 'Date', render: (row: any) => <span className="text-[#5f5e5e]">{formatDate(row.visit_date)}</span> },
                     { key: 'total_amount', header: 'Total', render: (row: any) => <span className="font-bold">{formatINR(row.total_amount)}</span> },
                     { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
                   ]}
                   data={jobCarts?.data || []}
                   onRowClick={(row) => navigate(`/admin/job-carts/${row.id}`)}
                   keyExtractor={(r: any) => r.id}
                 />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-4 animate-fade-in">
          {(isInventoryLoading || isKpiLoading) ? <SkeletonLoader lines={5} /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <StatCard label="Total Items (Catalog)" value={kpiData?.inventory?.total_items?.toString() || '0'} icon={Package} />
                <StatCard label="Total Stock Units" value={kpiData?.inventory?.total_units?.toString() || '0'} icon={TrendingUp} />
                <StatCard label="Low Stock Assets" value={kpiData?.inventory?.low_stock_count?.toString() || '0'} icon={TrendingDown} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm card-premium">
                <DataTable
                  columns={[
                    { key: 'product_name', header: 'Product Name', render: (row: any) => <span className="font-bold text-[#1c1b1b]">{row.product_name}</span> },
                    { key: 'quantity', header: 'In Stock', render: (row: any) => {
                      const isLow = parseFloat(row.quantity) <= parseFloat(row.low_stock_threshold);
                      return (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLow ? 'text-[#D32F2F]' : 'text-green-600'}`}>
                            {parseFloat(row.quantity)} {row.unit}
                          </span>
                          {isLow && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#D32F2F]/10 text-[#D32F2F]">Low</span>}
                        </div>
                      );
                    }},
                    { key: 'price', header: 'Current Price', render: (row: any) => row.unit_price ? `₹${parseFloat(row.unit_price).toLocaleString('en-IN')}` : '-' },
                    { key: 'retail_price', header: 'Retail Price', render: (row: any) => row.retail_price ? `₹${parseFloat(row.retail_price).toLocaleString('en-IN')}` : '-' },
                  ]}
                  data={inventory?.data || []}
                  keyExtractor={(r: any) => r.id}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Export Modal */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export Report">
        <div className="space-y-4">
          <Input type="date" label="From Date" value={exportForm.from_date} onChange={e => setExportForm({...exportForm, from_date: e.target.value})} />
          <Input type="date" label="To Date" value={exportForm.to_date} onChange={e => setExportForm({...exportForm, to_date: e.target.value})} />
          <Select label="Format" options={[{value:'excel', label:'Excel (.xlsx)'}, {value:'pdf', label:'PDF (.pdf)'}]} value={exportForm.format} onChange={e => setExportForm({...exportForm, format: e.target.value as any})} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowExport(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleExport} loading={exportMutation.isPending}>Download</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
