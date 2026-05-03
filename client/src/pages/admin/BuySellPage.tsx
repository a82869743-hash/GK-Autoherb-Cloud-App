import { useState } from 'react';
import { Plus, ShoppingCart, Download } from 'lucide-react';
import { useBuySellList, useCreateBuySell, useCompleteBuySell, downloadBuySellInvoice } from '../../api/hooks/useBuySell';
import { useInventory } from '../../api/hooks/useInventory';
import { useUIStore } from '../../store/uiStore';
import PageHeader from '../../components/shared/PageHeader';
import StatusBadge from '../../components/shared/StatusBadge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

export default function BuySellPage() {
  const toast = useUIStore(s => s.toast);
  
  const { data: buySell, isLoading: isBuySellLoading } = useBuySellList({ limit: 50 });
  const { data: inventory } = useInventory({});
  
  const createBuySellMutation = useCreateBuySell();
  const completeBuySellMutation = useCompleteBuySell();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [showBsModal, setShowBsModal] = useState(false);
  const [bsForm, setBsForm] = useState({
    type: 'buy', party_name: '', party_mobile: '', product_id: '', product_name: '',
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
        quantity: parseFloat(bsForm.quantity),
        unit_price: parseFloat(bsForm.unit_price),
        product_id: bsForm.product_id ? parseInt(bsForm.product_id) : undefined
      };
      await createBuySellMutation.mutateAsync(payload);
      toast('success', 'Record created');
      setShowBsModal(false);
      // Reset form
      setBsForm({
        type: 'buy', party_name: '', party_mobile: '', product_id: '', product_name: '',
        quantity: '', unit_price: '', transaction_date: new Date().toISOString().slice(0,10)
      });
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to create record');
    }
  };

  const handleCompleteBs = async (id: number) => {
    try {
      await completeBuySellMutation.mutateAsync(id);
      toast('success', 'Transaction marked complete');
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buy & Sell"
        subtitle="Manage product purchases, B2B, and B2C sales"
        actions={
          <Button variant="primary" onClick={() => setShowBsModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm card-premium">
        {isBuySellLoading ? <SkeletonLoader lines={5} /> : (
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
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(row.id)} loading={downloadingId === row.id} icon={<Download size={14} />}>
                    Invoice
                  </Button>
                )
              }
            ]}
            data={buySell?.data || []}
            keyExtractor={(r: any) => r.id}
          />
        )}
      </div>

      {/* Buy/Sell Modal */}
      <Modal open={showBsModal} onClose={() => setShowBsModal(false)} title="Add Buy/Sell Entry">
        <div className="space-y-4">
          <Select label="Type *" options={[
            {value:'buy', label:'Buy (Purchase)'},
            {value:'sell_b2b', label:'Sell B2B'},
            {value:'sell_b2c', label:'Sell B2C'}
          ]} value={bsForm.type} onChange={e => setBsForm({...bsForm, type: e.target.value})} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Party Name *" value={bsForm.party_name} onChange={e => setBsForm({...bsForm, party_name: e.target.value})} />
            <Input label="Party Mobile" value={bsForm.party_mobile} onChange={e => setBsForm({...bsForm, party_mobile: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select 
              label="Inventory Product (Optional)" 
              options={[{value:'', label:'Custom/None'}, ...((inventory?.data || []).map(i => ({ value: i.id.toString(), label: i.product_name })))]}
              value={bsForm.product_id}
              onChange={e => {
                const p = inventory?.data.find(x => x.id.toString() === e.target.value);
                setBsForm({...bsForm, product_id: e.target.value, product_name: p ? p.product_name : bsForm.product_name});
              }}
            />
            <Input label="Product Name *" value={bsForm.product_name} onChange={e => setBsForm({...bsForm, product_name: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Quantity *" type="number" value={bsForm.quantity} onChange={e => setBsForm({...bsForm, quantity: e.target.value})} />
            <Input label="Unit Price (₹) *" type="number" value={bsForm.unit_price} onChange={e => setBsForm({...bsForm, unit_price: e.target.value})} />
          </div>
          
          <Input type="date" label="Transaction Date *" value={bsForm.transaction_date} onChange={e => setBsForm({...bsForm, transaction_date: e.target.value})} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowBsModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateBs} loading={createBuySellMutation.isPending}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
