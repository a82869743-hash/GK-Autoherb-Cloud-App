import { useState } from 'react';
import { Plus, Wrench, Edit2, Trash2, ToggleLeft, ToggleRight, Sparkles, Clock, CheckCircle2, ShieldCheck, Car } from 'lucide-react';
import { useServices, useCreateService, useUpdateService, useToggleService, useDeleteService } from '../../api/hooks/useServices';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
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
  const [features, setFeatures] = useState('');
  const [whatsIncluded, setWhatsIncluded] = useState('');
  const [processSteps, setProcessSteps] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [prices, setPrices] = useState<Record<string, number>>({
    price_hatchback: 0, price_medium_hatchback: 0, price_sedan: 0, price_premium_sedan: 0, price_suv: 0,
  });
  const [active, setActive] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [premium, setPremium] = useState(false);

  const services = data?.data || [];

  const updatePrice = (key: string, val: number) => setPrices(prev => ({ ...prev, [key]: val }));

  const formatListToStr = (val: any) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join('\n');
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.join('\n') : val;
      } catch {
        return val;
      }
    }
    return '';
  };

  const openAdd = () => {
    setEditItem(null); setName(''); setDesc(''); setFeatures(''); setWhatsIncluded(''); setProcessSteps(''); setImageUrl('');
    setPrices({ price_hatchback: 0, price_medium_hatchback: 0, price_sedan: 0, price_premium_sedan: 0, price_suv: 0 });
    setActive(true); setPremium(false); setDurationMinutes(60); setModalOpen(true);
  };

  const openEdit = (svc: any) => {
    setEditItem(svc); setName(svc.name); setDesc(svc.description || '');
    setFeatures(formatListToStr(svc.features_json));
    setWhatsIncluded(formatListToStr(svc.whats_included_json));
    setProcessSteps(formatListToStr(svc.process_json));
    setImageUrl(svc.image_url || '');
    setPrices({
      price_hatchback: parseFloat(svc.price_hatchback) || 0,
      price_medium_hatchback: parseFloat(svc.price_medium_hatchback) || 0,
      price_sedan: parseFloat(svc.price_sedan) || 0,
      price_premium_sedan: parseFloat(svc.price_premium_sedan) || 0,
      price_suv: parseFloat(svc.price_suv) || 0,
    });
    setActive(!!svc.is_active); setPremium(!!svc.is_premium); setDurationMinutes(svc.duration_minutes || 60); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast('error', 'Name is required'); return; }
    try {
      const payload = {
        name,
        description: desc,
        features_json: features.split('\n').map(s => s.trim()).filter(Boolean),
        whats_included_json: whatsIncluded.split('\n').map(s => s.trim()).filter(Boolean),
        process_json: processSteps.split('\n').map(s => s.trim()).filter(Boolean),
        image_url: imageUrl,
        ...prices,
        is_active: active,
        is_premium: premium,
        duration_minutes: durationMinutes
      };
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

  const activeServices = services.filter((s: any) => s.is_active).length;
  const premiumServices = services.filter((s: any) => s.is_premium).length;
  const avgDuration = services.length > 0
    ? Math.round(services.reduce((sum: number, s: any) => sum + (s.duration_minutes || 60), 0) / services.length)
    : 60;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title="Services Catalog"
        subtitle="Configure detailing treatments, tiered vehicle prices, and job bay turnaround times"
        badge={`${services.length} services`}
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#D32F2F] text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Catalog Services"
            value={`${services.length}`}
            subtitle="Configured wash & detail items"
            icon={<Wrench className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: `${services.length} total`, positive: true }}
          />
          <AdminMetricCard
            title="Active Treatments"
            value={`${activeServices}`}
            subtitle="Bookable on app & studio POS"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${Math.round((activeServices / (services.length || 1)) * 100)}% active`, positive: true }}
          />
          <AdminMetricCard
            title="Signature Premium"
            value={`${premiumServices}`}
            subtitle="PPF, Ceramic, Graphene"
            icon={<Sparkles className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'High Margin', positive: true }}
          />
          <AdminMetricCard
            title="Avg Bay Duration"
            value={`${avgDuration} min`}
            subtitle="Turnaround bay standard"
            icon={<Clock className="w-5 h-5 text-sky-600" />}
            variant="sky"
            trend={{ text: 'Slot duration', positive: true }}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
            <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Services Found</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">Create your first service treatment in catalog</p>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#D32F2F] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 hover:bg-[#b71c1c]"
            >
              + Add Service
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc: any) => (
              <div
                key={svc.id}
                className={`bg-white rounded-3xl p-5 shadow-sm border transition-all flex flex-col justify-between ${
                  svc.is_active ? 'border-slate-100' : 'border-slate-200/60 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{svc.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        {svc.is_premium ? (
                          <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full inline-flex items-center gap-1">
                            <Sparkles size={10} /> Premium
                          </span>
                        ) : null}
                        {svc.duration_minutes ? (
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" /> {svc.duration_minutes} mins
                          </span>
                        ) : null}
                      </div>
                      {svc.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{svc.description}</p>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(svc.id)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                        title={svc.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {svc.is_active ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} className="text-slate-400" />}
                      </button>
                      <button
                        onClick={() => openEdit(svc)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => { setDeleteId(svc.id); setDeleteOpen(true); }}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tiered Vehicle Pricing Row */}
                <div className="grid grid-cols-5 gap-1 mt-4 pt-3 border-t border-slate-100">
                  {CATEGORY_LABELS.map(cat => (
                    <div key={cat.key} className="text-center bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight">{cat.short}</p>
                      <p className="text-[11px] font-black text-slate-900 mt-0.5">{formatINR(svc[cat.key])}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Service Details & Catalog' : 'Add New Service'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>{editItem ? 'Save Service' : 'Create Service'}</Button></>}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 py-1">
          <Input label="Service Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Executive Foam Wash" />
          
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Service Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Comprehensive description of the service displayed to customers..."
              rows={3}
              className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
            />
          </div>

          <Input label="Banner / Icon Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/wash-banner.jpg" />

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Key Features & Highlights (1 item per line)</label>
            <textarea
              value={features}
              onChange={e => setFeatures(e.target.value)}
              placeholder="High pressure snow foam wash&#10;pH neutral shampoo wash&#10;Microfiber hand dry"
              rows={3}
              className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">What's Included (1 item per line)</label>
            <textarea
              value={whatsIncluded}
              onChange={e => setWhatsIncluded(e.target.value)}
              placeholder="Underbody pressure wash&#10;Dashboard cleaning & polish&#10;Tyre dressing"
              rows={3}
              className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Process Steps (1 step per line)</label>
            <textarea
              value={processSteps}
              onChange={e => setProcessSteps(e.target.value)}
              placeholder="1. High pressure body rinse&#10;2. Snow foam application & soak&#10;3. Dual bucket microfiber wash&#10;4. Air dry & final inspection"
              rows={3}
              className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
            />
          </div>

          <Input label="Duration (Minutes) *" type="number" value={durationMinutes || ''} onChange={e => setDurationMinutes(parseInt(e.target.value) || 0)} placeholder="60" />
          
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Pricing by Vehicle Category (₹)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORY_LABELS.map(cat => (
                <Input key={cat.key} label={cat.label} type="number" value={prices[cat.key] || ''} onChange={e => updatePrice(cat.key, parseFloat(e.target.value) || 0)} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <button type="button" onClick={() => setActive(!active)} className={`w-10 h-5 rounded-full transition-colors ${active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{active ? 'Active' : 'Inactive'}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <button type="button" onClick={() => setPremium(!premium)} className={`w-10 h-5 rounded-full transition-colors ${premium ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${premium ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1"><Sparkles size={12} /> {premium ? 'Premium' : 'Standard'}</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteId(null); }} onConfirm={handleDelete}
        title="Delete Service" message="This will permanently delete the service from the catalog. Continue?" confirmLabel="Delete" loading={deleteMut.isPending} />
    </div>
  );
}
