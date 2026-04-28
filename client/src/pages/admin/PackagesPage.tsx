import { useState } from 'react';
import { Plus, Package as PackageIcon, Edit2, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { usePackages, useCreatePackage, useUpdatePackage, useTogglePackage, useDeletePackage } from '../../api/hooks/usePackages';
import { useServices } from '../../api/hooks/useServices';
import { useInventory } from '../../api/hooks/useInventory';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useUIStore } from '../../store/uiStore';
import { formatINR } from '../../utils/formatters';

const CATEGORY_LABELS = [
  { key: 'price_hatchback', short: 'Hatch', label: 'Hatchback ₹' },
  { key: 'price_medium_hatchback', short: 'Med Hatch', label: 'Med Hatchback ₹' },
  { key: 'price_sedan', short: 'Sedan', label: 'Sedan ₹' },
  { key: 'price_premium_sedan', short: 'Prem Sedan', label: 'Prem Sedan ₹' },
  { key: 'price_suv', short: 'SUV', label: 'SUV ₹' },
];

const emptyPrices = () => ({
  price_hatchback: 0, price_medium_hatchback: 0, price_sedan: 0, price_premium_sedan: 0, price_suv: 0,
});

export default function PackagesPage() {
  const toast = useUIStore((s) => s.toast);
  const { data: pkgs, isLoading } = usePackages();
  const { data: servicesData } = useServices();
  const { data: inventoryData } = useInventory({});
  
  const createMut = useCreatePackage();
  const updateMut = useUpdatePackage();
  const toggleMut = useTogglePackage();
  const deleteMut = useDeletePackage();

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>(emptyPrices());
  const [washCount, setWashCount] = useState(0);
  const [waxCount, setWaxCount] = useState(0);
  const [active, setActive] = useState(true);
  
  // Maps to store selected services/products
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]); // array of { product_id, quantity }

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const packages = pkgs || [];
  const services = servicesData?.data || [];
  const inventory = inventoryData?.data || [];

  const updatePrice = (key: string, val: number) => setPrices(prev => ({ ...prev, [key]: val }));

  const openAdd = () => {
    setEditItem(null); 
    setName(''); setDesc(''); setPrices(emptyPrices()); 
    setWashCount(0); setWaxCount(0); setActive(true);
    setSelectedServices(new Set());
    setSelectedProducts([]);
    setModalOpen(true);
  };

  const openEdit = (pkg: any) => {
    setEditItem(pkg); 
    setName(pkg.name); setDesc(pkg.description || '');
    setPrices({
      price_hatchback: parseFloat(pkg.price_hatchback) || 0,
      price_medium_hatchback: parseFloat(pkg.price_medium_hatchback) || 0,
      price_sedan: parseFloat(pkg.price_sedan) || 0,
      price_premium_sedan: parseFloat(pkg.price_premium_sedan) || 0,
      price_suv: parseFloat(pkg.price_suv) || 0,
    });
    setWashCount(pkg.wash_count); setWaxCount(pkg.wax_count);
    setActive(!!pkg.is_published);
    
    // Init associated services
    const sIds = new Set<number>((pkg.services || []).map((s: any) => s.id));
    setSelectedServices(sIds);
    
    // Init associated products
    const pArr = (pkg.products || []).map((p: any) => ({ product_id: p.product_id, quantity: p.quantity }));
    setSelectedProducts(pArr);
    
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast('error', 'Name is required'); return; }
    try {
      const payload = {
        name, description: desc, 
        ...prices,
        wash_count: washCount, wax_count: waxCount,
        is_published: active,
        service_ids: Array.from(selectedServices),
        products: selectedProducts
      };

      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, ...payload });
        toast('success', 'Package updated');
      } else {
        await createMut.mutateAsync(payload);
        toast('success', 'Package created');
      }
      setModalOpen(false);
    } catch (err: any) { toast('error', err?.response?.data?.error || 'Failed'); }
  };

  const handleToggle = async (id: number) => {
    try { await toggleMut.mutateAsync(id); } catch { toast('error', 'Failed to toggle'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteMut.mutateAsync(deleteId); toast('success', 'Package deleted'); }
    catch { toast('error', 'Failed to delete'); }
    setDeleteOpen(false); setDeleteId(null);
  };

  return (
    <>
      <AdminTopBar
        title="Packages"
        subtitle={`${packages.length} packages`}
        actions={<Button onClick={openAdd} icon={<Plus size={16} />}>Add Package</Button>}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !packages.length ? (
        <EmptyState icon={PackageIcon} title="No Packages" description="Create your first package bundle" actionLabel="+ Add Package" onAction={openAdd} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg: any) => (
            <div key={pkg.id} className={`bg-white rounded-lg p-5 shadow-sm border-l-4 transition-all ${pkg.is_published ? 'border-[#D32F2F]' : 'border-gray-300 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[#1c1b1b] text-sm">{pkg.name}</h3>
                  {pkg.description && <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-2">{pkg.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(pkg.id)} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title={pkg.is_published ? 'Unpublish' : 'Publish'}>
                    {pkg.is_published ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-400" />}
                  </button>
                  <button onClick={() => openEdit(pkg)} className="p-1.5 rounded hover:bg-gray-100 transition-colors"><Edit2 size={14} className="text-gray-400" /></button>
                  <button onClick={() => { setDeleteId(pkg.id); setDeleteOpen(true); }} className="p-1.5 rounded hover:bg-red-50 transition-colors"><Trash2 size={14} className="text-gray-400" /></button>
                </div>
              </div>
              
              <div className="flex gap-4 mb-3 text-[11px] font-medium text-gray-500">
                <span>Free Washes: {pkg.wash_count || 0}</span>
                <span>Free Waxes: {pkg.wax_count || 0}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-3 border-t border-gray-50">
                {CATEGORY_LABELS.map(cat => (
                  <div key={cat.key} className="text-center">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#5f5e5e] leading-tight">{cat.short}</p>
                    <p className="text-xs font-extrabold text-[#1c1b1b] mt-0.5">{formatINR(pkg[cat.key])}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Package' : 'Add Package'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Basic Info</h4>
            <Input label="Package Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Protection" />
            <Textarea label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description" />
            
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-2">Pricing by Vehicle Category</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {CATEGORY_LABELS.map(cat => (
                  <Input key={cat.key} label={cat.label} type="number" value={prices[cat.key] || ''} onChange={e => updatePrice(cat.key, parseFloat(e.target.value) || 0)} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Included Free Washes" type="number" value={washCount || ''} onChange={e => setWashCount(parseInt(e.target.value) || 0)} />
              <Input label="Included Free Waxes" type="number" value={waxCount || ''} onChange={e => setWaxCount(parseInt(e.target.value) || 0)} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer pt-2">
              <button type="button" onClick={() => setActive(!active)} className={`w-10 h-5 rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5f5e5e]">{active ? 'Published' : 'Draft'}</span>
            </label>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Included Services</h4>
              <div className="h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50 flex flex-col gap-1">
                {services.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedServices.has(s.id)} onChange={(e) => {
                      const next = new Set(selectedServices);
                      if (e.target.checked) next.add(s.id); else next.delete(s.id);
                      setSelectedServices(next);
                    }}/>
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <h4 className="font-semibold text-gray-700">Included Inventory Products</h4>
                <button type="button" onClick={() => setSelectedProducts([...selectedProducts, { product_id: '', quantity: 1 }])} className="text-xs text-[#D32F2F] font-semibold flex items-center"><Plus size={12}/> Add Product</button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedProducts.map((p, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white" value={p.product_id} onChange={e => {
                      const next = [...selectedProducts];
                      next[idx].product_id = parseInt(e.target.value) || '';
                      setSelectedProducts(next);
                    }}>
                      <option value="">Select Product...</option>
                      {inventory.map((inv: any) => (
                         <option key={inv.id} value={inv.id}>{inv.product_name} ({inv.unit})</option>
                      ))}
                    </select>
                    <input type="number" min="1" className="w-20 px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="Qty" value={p.quantity} onChange={e => {
                      const next = [...selectedProducts];
                      next[idx].quantity = parseFloat(e.target.value) || 1;
                      setSelectedProducts(next);
                    }}/>
                    <button type="button" onClick={() => setSelectedProducts(selectedProducts.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                  </div>
                ))}
                {selectedProducts.length === 0 && <p className="text-xs text-gray-500 italic">No products tied to package (reductions will not happen automatically).</p>}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteId(null); }} onConfirm={handleDelete}
        title="Delete Package" message="This will permanently delete the package bundle. continue?" confirmLabel="Delete" loading={deleteMut.isPending} />
    </>
  );
}
