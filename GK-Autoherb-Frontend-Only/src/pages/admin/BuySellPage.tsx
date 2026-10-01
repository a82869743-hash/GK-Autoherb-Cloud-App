import { useState } from 'react';
import { Plus, ShoppingCart, Download, Search, RefreshCw, BarChart3, TrendingUp, TrendingDown, CheckCircle, ArrowUpRight, ArrowDownLeft, Building2, User } from 'lucide-react';
import { useBuySellList, useCreateBuySell, useCompleteBuySell, downloadBuySellInvoice } from '../../api/hooks/useBuySell';
import { useInventory } from '../../api/hooks/useInventory';
import { useVendors } from '../../api/hooks/useVendors';
import { useUIStore } from '../../store/uiStore';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import StatusBadge from '../../components/shared/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatINR } from '../../utils/formatters';

export default function BuySellPage() {
  const toast = useUIStore(s => s.toast);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: buySell, isLoading: isBuySellLoading, refetch } = useBuySellList({ limit: 100 });
  const { data: inventory } = useInventory({});
  const { data: vendorsList } = useVendors();
  
  const createBuySellMutation = useCreateBuySell();
  const completeBuySellMutation = useCompleteBuySell();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [showBsModal, setShowBsModal] = useState(false);
  const [bsForm, setBsForm] = useState({
    type: 'buy', vendor_id: '', party_name: '', party_mobile: '', product_id: '', product_name: '',
    quantity: '', unit_price: '', transaction_date: new Date().toISOString().slice(0,10)
  });

  const handleCreateBs = async () => {
    if (!bsForm.party_name || !bsForm.product_name || !bsForm.quantity || !bsForm.unit_price) {
      toast('error', 'Please fill all required fields');
      return;
    }
    try {
      const payload = {
        ...bsForm,
        type: bsForm.type as any,
        vendor_id: bsForm.vendor_id ? parseInt(bsForm.vendor_id) : undefined,
        quantity: parseFloat(bsForm.quantity),
        unit_price: parseFloat(bsForm.unit_price),
        product_id: bsForm.product_id ? parseInt(bsForm.product_id) : undefined
      };
      await createBuySellMutation.mutateAsync(payload);
      toast('success', 'Trade record created successfully');
      setShowBsModal(false);
      setBsForm({
        type: 'buy', vendor_id: '', party_name: '', party_mobile: '', product_id: '', product_name: '',
        quantity: '', unit_price: '', transaction_date: new Date().toISOString().slice(0,10)
      });
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to create record');
    }
  };

  const handleCompleteBs = async (id: number) => {
    try {
      await completeBuySellMutation.mutateAsync(id);
      toast('success', 'Transaction marked complete');
      refetch();
    } catch(err: any) {
      toast('error', 'Failed to complete transaction');
    }
  };

  const handleDownloadInvoice = async (id: number) => {
    setDownloadingId(id);
    try {
      await downloadBuySellInvoice(id);
    } catch (err) {
      toast('error', 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const allRecords = buySell?.data || [];
  
  const filteredRecords = allRecords.filter((r: any) => {
    const matchesSearch = 
      r.party_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.party_mobile?.includes(search);
    const matchesType = typeFilter ? r.type === typeFilter : true;
    return matchesSearch && matchesType;
  });

  const totalBuy = allRecords
    .filter((r: any) => r.type === 'buy')
    .reduce((sum: number, r: any) => sum + (parseFloat(r.total_amount) || 0), 0);

  const totalSellB2B = allRecords
    .filter((r: any) => r.type === 'sell_b2b')
    .reduce((sum: number, r: any) => sum + (parseFloat(r.total_amount) || 0), 0);

  const totalSellB2C = allRecords
    .filter((r: any) => r.type === 'sell_b2c')
    .reduce((sum: number, r: any) => sum + (parseFloat(r.total_amount) || 0), 0);

  const netRevenue = (totalSellB2B + totalSellB2C) - totalBuy;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      {/* Top Header */}
      <AdminHeaderBar
        title="Corporate Buy & Sell Ledger"
        subtitle="Track vendor procurements (Buy) and customer B2B/B2C trade cycles"
        badge={`${filteredRecords.length} records`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              title="Refresh ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBsModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#D32F2F] text-white font-semibold text-sm shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Record Trade Entry</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Procurements (Buy)"
            value={formatINR(totalBuy)}
            subtitle="Vendor materials & stock"
            icon={<ArrowDownLeft className="w-5 h-5 text-rose-600" />}
            variant="rose"
            trend={{ text: `${allRecords.filter((r: any) => r.type === 'buy').length} entries`, positive: false }}
          />
          <AdminMetricCard
            title="B2B Bulk Sales"
            value={formatINR(totalSellB2B)}
            subtitle="Commercial & dealer trade"
            icon={<Building2 className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: `${allRecords.filter((r: any) => r.type === 'sell_b2b').length} entries`, positive: true }}
          />
          <AdminMetricCard
            title="B2C Direct Sales"
            value={formatINR(totalSellB2C)}
            subtitle="Walk-in retail purchases"
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${allRecords.filter((r: any) => r.type === 'sell_b2c').length} entries`, positive: true }}
          />
          <AdminMetricCard
            title="Net Trade Flow"
            value={formatINR(netRevenue)}
            subtitle="Sales vs Procurements"
            icon={<BarChart3 className="w-5 h-5 text-sky-600" />}
            variant={netRevenue >= 0 ? "emerald" : "rose"}
            trend={{ text: netRevenue >= 0 ? 'Surplus' : 'Deficit', positive: netRevenue >= 0 }}
          />
        </div>

        {/* Filter Bar & Tabs */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
            {[
              { id: '', label: 'All Entries' },
              { id: 'buy', label: 'Procurements (Buy)' },
              { id: 'sell_b2b', label: 'B2B Trade' },
              { id: 'sell_b2c', label: 'B2C Direct' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  typeFilter === tab.id
                    ? 'bg-white text-[#D32F2F] shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by party, phone, or product..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
            />
          </div>
        </div>

        {/* Ledger Table / List Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {isBuySellLoading ? (
            <div className="p-16 text-center">
              <RefreshCw className="animate-spin w-8 h-8 text-[#D32F2F] mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Loading ledger records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Transactions Found</h3>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or record a new trade.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50/60">
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Transaction Type</th>
                    <th className="py-3.5 px-5">Party Details</th>
                    <th className="py-3.5 px-5">Product & Volume</th>
                    <th className="py-3.5 px-5">Total Valuation</th>
                    <th className="py-3.5 px-5">Fulfillment</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((row: any) => {
                    const isBuy = row.type === 'buy';
                    const isB2B = row.type === 'sell_b2b';

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5 whitespace-nowrap text-slate-600 font-medium">
                          {new Date(row.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                            isBuy 
                              ? 'text-rose-700 bg-rose-50/80 border-rose-100' 
                              : isB2B 
                                ? 'text-[#b71c1c] bg-red-50/80 border-red-100' 
                                : 'text-emerald-700 bg-emerald-50/80 border-emerald-100'
                          }`}>
                            {isBuy ? <ArrowDownLeft className="w-3 h-3 text-rose-600" /> : <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                            {isBuy ? 'Procurement (BUY)' : isB2B ? 'Trade (B2B SELL)' : 'Retail (B2C SELL)'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                              {row.vendor_id ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{row.party_name}</p>
                              <p className="text-[11px] text-slate-400">{row.party_mobile || 'No Phone'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{row.product_name}</p>
                            <p className="text-[11px] text-slate-400">Qty: {row.quantity} units @ {formatINR(row.unit_price)}/unit</p>
                          </div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="font-black text-slate-900 text-xs">
                            {formatINR(row.total_amount)}
                          </span>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          {row.status === 'pending' ? (
                            <button
                              onClick={() => handleCompleteBs(row.id)}
                              disabled={completeBuySellMutation.isPending}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-600/20"
                            >
                              Complete
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDownloadInvoice(row.id)}
                              disabled={downloadingId === row.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                              <span>{downloadingId === row.id ? 'Loading...' : 'Invoice'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Buy/Sell Entry Modal */}
      <Modal open={showBsModal} onClose={() => setShowBsModal(false)} title="Record Ledger Trade Entry" size="md">
        <div className="space-y-4 py-2">
          <Select
            label="Transaction Type *"
            options={[
              { value: 'buy', label: 'Buy (Vendor Procurement)' },
              { value: 'sell_b2b', label: 'Sell B2B (Bulk Trade)' },
              { value: 'sell_b2c', label: 'Sell B2C (Customer Direct)' }
            ]}
            value={bsForm.type}
            onChange={e => setBsForm({ ...bsForm, type: e.target.value })}
          />
          
          <Select
            label="Link Registered Vendor (Optional)"
            options={[
              { value: '', label: '-- Custom Party / Unregistered --' },
              ...((vendorsList?.data || []).map((v: any) => ({ value: String(v.id), label: `${v.name} (${v.phone || 'No phone'})` })))
            ]}
            value={bsForm.vendor_id || ''}
            onChange={e => {
              const vId = e.target.value;
              const foundV = (vendorsList?.data || []).find((x: any) => String(x.id) === vId);
              setBsForm({
                ...bsForm,
                vendor_id: vId,
                party_name: foundV ? foundV.name : bsForm.party_name,
                party_mobile: foundV ? (foundV.phone || bsForm.party_mobile) : bsForm.party_mobile
              });
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Party Name *" placeholder="e.g. Acme Corp / Rahul V" value={bsForm.party_name} onChange={e => setBsForm({ ...bsForm, party_name: e.target.value })} />
            <Input label="Party Mobile" placeholder="e.g. 9876543210" value={bsForm.party_mobile} onChange={e => setBsForm({ ...bsForm, party_mobile: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select 
              label="Inventory Link (Optional)" 
              options={[{ value: '', label: 'Custom Item (Not in Inventory)' }, ...((inventory?.data || []).map(i => ({ value: i.id.toString(), label: i.product_name })))]}
              value={bsForm.product_id}
              onChange={e => {
                const p = inventory?.data?.find((x: any) => x.id.toString() === e.target.value);
                setBsForm({ ...bsForm, product_id: e.target.value, product_name: p ? p.product_name : bsForm.product_name });
              }}
            />
            <Input label="Product Name *" placeholder="e.g. Ceramic Guard 9H" value={bsForm.product_name} onChange={e => setBsForm({ ...bsForm, product_name: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Quantity *" type="number" placeholder="0" value={bsForm.quantity} onChange={e => setBsForm({ ...bsForm, quantity: e.target.value })} />
            <Input label="Unit Price (₹) *" type="number" placeholder="0" value={bsForm.unit_price} onChange={e => setBsForm({ ...bsForm, unit_price: e.target.value })} />
          </div>
          
          <Input type="date" label="Transaction Date *" value={bsForm.transaction_date} onChange={e => setBsForm({ ...bsForm, transaction_date: e.target.value })} />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowBsModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateBs} loading={createBuySellMutation.isPending}>Save Trade Entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
