import { useState } from 'react';
import api from '../../api/axiosInstance';
import { TrendingUp, Clock, Download, Package, Briefcase, ChevronRight, BarChart3, Receipt, FileText, Plus, Trash2 } from 'lucide-react';
import { useAccountSummary, useTransactions, useExportReport, useAccountKPIs, usePurchaseBills, useCreatePurchaseBill, useGstReport, useReturns, useCreateReturn, downloadGstReport } from '../../api/hooks/useAccounts';
import { useVendors } from '../../api/hooks/useVendors';
import { useUIStore } from '../../store/uiStore';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useNavigate } from 'react-router-dom';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import { useBuySellList, useCompleteBuySell, useCreateBuySell } from '../../api/hooks/useBuySell';
import { useInventory } from '../../api/hooks/useInventory';
import StatusBadge from '../../components/shared/StatusBadge';
import { OpsPageTitle, StatTile, ChipRow, Skeleton } from '../../components/ops/ui';
import { LedgerList, Tag, PeriodPicker, MoneyHero } from '../../components/ops/ledger';
import { formatINR, formatDate } from '../../utils/formatters';

function stockTag(r: any) {
  const qty = parseFloat(r.quantity);
  if (qty === 0) return <Tag tone="red">Out of stock</Tag>;
  if (qty <= parseFloat(r.low_stock_threshold)) return <Tag tone="amber">Low</Tag>;
  return <Tag tone="green">OK</Tag>;
}

function gstInvoice(r: any) {
  return r.record_type === 'sales' ? (r.job_invoice || `Job #${r.invoice_id}`) : (r.purchase_invoice || `Purchase #${r.purchase_id}`);
}

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

  // --- NEW FINANCIAL MODULES STATES & HOOKS ---
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const [gstMonth, setGstMonth] = useState(new Date().getMonth() + 1);
  const [gstYear, setGstYear] = useState(new Date().getFullYear());

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    vendor_id: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    invoice_number: '',
    tax_amount: '0',
    notes: '',
    items: [{ item_id: '', hsn_sac: '', quantity: '1', unit_price: '0', gst_rate: '18' }] as Array<{ item_id: string; hsn_sac?: string; quantity: string; unit_price: string; gst_rate?: string }>
  });

  // Return Form State
  const [returnForm, setReturnForm] = useState({
    original_bill_id: '',
    return_type: 'sales_return',
    amount: '0',
    reason: ''
  });

  // Queries
  const { data: vendorsList } = useVendors({ active_only: true });
  const { data: purchaseBills, refetch: refetchPurchases } = usePurchaseBills(dateFilter);
  const { data: gstReport, refetch: refetchGst } = useGstReport({ month: String(gstMonth), year: String(gstYear) });
  const { data: returnsList, refetch: refetchReturns } = useReturns();

  // Mutations
  const createPurchaseMutation = useCreatePurchaseBill();
  const createReturnMutation = useCreateReturn();

  // Product Sale Form State
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({
    party_name: '',
    type: 'sell_b2c',
    product_id: '',
    quantity: '1',
    unit_price: '0',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const createBuySellMutation = useCreateBuySell();

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.party_name || !saleForm.product_id) {
      alert('Please fill out all required fields.');
      return;
    }
    const selectedProd = (inventory?.data || []).find((p: any) => p.id === Number(saleForm.product_id));
    const productName = selectedProd ? selectedProd.product_name : `Product #${saleForm.product_id}`;
    
    try {
      await createBuySellMutation.mutateAsync({
        type: saleForm.type,
        party_name: saleForm.party_name,
        product_name: productName,
        quantity: parseFloat(saleForm.quantity) || 1,
        unit_price: parseFloat(saleForm.unit_price) || 0,
        transaction_date: saleForm.transaction_date,
        notes: saleForm.notes || undefined
      } as any);
      toast('success', 'Product sale recorded successfully');
      setSaleModalOpen(false);
      setSaleForm({
        party_name: '',
        type: 'sell_b2c',
        product_id: '',
        quantity: '1',
        unit_price: '0',
        transaction_date: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      refetchSummary();
      refetchKPI();
      refetchBuySell();
      refetchTxns();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to record product sale');
    }
  };

  const handleAddPurchaseItem = () => {
    setPurchaseForm(prev => ({
      ...prev,
      items: [...prev.items, { item_id: '', hsn_sac: '', quantity: '1', unit_price: '0', gst_rate: '18' }]
    }));
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handlePurchaseItemChange = (index: number, field: string, value: string) => {
    setPurchaseForm(prev => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.vendor_id || !purchaseForm.purchase_date) {
      toast('error', 'Please select a vendor and purchase date.');
      return;
    }
    for (let idx = 0; idx < purchaseForm.items.length; idx++) {
      const item = purchaseForm.items[idx];
      if (!item.item_id || Number(item.item_id) <= 0) {
        toast('error', `Please select a product for line item #${idx + 1}`);
        return;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        toast('error', `Please enter a valid quantity for line item #${idx + 1}`);
        return;
      }
    }
    try {
      await createPurchaseMutation.mutateAsync({
        ...purchaseForm,
        vendor_id: Number(purchaseForm.vendor_id),
        tax_amount: parseFloat(purchaseForm.tax_amount) || 0,
        items: purchaseForm.items.map(i => ({
          item_id: Number(i.item_id),
          hsn_sac: i.hsn_sac || null,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          gst_rate: parseFloat(i.gst_rate || '0') || 0
        }))
      });
      toast('success', 'Purchase bill recorded successfully');
      setPurchaseModalOpen(false);
      setPurchaseForm({
        vendor_id: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        invoice_number: '',
        tax_amount: '0',
        notes: '',
        items: [{ item_id: '', quantity: '1', unit_price: '0', hsn_sac: '', gst_rate: '18' }]
      });
      refetchPurchases();
      refetchSummary();
      refetchKPI();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to record purchase bill');
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.original_bill_id || !returnForm.amount) {
      alert('Please fill out all required fields.');
      return;
    }
    try {
      await createReturnMutation.mutateAsync({
        original_bill_id: Number(returnForm.original_bill_id),
        return_type: returnForm.return_type,
        amount: parseFloat(returnForm.amount) || 0,
        reason: returnForm.reason
      });
      toast('success', 'Return note logged successfully');
      setReturnModalOpen(false);
      setReturnForm({
        original_bill_id: '',
        return_type: 'sales_return',
        amount: '0',
        reason: ''
      });
      refetchReturns();
      refetchSummary();
      refetchKPI();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to log return note');
    }
  };

  const [downloadingGst, setDownloadingGst] = useState<'csv' | 'xlsx' | null>(null);

  const handleDownloadGst = async (format: 'csv' | 'xlsx') => {
    setDownloadingGst(format);
    try {
      await downloadGstReport(gstMonth, gstYear, format);
      toast('success', `GSTR Compliance Report (${format.toUpperCase()}) exported successfully`);
    } catch (err) {
      toast('error', 'Failed to export GST report');
    } finally {
      setDownloadingGst(null);
    }
  };

  const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const TABS = [
    { key: 'summary', label: 'Overview' },
    { key: 'transactions', label: 'Ledger' },
    { key: 'purchase_bills', label: 'Purchases' },
    { key: 'gst', label: 'GST' },
    { key: 'returns', label: 'Returns' },
    { key: 'buy_sell', label: 'Buy & sell' },
    { key: 'job_carts', label: 'Job carts' },
    { key: 'inventory', label: 'Inventory' },
  ];

  return (
    <div className="space-y-4 pb-28 lg:pb-12 max-w-[1200px] mx-auto">
      <OpsPageTitle
        kicker="Accounts"
        title="Money & ledger"
        subtitle={`${fmtDay(dateFilter.from_date)} – ${fmtDay(dateFilter.to_date)}`}
        action={
          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl bg-[#1c1b1b] text-white text-[12px] font-bold active:scale-95 transition-transform"
          >
            <Download size={14} /> Export
          </button>
        }
      />

      <PeriodPicker value={dateFilter} onChange={setDateFilter} />

      <ChipRow items={TABS} value={activeTab} onChange={setActiveTab} />

      {/* ── Overview ── */}
      {activeTab === 'summary' && (
        <div className="space-y-3 animate-fade-in">
          {isSummaryLoading ? (
            <Skeleton className="h-[120px] rounded-3xl" />
          ) : (
            <>
              <MoneyHero
                kicker="This period"
                items={[
                  { label: 'Revenue', value: formatINR(summary?.month_revenue || 0), tone: 'in' },
                  { label: 'Purchases', value: formatINR(summary?.total_purchases_month || 0), tone: 'out' },
                  { label: 'Today', value: formatINR(summary?.today_revenue || 0) },
                ]}
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <StatTile label="Pending salaries" value={formatINR(summary?.pending_staff_payments || 0)} icon={Clock} tone="amber" hint="Payroll due" />
                <StatTile label="B2B sales" value={formatINR(summary?.total_b2b_sales_month || 0)} icon={TrendingUp} tone="purple" hint="Wholesale" />
                <StatTile label="B2C sales" value={formatINR(summary?.total_b2c_sales_month || 0)} icon={TrendingUp} tone="blue" hint="Counter sales" />
                <StatTile label="Open job carts" value={summary?.open_job_carts || 0} icon={Briefcase} tone="red" hint="On the floor now" onClick={() => setActiveTab('job_carts')} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { key: 'transactions', label: 'Ledger', icon: Receipt },
                  { key: 'purchase_bills', label: 'Purchases', icon: FileText },
                  { key: 'gst', label: 'GST', icon: BarChart3 },
                  { key: 'inventory', label: 'Inventory', icon: Package },
                ].map((l) => (
                  <button key={l.key} onClick={() => setActiveTab(l.key)} className="app-card p-3 flex items-center gap-2.5 text-left active:scale-[0.99] transition-transform">
                    <span className="h-9 w-9 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0"><l.icon size={17} /></span>
                    <span className="text-[13px] font-bold text-slate-800 flex-1">{l.label}</span>
                    <ChevronRight size={15} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Ledger ── */}
      {activeTab === 'transactions' && (
        <div className="space-y-3 animate-fade-in">
          <MoneyHero
            kicker="Cash flow"
            items={[
              { label: 'Money in', value: formatINR(kpiData?.ledger?.total_in || 0), tone: 'in' },
              { label: 'Money out', value: formatINR(kpiData?.ledger?.total_out || 0), tone: 'out' },
              { label: 'Net', value: formatINR(kpiData?.ledger?.net_flow || 0), tone: (kpiData?.ledger?.net_flow || 0) >= 0 ? 'in' : 'out' },
            ]}
          />
          <LedgerList
            title="All entries"
            loading={isTxnsLoading || isKpiLoading}
            rows={txns?.data || []}
            empty="No ledger entries in this period"
            cols={[
              { label: 'Date', cell: (r: any) => fmtDay(r.transaction_date) },
              { label: 'Type', cell: (r: any) => <span className="font-semibold text-slate-900 capitalize">{r.type.replace(/_/g, ' ')}</span> },
              { label: 'Flow', cell: (r: any) => <Tag tone={r.direction === 'in' ? 'green' : 'red'}>{r.direction === 'in' ? 'In ↑' : 'Out ↓'}</Tag> },
              { label: 'Amount', align: 'right', cell: (r: any) => <span className={`font-extrabold ${r.direction === 'in' ? 'text-emerald-600' : 'text-[#D32F2F]'}`}>{formatINR(r.amount)}</span> },
              { label: 'Note', cell: (r: any) => <span className="text-slate-500">{r.note || '—'}</span> },
              { label: 'By', cell: (r: any) => r.created_by_name || 'System' },
            ]}
            card={(r: any) => ({
              title: <span className="capitalize">{r.type.replace(/_/g, ' ')}</span>,
              subtitle: `${fmtDay(r.transaction_date)}${r.note ? ` · ${r.note}` : ''}`,
              amount: `${r.direction === 'in' ? '+' : '−'}${formatINR(r.amount)}`,
              tone: r.direction === 'in' ? 'in' : 'out',
            })}
          />
        </div>
      )}

      {/* ── Buy & sell ── */}
      {activeTab === 'buy_sell' && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="Bought" value={formatINR(kpiData?.buy_sell?.total_purchases || 0)} tone="red" />
            <StatTile label="Sold" value={formatINR(kpiData?.buy_sell?.total_sales || 0)} tone="green" />
            <StatTile label="To receive" value={formatINR(kpiData?.buy_sell?.pending_value || 0)} tone="amber" />
          </div>
          <LedgerList
            title="Trades"
            action={<Button size="sm" onClick={() => setSaleModalOpen(true)} icon={<Plus size={14} />}>Record sale</Button>}
            loading={isBuySellLoading || isKpiLoading}
            rows={buySell?.data || []}
            empty="No trades in this period"
            cols={[
              { label: 'Date', cell: (r: any) => fmtDay(r.transaction_date) },
              { label: 'Type', cell: (r: any) => <Tag tone={r.type === 'buy' ? 'red' : r.type === 'sell_b2b' ? 'purple' : 'green'}>{r.type === 'buy' ? 'Buy' : r.type === 'sell_b2b' ? 'Sell B2B' : 'Sell B2C'}</Tag> },
              { label: 'Party', cell: (r: any) => <span className="font-semibold text-slate-900">{r.party_name}</span> },
              { label: 'Product', cell: (r: any) => r.product_name },
              { label: 'Qty', cell: (r: any) => r.quantity },
              { label: 'Total', align: 'right', cell: (r: any) => <span className="font-extrabold text-slate-900">{formatINR(r.total_amount)}</span> },
              { label: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
              {
                label: 'Action', align: 'right', cell: (r: any) => r.status === 'pending'
                  ? <Button size="sm" onClick={() => handleCompleteBs(r.id)} loading={completeBuySellMutation.isPending}>Complete</Button>
                  : <span className="text-[11px] font-bold text-slate-400">Settled</span>,
              },
            ]}
            card={(r: any) => ({
              title: r.party_name,
              subtitle: `${r.product_name} · ${r.quantity} · ${fmtDay(r.transaction_date)}`,
              amount: formatINR(r.total_amount),
              tone: r.type === 'buy' ? 'out' : 'in',
              badge: <Tag tone={r.type === 'buy' ? 'red' : r.type === 'sell_b2b' ? 'purple' : 'green'}>{r.type === 'buy' ? 'Buy' : r.type === 'sell_b2b' ? 'Sell B2B' : 'Sell B2C'}</Tag>,
              footer: r.status === 'pending' ? (
                <div className="flex items-center justify-between">
                  <StatusBadge status={r.status} />
                  <Button size="sm" onClick={() => handleCompleteBs(r.id)} loading={completeBuySellMutation.isPending}>Mark complete</Button>
                </div>
              ) : undefined,
            })}
          />
        </div>
      )}

      {/* ── Job carts ── */}
      {activeTab === 'job_carts' && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="Pipeline" value={formatINR(kpiData?.job_carts?.total_value || 0)} tone="red" />
            <StatTile label="Settled" value={formatINR(kpiData?.job_carts?.completed_value || 0)} tone="green" />
            <StatTile label="Open" value={kpiData?.job_carts?.open_count || 0} tone="amber" />
          </div>
          <LedgerList
            title="Job carts"
            loading={isJobCartsLoading || isKpiLoading}
            rows={jobCarts?.data || []}
            empty="No job carts in this period"
            onRowClick={(r: any) => navigate(`/admin/job-carts/${r.id}`)}
            cols={[
              { label: 'Job', cell: (r: any) => <span className="font-mono text-[12px] text-slate-400">#JC-{String(r.id).padStart(4, '0')}</span> },
              { label: 'Vehicle', cell: (r: any) => <div><p className="font-bold text-slate-900">{r.registration_no}</p><p className="text-[12px] text-slate-500">{r.brand} {r.model}</p></div> },
              { label: 'Customer', cell: (r: any) => <span className="font-semibold text-slate-900">{r.customer_name}</span> },
              { label: 'Visit', cell: (r: any) => formatDate(r.visit_date) },
              { label: 'Amount', align: 'right', cell: (r: any) => <span className="font-extrabold text-slate-900">{formatINR(r.total_amount)}</span> },
              { label: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
            ]}
            card={(r: any) => ({
              title: `${r.registration_no} · ${r.customer_name}`,
              subtitle: `${r.brand} ${r.model} · ${formatDate(r.visit_date)}`,
              amount: formatINR(r.total_amount),
              badge: <StatusBadge status={r.status} />,
            })}
          />
        </div>
      )}

      {/* ── Inventory ── */}
      {activeTab === 'inventory' && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="Items" value={kpiData?.inventory?.total_items || 0} tone="slate" />
            <StatTile label="Units" value={kpiData?.inventory?.total_units || 0} tone="green" />
            <StatTile label="Low stock" value={kpiData?.inventory?.low_stock_count || 0} tone={kpiData?.inventory?.low_stock_count > 0 ? 'red' : 'green'} />
          </div>
          <LedgerList
            title="Stock"
            loading={isInventoryLoading || isKpiLoading}
            rows={inventory?.data || []}
            empty="No inventory items"
            cols={[
              { label: 'Item', cell: (r: any) => <span className="font-semibold text-slate-900">{r.product_name}</span> },
              { label: 'In stock', cell: (r: any) => <span className="font-extrabold">{parseFloat(r.quantity)} <span className="text-[10px] uppercase text-slate-400">{r.unit}</span></span> },
              { label: 'Unit price', cell: (r: any) => (r.unit_price ? formatINR(r.unit_price) : '—') },
              { label: 'Retail', cell: (r: any) => (r.retail_price ? formatINR(r.retail_price) : '—') },
              { label: 'Status', cell: (r: any) => stockTag(r) },
            ]}
            card={(r: any) => ({
              title: r.product_name,
              subtitle: `${r.unit_price ? formatINR(r.unit_price) : '—'} / ${r.unit || 'unit'}${r.retail_price ? ` · retail ${formatINR(r.retail_price)}` : ''}`,
              amount: <>{parseFloat(r.quantity)} <span className="text-[11px] text-slate-400">{r.unit}</span></>,
              badge: stockTag(r),
            })}
          />
        </div>
      )}

      {/* ── Purchases ── */}
      {activeTab === 'purchase_bills' && (
        <div className="space-y-3 animate-fade-in">
          <LedgerList
            title="Purchase bills"
            action={<Button size="sm" onClick={() => setPurchaseModalOpen(true)} icon={<Plus size={14} />}>Add bill</Button>}
            rows={purchaseBills?.data || []}
            empty="No purchase bills in this period"
            cols={[
              { label: 'Date', cell: (r: any) => fmtDay(r.purchase_date) },
              { label: 'Invoice', cell: (r: any) => <span className="font-mono text-[12px] font-bold text-slate-900">{r.invoice_number || `#PUR-${String(r.id).padStart(4, '0')}`}</span> },
              { label: 'Vendor', cell: (r: any) => <span className="font-semibold text-slate-900">{r.vendor_name || '—'}</span> },
              { label: 'Total', align: 'right', cell: (r: any) => <span className="font-extrabold text-slate-900">{formatINR(r.total_amount)}</span> },
              { label: 'Tax', align: 'right', cell: (r: any) => formatINR(r.tax_amount) },
              { label: 'Notes', cell: (r: any) => <span className="text-slate-500">{r.notes || '—'}</span> },
            ]}
            card={(r: any) => ({
              title: r.vendor_name || 'Vendor',
              subtitle: `${r.invoice_number || `#PUR-${String(r.id).padStart(4, '0')}`} · ${fmtDay(r.purchase_date)}`,
              amount: formatINR(r.total_amount),
              tone: 'out',
              badge: <span className="text-[11px] text-slate-400">tax {formatINR(r.tax_amount)}</span>,
            })}
          />
        </div>
      )}

      {/* ── GST ── */}
      {activeTab === 'gst' && (
        <div className="space-y-3 animate-fade-in">
          <div className="app-card p-3 flex flex-wrap items-center gap-2">
            <select className="h-10 flex-1 min-w-[120px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[13px] font-semibold" value={gstMonth} onChange={e => setGstMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select className="h-10 w-[96px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[13px] font-semibold" value={gstYear} onChange={e => setGstYear(Number(e.target.value))}>
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => handleDownloadGst('csv')} disabled={!!downloadingGst} className="flex-1 sm:flex-none h-10 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Download size={13} /> {downloadingGst === 'csv' ? 'Exporting…' : 'CSV'}
              </button>
              <button onClick={() => handleDownloadGst('xlsx')} disabled={!!downloadingGst} className="flex-1 sm:flex-none h-10 px-3 rounded-xl bg-[#1c1b1b] text-white text-[12px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Download size={13} /> {downloadingGst === 'xlsx' ? 'Exporting…' : 'Excel'}
              </button>
            </div>
          </div>
          <MoneyHero
            kicker="GST for the month"
            items={[
              { label: 'On sales', value: formatINR(gstReport?.summary?.sales?.gst || 0) },
              { label: 'On purchases', value: formatINR(gstReport?.summary?.purchases?.gst || 0), tone: 'in' },
              { label: 'Net payable', value: formatINR(gstReport?.summary?.net_gst_payable || 0), tone: (gstReport?.summary?.net_gst_payable || 0) > 0 ? 'out' : 'in' },
            ]}
          />
          <LedgerList
            title="GST entries"
            rows={gstReport?.records || []}
            empty="No GST entries for this month"
            cols={[
              { label: 'Type', cell: (r: any) => <Tag tone={r.record_type === 'sales' ? 'green' : 'red'}>{r.record_type === 'sales' ? 'Sales' : 'Purchase'}</Tag> },
              { label: 'Invoice', cell: (r: any) => <span className="font-mono text-[12px] font-bold text-slate-900">{gstInvoice(r)}</span> },
              { label: 'GSTIN', cell: (r: any) => r.gstin || '—' },
              { label: 'Taxable', align: 'right', cell: (r: any) => formatINR(r.taxable_amount) },
              { label: 'CGST', align: 'right', cell: (r: any) => formatINR(r.cgst) },
              { label: 'SGST', align: 'right', cell: (r: any) => formatINR(r.sgst) },
              { label: 'Total GST', align: 'right', cell: (r: any) => <span className="font-extrabold text-slate-900">{formatINR(r.total_gst)}</span> },
              { label: 'Date', cell: (r: any) => new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) },
            ]}
            card={(r: any) => ({
              title: gstInvoice(r),
              subtitle: `Taxable ${formatINR(r.taxable_amount)} · CGST ${formatINR(r.cgst)} · SGST ${formatINR(r.sgst)}`,
              amount: formatINR(r.total_gst),
              badge: <Tag tone={r.record_type === 'sales' ? 'green' : 'red'}>{r.record_type === 'sales' ? 'Sales' : 'Purchase'}</Tag>,
            })}
          />
        </div>
      )}

      {/* ── Returns ── */}
      {activeTab === 'returns' && (
        <div className="space-y-3 animate-fade-in">
          <LedgerList
            title="Returns & refunds"
            action={<Button size="sm" onClick={() => setReturnModalOpen(true)} icon={<Plus size={14} />}>Log return</Button>}
            rows={returnsList || []}
            empty="No returns logged yet"
            cols={[
              { label: 'Date', cell: (r: any) => fmtDay(r.created_at) },
              { label: 'Return', cell: (r: any) => <span className="font-mono text-[12px] font-bold text-slate-900">#RET-{String(r.id).padStart(4, '0')}</span> },
              { label: 'Original', cell: (r: any) => (r.return_type === 'sales_return' ? `Bill #${r.original_bill_id}` : `Purchase #${r.original_bill_id}`) },
              { label: 'Type', cell: (r: any) => <Tag tone={r.return_type === 'sales_return' ? 'red' : 'amber'}>{r.return_type === 'sales_return' ? 'Sales return' : 'Purchase return'}</Tag> },
              { label: 'Amount', align: 'right', cell: (r: any) => <span className="font-extrabold text-slate-900">{formatINR(r.amount)}</span> },
              { label: 'Reason', cell: (r: any) => <span className="text-slate-500">{r.reason || '—'}</span> },
            ]}
            card={(r: any) => ({
              title: r.return_type === 'sales_return' ? `Bill #${r.original_bill_id}` : `Purchase #${r.original_bill_id}`,
              subtitle: `${fmtDay(r.created_at)}${r.reason ? ` · ${r.reason}` : ''}`,
              amount: formatINR(r.amount),
              tone: r.return_type === 'sales_return' ? 'out' : 'in',
              badge: <Tag tone={r.return_type === 'sales_return' ? 'red' : 'amber'}>{r.return_type === 'sales_return' ? 'Sales return' : 'Purchase return'}</Tag>,
            })}
          />
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

      {/* Add Purchase Bill Modal */}
      <Modal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        title="Record Purchase Bill"
        size="lg"
        footer={
          <div className="flex justify-end gap-2.5 w-full">
            <Button variant="secondary" type="button" onClick={() => setPurchaseModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="button" onClick={handlePurchaseSubmit} loading={createPurchaseMutation.isPending}>Record Bill</Button>
          </div>
        }
      >
        <form onSubmit={handlePurchaseSubmit} className="space-y-4 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Select Vendor *"
              value={purchaseForm.vendor_id}
              onChange={e => setPurchaseForm({ ...purchaseForm, vendor_id: e.target.value })}
              options={[
                { value: '', label: 'Select Vendor' },
                ...(vendorsList?.data || []).map((v: any) => ({ value: String(v.id), label: v.name }))
              ]}
              required
            />
            <Input
              type="date"
              label="Purchase Date *"
              value={purchaseForm.purchase_date}
              onChange={e => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="text"
              label="Invoice Number"
              placeholder="e.g. INV-9901"
              value={purchaseForm.invoice_number}
              onChange={e => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
            />
            <Input
              type="number"
              label="GST / Tax Amount"
              placeholder="0.00"
              value={purchaseForm.tax_amount}
              onChange={e => setPurchaseForm({ ...purchaseForm, tax_amount: e.target.value })}
            />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Purchase Line Items</span>
              <button
                type="button"
                onClick={handleAddPurchaseItem}
                className="px-2 py-1 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold rounded-lg transition flex items-center gap-0.5"
              >
                <Plus size={10} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {purchaseForm.items.map((item, idx) => (
                <div key={idx} className="p-3 border border-gray-200 rounded-xl bg-gray-50/60 space-y-2.5 relative">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Item #{idx + 1}</span>
                    {purchaseForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePurchaseItem(idx)}
                        className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition"
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div>
                    <Select
                      label="Product *"
                      value={item.item_id}
                      onChange={e => handlePurchaseItemChange(idx, 'item_id', e.target.value)}
                      options={[
                        { value: '', label: '-- Select Inventory Product --' },
                        ...(inventory?.data || []).map((p: any) => ({ value: String(p.id), label: `${p.product_name} (${p.category || 'Item'})` }))
                      ]}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input
                      type="text"
                      label="HSN/SAC"
                      placeholder="e.g. 3402"
                      value={item.hsn_sac || ''}
                      onChange={e => handlePurchaseItemChange(idx, 'hsn_sac', e.target.value)}
                    />
                    <Input
                      type="number"
                      label="Qty *"
                      placeholder="1"
                      value={item.quantity}
                      onChange={e => handlePurchaseItemChange(idx, 'quantity', e.target.value)}
                      required
                    />
                    <Input
                      type="number"
                      label="Unit Cost (₹) *"
                      placeholder="0.00"
                      value={item.unit_price}
                      onChange={e => handlePurchaseItemChange(idx, 'unit_price', e.target.value)}
                      required
                    />
                    <Select
                      label="GST %"
                      value={item.gst_rate || '18'}
                      onChange={e => handlePurchaseItemChange(idx, 'gst_rate', e.target.value)}
                      options={[
                        { value: '0', label: '0%' },
                        { value: '5', label: '5%' },
                        { value: '12', label: '12%' },
                        { value: '18', label: '18%' },
                        { value: '28', label: '28%' }
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input
            type="text"
            label="Internal Notes"
            placeholder="e.g. Raw materials delivery"
            value={purchaseForm.notes}
            onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* Log Return Note Modal */}
      <Modal open={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Log Return / Reversal Note">
        <form onSubmit={handleReturnSubmit} className="space-y-4 py-2">
          <Select
            label="Return Type *"
            value={returnForm.return_type}
            onChange={e => setReturnForm({ ...returnForm, return_type: e.target.value })}
            options={[
              { value: 'sales_return', label: 'Sales Return (Credit Note to Customer)' },
              { value: 'purchase_return', label: 'Purchase Return (Debit Note to Vendor)' }
            ]}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="number"
              label="Original Invoice / Bill ID *"
              placeholder="e.g. 15"
              value={returnForm.original_bill_id}
              onChange={e => setReturnForm({ ...returnForm, original_bill_id: e.target.value })}
              required
            />
            <Input
              type="number"
              label="Reversal Amount *"
              placeholder="0.00"
              value={returnForm.amount}
              onChange={e => setReturnForm({ ...returnForm, amount: e.target.value })}
              required
            />
          </div>

          <Input
            type="text"
            label="Reason for Return *"
            placeholder="e.g. Defective stock / cancelled service"
            value={returnForm.reason}
            onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setReturnModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={createReturnMutation.isPending}>Log Note</Button>
          </div>
        </form>
      </Modal>

      {/* Record Product Sale Modal */}
      <Modal open={saleModalOpen} onClose={() => setSaleModalOpen(false)} title="Record Product Sale">
        <form onSubmit={handleSaleSubmit} className="space-y-4 py-2">
          <Input
            type="text"
            label="Customer / Party Name *"
            placeholder="e.g. John Doe / Auto Solutions"
            value={saleForm.party_name}
            onChange={e => setSaleForm({ ...saleForm, party_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Sale Type *"
              value={saleForm.type}
              onChange={e => setSaleForm({ ...saleForm, type: e.target.value })}
              options={[
                { value: 'sell_b2c', label: 'B2C (Retail Sale)' },
                { value: 'sell_b2b', label: 'B2B (Business Sale)' }
              ]}
              required
            />
            <Select
              label="Select Product *"
              value={saleForm.product_id}
              onChange={e => {
                const val = e.target.value;
                const selected = (inventory?.data || []).find((p: any) => p.id === Number(val)) as any;
                setSaleForm(prev => ({
                  ...prev,
                  product_id: val,
                  unit_price: selected ? String(selected.selling_price || selected.retail_price || 0) : '0'
                }));
              }}
              options={[
                { value: '', label: 'Select Product...' },
                ...(inventory?.data || []).map((p: any) => ({ value: String(p.id), label: `${p.product_name} (${p.unit})` }))
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="number"
              label="Quantity *"
              placeholder="1"
              value={saleForm.quantity}
              onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })}
              required
            />
            <Input
              type="number"
              label="Unit Selling Price (₹) *"
              placeholder="0.00"
              value={saleForm.unit_price}
              onChange={e => setSaleForm({ ...saleForm, unit_price: e.target.value })}
              required
            />
            <Input
              type="date"
              label="Transaction Date *"
              value={saleForm.transaction_date}
              onChange={e => setSaleForm({ ...saleForm, transaction_date: e.target.value })}
              required
            />
          </div>

          <Input
            type="text"
            label="Internal Notes"
            placeholder="e.g. Sold with warranty details"
            value={saleForm.notes}
            onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setSaleModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={createBuySellMutation.isPending}>Record Sale</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
