import { useState } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Clock, DollarSign, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, ShieldCheck, CheckCircle2, Layers } from 'lucide-react';
import { usePremiumServices, useServiceAddons, useCreateAddon, useUpdateAddon, useDeleteAddon } from '../../api/hooks/usePremiumServices';
import { useUpdateService } from '../../api/hooks/useServices';
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
  { key: 'price_hatchback', short: 'Hatch' },
  { key: 'price_medium_hatchback', short: 'Med Hatch' },
  { key: 'price_sedan', short: 'Sedan' },
  { key: 'price_premium_sedan', short: 'Prem Sedan' },
  { key: 'price_suv', short: 'SUV' },
];

export default function PremiumServicesPage() {
  const toast = useUIStore((s) => s.toast);
  const { data: services, isLoading } = usePremiumServices();
  const updateSvc = useUpdateService();
  const createAddonMut = useCreateAddon();
  const updateAddonMut = useUpdateAddon();
  const deleteAddonMut = useDeleteAddon();

  // Expanded service (to show addons)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Addon modal state
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonServiceId, setAddonServiceId] = useState<number | null>(null);
  const [editAddon, setEditAddon] = useState<any>(null);
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState(0);
  const [addonDuration, setAddonDuration] = useState(30);

  // Service edit modal
  const [svcModalOpen, setSvcModalOpen] = useState(false);
  const [editSvc, setEditSvc] = useState<any>(null);
  const [svcPrices, setSvcPrices] = useState<Record<string, number>>({});
  const [svcDuration, setSvcDuration] = useState(60);
  const [svcDesc, setSvcDesc] = useState('');

  // Delete addon confirm
  const [deleteAddonData, setDeleteAddonData] = useState<{ serviceId: number; addonId: number } | null>(null);

  // Addon handlers
  const openAddAddon = (serviceId: number) => {
    setAddonServiceId(serviceId);
    setEditAddon(null);
    setAddonName('');
    setAddonPrice(0);
    setAddonDuration(30);
    setAddonModalOpen(true);
  };

  const openEditAddon = (serviceId: number, addon: any) => {
    setAddonServiceId(serviceId);
    setEditAddon(addon);
    setAddonName(addon.addon_name);
    setAddonPrice(parseFloat(addon.addon_price) || 0);
    setAddonDuration(addon.duration_minutes || 30);
    setAddonModalOpen(true);
  };

  const handleSaveAddon = async () => {
    if (!addonName.trim() || !addonServiceId) { toast('error', 'Add-on name is required'); return; }
    try {
      if (editAddon) {
        await updateAddonMut.mutateAsync({ serviceId: addonServiceId, addonId: editAddon.id, addon_name: addonName, addon_price: addonPrice, duration_minutes: addonDuration });
        toast('success', 'Add-on updated');
      } else {
        await createAddonMut.mutateAsync({ serviceId: addonServiceId, addon_name: addonName, addon_price: addonPrice, duration_minutes: addonDuration });
        toast('success', 'Add-on created');
      }
      setAddonModalOpen(false);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed');
    }
  };

  const handleDeleteAddon = async () => {
    if (!deleteAddonData) return;
    try {
      await deleteAddonMut.mutateAsync(deleteAddonData);
      toast('success', 'Add-on deleted');
    } catch { toast('error', 'Failed to delete add-on'); }
    setDeleteAddonData(null);
  };

  // Service edit handlers
  const openEditSvc = (svc: any) => {
    setEditSvc(svc);
    setSvcDesc(svc.description || '');
    setSvcDuration(svc.duration_minutes || 60);
    setSvcPrices({
      price_hatchback: parseFloat(svc.price_hatchback) || 0,
      price_medium_hatchback: parseFloat(svc.price_medium_hatchback) || 0,
      price_sedan: parseFloat(svc.price_sedan) || 0,
      price_premium_sedan: parseFloat(svc.price_premium_sedan) || 0,
      price_suv: parseFloat(svc.price_suv) || 0,
    });
    setSvcModalOpen(true);
  };

  const handleSaveSvc = async () => {
    if (!editSvc) return;
    try {
      await updateSvc.mutateAsync({ id: editSvc.id, description: svcDesc, duration_minutes: svcDuration, ...svcPrices });
      toast('success', 'Service updated');
      setSvcModalOpen(false);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed');
    }
  };

  const premiumList = services || [];
  const activeCount = premiumList.filter((s: any) => s.is_active).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title="Premium Detailing Treatments"
        subtitle="Manage signature ceramic, graphene, PPF coats and customizable add-on services"
        badge={`${premiumList.length} premium`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Premium Services"
            value={`${premiumList.length}`}
            subtitle="Signature treatments"
            icon={<Sparkles className="w-5 h-5 text-amber-600" />}
            variant="amber"
            trend={{ text: `${premiumList.length} tier offerings`, positive: true }}
          />
          <AdminMetricCard
            title="Active Treatments"
            value={`${activeCount}`}
            subtitle="Available on customer portal"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${Math.round((activeCount / (premiumList.length || 1)) * 100)}% active`, positive: true }}
          />
          <AdminMetricCard
            title="Add-on Customizers"
            value="Configurable"
            subtitle="Engine bay, glass polish, etc."
            icon={<Layers className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: 'Modular Upgrades', positive: true }}
          />
          <AdminMetricCard
            title="Vehicle Classes"
            value="5 Categories"
            subtitle="Hatch to Premium SUV"
            icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'Tiered pricing', positive: true }}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
        ) : !premiumList.length ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
            <Sparkles size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Premium Services</h3>
            <p className="text-xs text-slate-400 mt-1">Premium services are managed from the Services page. Mark a service as Premium to see it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {premiumList.map((svc: any) => (
              <PremiumServiceCard
                key={svc.id}
                svc={svc}
                isExpanded={expandedId === svc.id}
                onToggleExpand={() => setExpandedId(expandedId === svc.id ? null : svc.id)}
                onEdit={() => openEditSvc(svc)}
                onAddAddon={() => openAddAddon(svc.id)}
                onEditAddon={(addon: any) => openEditAddon(svc.id, addon)}
                onDeleteAddon={(addonId: number) => setDeleteAddonData({ serviceId: svc.id, addonId })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add-on Modal ──────────────────────────────── */}
      <Modal
        open={addonModalOpen}
        onClose={() => setAddonModalOpen(false)}
        title={editAddon ? 'Edit Add-on' : 'New Add-on'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddonModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAddon} loading={createAddonMut.isPending || updateAddonMut.isPending}>
              {editAddon ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          <Input label="Add-on Name" value={addonName} onChange={e => setAddonName(e.target.value)} placeholder="e.g. Engine Bay Dressing & Protection" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Price (₹)" type="number" value={addonPrice || ''} onChange={e => setAddonPrice(parseFloat(e.target.value) || 0)} />
            <Input label="Duration (min)" type="number" value={addonDuration || ''} onChange={e => setAddonDuration(parseInt(e.target.value) || 30)} />
          </div>
        </div>
      </Modal>

      {/* ── Service Edit Modal ────────────────────────── */}
      <Modal
        open={svcModalOpen}
        onClose={() => setSvcModalOpen(false)}
        title={`Edit: ${editSvc?.name || ''}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSvcModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSvc} loading={updateSvc.isPending}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          <Input label="Description" value={svcDesc} onChange={e => setSvcDesc(e.target.value)} placeholder="Service description" />
          <Input label="Duration (minutes)" type="number" value={svcDuration || ''} onChange={e => setSvcDuration(parseInt(e.target.value) || 60)} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Pricing by Vehicle Category (₹)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {CATEGORY_LABELS.map(cat => (
                <Input
                  key={cat.key}
                  label={`${cat.short}`}
                  type="number"
                  value={svcPrices[cat.key] || ''}
                  onChange={e => setSvcPrices(prev => ({ ...prev, [cat.key]: parseFloat(e.target.value) || 0 }))}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Delete Addon Confirm ──────────────────────── */}
      <ConfirmDialog
        open={!!deleteAddonData}
        onClose={() => setDeleteAddonData(null)}
        onConfirm={handleDeleteAddon}
        title="Delete Add-on"
        message="This will permanently remove this add-on option. Continue?"
        confirmLabel="Delete"
        loading={deleteAddonMut.isPending}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Premium Service Card Component (with addons accordion)
// ═══════════════════════════════════════════════════════════
function PremiumServiceCard({
  svc,
  isExpanded,
  onToggleExpand,
  onEdit,
  onAddAddon,
  onEditAddon,
  onDeleteAddon,
}: {
  svc: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onAddAddon: () => void;
  onEditAddon: (addon: any) => void;
  onDeleteAddon: (addonId: number) => void;
}) {
  const { data: addons } = useServiceAddons(isExpanded ? svc.id : undefined);

  return (
    <div className={`bg-white rounded-3xl shadow-sm border transition-all ${svc.is_active ? 'border-slate-100' : 'border-slate-200/60 opacity-60'}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-[#D32F2F]">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm truncate">{svc.name}</h3>
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">Premium</span>
              </div>
              {svc.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{svc.description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {svc.duration_minutes && (
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-2">
                <Clock size={12} /> {svc.duration_minutes}m
              </span>
            )}
            <button onClick={onEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Edit2 size={14} /></button>
            <button onClick={onToggleExpand} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Pricing row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-4 pt-3 border-t border-slate-100">
          {CATEGORY_LABELS.map(cat => (
            <div key={cat.key} className="text-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 leading-tight">{cat.short}</p>
              <p className="text-xs font-black text-slate-900 mt-0.5">{formatINR(svc[cat.key])}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Addons Accordion */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5 rounded-b-3xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Add-ons</p>
            <button
              onClick={onAddAddon}
              className="px-3 py-1 bg-[#D32F2F] text-white font-bold text-xs rounded-xl hover:bg-[#b71c1c] transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus size={12} /> Add Upgrade
            </button>
          </div>

          {!addons?.length ? (
            <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-2xl border border-slate-100">No add-ons configured for this treatment</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {addons.map((addon: any) => (
                <div key={addon.id} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${addon.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{addon.addon_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                        <span className="font-bold text-[#D32F2F]">{formatINR(addon.addon_price)}</span>
                        <span>•</span>
                        <span>{addon.duration_minutes}m duration</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEditAddon(addon)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Edit2 size={12} /></button>
                    <button onClick={() => onDeleteAddon(addon.id)} className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
