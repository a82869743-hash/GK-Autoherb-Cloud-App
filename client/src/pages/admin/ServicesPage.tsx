import { useState } from 'react';
import { Plus, Wrench, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useServices, useCreateService, useUpdateService, useToggleService, useDeleteService } from '../../api/hooks/useServices';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
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

export default function ServicesPage() {
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useServices();
  const createMut = useCreateService();
  const updateMut = useUpdateService();
  const toggleMut = useToggleService();
  const deleteMut = useDeleteService();

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({
    price_hatchback: 0, price_medium_hatchback: 0, price_sedan: 0, price_premium_sedan: 0, price_suv: 0,
  });
  const [active, setActive] = useState(true);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const services = data?.data || [];

  const updatePrice = (key: string, val: number) => setPrices(prev => ({ ...prev, [key]: val }));

  const openAdd = () => {
    setEditItem(null); setName(''); setDesc('');
    setPrices({ price_hatchback: 0, price_medium_hatchback: 0, price_sedan: 0, price_premium_sedan: 0, price_suv: 0 });
    setActive(true); setModalOpen(true);
  };

  const openEdit = (svc: any) => {
    setEditItem(svc); setName(svc.name); setDesc(svc.description || '');
    setPrices({
      price_hatchback: parseFloat(svc.price_hatchback) || 0,
      price_medium_hatchback: parseFloat(svc.price_medium_hatchback) || 0,
      price_sedan: parseFloat(svc.price_sedan) || 0,
      price_premium_sedan: parseFloat(svc.price_premium_sedan) || 0,
      price_suv: parseFloat(svc.price_suv) || 0,
    });
    setActive(!!svc.is_active); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast('error', 'Name is required'); return; }
    try {
      const payload = { name, description: desc, ...prices, is_active: active };
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, ...payload });
        toast('success', 'Service updated');
      } else {
        await createMut.mutateAsync(payload);
        toast('success', 'Service created');
      }
      setModalOpen(false);
    } catch (err: any) { toast('error', err?.response?.data?.error || 'Failed'); }
  };

  const handleToggle = async (id: number) => {
    try { await toggleMut.mutateAsync(id); } catch { toast('error', 'Failed to toggle'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteMut.mutateAsync(deleteId); toast('success', 'Service deleted'); }
    catch { toast('error', 'Failed to delete'); }
    setDeleteOpen(false); setDeleteId(null);
  };

  return (
    <>
      <AdminTopBar
        title="Services & Packages"
        subtitle={`${services.length} services`}
        actions={<Button onClick={openAdd} icon={<Plus size={16} />}>Add Service</Button>}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !services.length ? (
        <EmptyState icon={Wrench} title="No Services" description="Create your first service" actionLabel="+ Add Service" onAction={openAdd} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc: any) => (
            <div key={svc.id} className={`bg-white rounded-lg p-5 shadow-sm border-l-4 transition-all ${svc.is_active ? 'border-[#D32F2F]' : 'border-gray-300 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[#1c1b1b] text-sm">{svc.name}</h3>
                  {svc.description && <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-2">{svc.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(svc.id)} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title={svc.is_active ? 'Deactivate' : 'Activate'}>
                    {svc.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-400" />}
                  </button>
                  <button onClick={() => openEdit(svc)} className="p-1.5 rounded hover:bg-gray-100 transition-colors"><Edit2 size={14} className="text-gray-400" /></button>
                  <button onClick={() => { setDeleteId(svc.id); setDeleteOpen(true); }} className="p-1.5 rounded hover:bg-red-50 transition-colors"><Trash2 size={14} className="text-gray-400" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-50">
                {CATEGORY_LABELS.map(cat => (
                  <div key={cat.key} className="text-center">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#5f5e5e] leading-tight">{cat.short}</p>
                    <p className="text-xs font-extrabold text-[#1c1b1b] mt-0.5">{formatINR(svc[cat.key])}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Service' : 'Add Service'} size="md"
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}
      >
        <div className="space-y-4">
          <Input label="Service Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Interior Cleaning" />
          <Input label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-2">Pricing by Vehicle Category</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {CATEGORY_LABELS.map(cat => (
                <Input key={cat.key} label={cat.label} type="number" value={prices[cat.key] || ''} onChange={e => updatePrice(cat.key, parseFloat(e.target.value) || 0)} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => setActive(!active)} className={`w-10 h-5 rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-[#5f5e5e]">{active ? 'Active' : 'Inactive'}</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteId(null); }} onConfirm={handleDelete}
        title="Delete Service" message="This will permanently delete the service. Continue?" confirmLabel="Delete" loading={deleteMut.isPending} />
    </>
  );
}
