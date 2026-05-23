import { useState } from 'react';
import { Plus, Package as PackageIcon, Edit2, Trash2, ToggleLeft, ToggleRight, Loader2, Eye, EyeOff, Minus, Check, X as XIcon } from 'lucide-react';
import { usePackages, useCreatePackage, useUpdatePackage, useTogglePackage, useTogglePackageVisibility, useDeletePackage } from '../../api/hooks/usePackages';
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

// Type for a service row in the custom builder
interface ServiceRow {
  service_id: number | '';
  total_count: number;
}

// Tier colors for visual distinction
const TIER_COLORS: Record<string, { border: string; headerBg: string; badge: string }> = {
  bronze:   { border: 'border-l-amber-600',   headerBg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-800' },
  silver:   { border: 'border-l-slate-500',   headerBg: 'bg-slate-50',   badge: 'bg-slate-100 text-slate-700' },
  gold:     { border: 'border-l-yellow-500',  headerBg: 'bg-yellow-50',  badge: 'bg-yellow-100 text-yellow-800' },
  diamond:  { border: 'border-l-sky-500',     headerBg: 'bg-sky-50',     badge: 'bg-sky-100 text-sky-700' },
  platinum: { border: 'border-l-purple-600',  headerBg: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700' },
};

// All 6 service names from the flyer
const ALL_SERVICES = [
  'Car Foam Wash',
  'Body Wax Coat',
  'Two Wheeler Wash',
  'Two Wheeler Wax Coat',
  'Body Hybrid Ceramic Wax Coat',
  'Deep Cleaning',
];

function getTierKey(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(TIER_COLORS)) {
    if (lower.includes(key)) return key;
  }
  return '';
}

export default function PackagesPage() {
  const toast = useUIStore((s) => s.toast);
  const { data: pkgs, isLoading } = usePackages();
  const { data: servicesData } = useServices();
  const { data: inventoryData } = useInventory({});
  
  const createMut = useCreatePackage();
  const updateMut = useUpdatePackage();
  const toggleMut = useTogglePackage();
  const visibilityMut = useTogglePackageVisibility();
  const deleteMut = useDeletePackage();

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>(emptyPrices());
  const [washCount, setWashCount] = useState(0);
  const [waxCount, setWaxCount] = useState(0);
  const [active, setActive] = useState(true);
  const [visibleToCustomer, setVisibleToCustomer] = useState(true);
  
  // Dynamic services list for custom package builder
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  
  // Legacy: selected products (checkboxes, no count)
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const packages = pkgs?.data || [];
  const services = servicesData?.data || [];
  const inventory = inventoryData?.data || [];

  const updatePrice = (key: string, val: number) => setPrices(prev => ({ ...prev, [key]: val }));

  const addServiceRow = () => {
    setServiceRows([...serviceRows, { service_id: '', total_count: 1 }]);
  };

  const removeServiceRow = (idx: number) => {
    setServiceRows(serviceRows.filter((_, i) => i !== idx));
  };

  const updateServiceRow = (idx: number, field: keyof ServiceRow, value: any) => {
    const next = [...serviceRows];
    (next[idx] as any)[field] = value;
    setServiceRows(next);
  };

  const openAdd = () => {
    setEditItem(null); 
    setName(''); setDesc(''); setPrices(emptyPrices()); 
    setWashCount(0); setWaxCount(0); setActive(true);
    setVisibleToCustomer(true);
    setServiceRows([{ service_id: '', total_count: 1 }]);
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
    setVisibleToCustomer(pkg.visible_to_customer !== undefined ? !!pkg.visible_to_customer : true);
    
    // Init service rows from enriched package data
    const svcRows: ServiceRow[] = (pkg.services || []).map((s: any) => ({
      service_id: s.id,
      total_count: s.total_count || 1,
    }));
    setServiceRows(svcRows.length > 0 ? svcRows : []);
    
    // Init associated products
    const pArr = (pkg.products || []).map((p: any) => ({ product_id: p.product_id, quantity: p.quantity }));
    setSelectedProducts(pArr);
    
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast('error', 'Package name is required'); return; }
    
    // Validate service rows
    const validServiceRows = serviceRows.filter(r => r.service_id !== '');
    for (const row of validServiceRows) {
      if (!row.total_count || row.total_count <= 0) {
        toast('error', 'Each service must have a count greater than 0');
        return;
      }
    }

    try {
      const payload: any = {
        name, description: desc, 
        ...prices,
        wash_count: washCount, wax_count: waxCount,
        is_published: active,
        visible_to_customer: visibleToCustomer,
        products: selectedProducts,
      };

      // Use new format: services with total_count
      if (validServiceRows.length > 0) {
        payload.services = validServiceRows.map(r => ({
          service_id: r.service_id,
          total_count: r.total_count,
        }));
      } else {
        payload.services = [];
      }

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

  const handleVisibilityToggle = async (id: number) => {
    try { await visibilityMut.mutateAsync(id); } catch { toast('error', 'Failed to toggle visibility'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteMut.mutateAsync(deleteId); toast('success', 'Package deleted'); }
    catch { toast('error', 'Failed to delete'); }
    setDeleteOpen(false); setDeleteId(null);
  };

  // Helper to get service count by name from pkg.services
  const getServiceCount = (pkg: any, serviceName: string): number => {
    if (!pkg.services || pkg.services.length === 0) return 0;
    const svc = pkg.services.find((s: any) => s.name?.toLowerCase() === serviceName.toLowerCase());
    return svc ? (svc.total_count || 0) : 0;
  };

  return (
    <>
      <AdminTopBar
        title="Packages"
        subtitle={`${packages.length} packages`}
        actions={<Button onClick={openAdd} icon={<Plus size={16} />}>Create Package</Button>}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !packages.length ? (
        <EmptyState icon={PackageIcon} title="No Packages" description="Create your first package bundle" actionLabel="+ Create Package" onAction={openAdd} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {packages.map((pkg: any) => {
            const tierKey = getTierKey(pkg.name);
            const colors = TIER_COLORS[tierKey] || { border: 'border-l-red-500', headerBg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700' };

            // Extract "Pay For X" from description
            const paidMatch = pkg.description?.match(/Pay\s+(?:For\s+)?(\d+)\s+Car\s+Foam\s+Wash/i);
            const paidWashCount = paidMatch ? parseInt(paidMatch[1]) : (pkg.wash_count || 0);

            return (
              <div key={pkg.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${colors.border} overflow-hidden transition-all hover:shadow-md ${!pkg.is_published ? 'opacity-60' : ''}`}>
                {/* ─── Card Header ─── */}
                <div className={`${colors.headerBg} px-4 py-3 flex items-start justify-between`}>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wide">
                      {pkg.name.replace(/ Package$/i, '')}
                    </h3>
                    {paidWashCount > 0 && (
                      <p className="text-[10px] font-semibold text-gray-500 mt-0.5">
                        Pay For {paidWashCount} Car Foam Wash
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => handleVisibilityToggle(pkg.id)} className="p-1 rounded transition-colors hover:bg-white/60" title={pkg.visible_to_customer ? 'Visible' : 'Hidden'}>
                      {pkg.visible_to_customer ? <Eye size={14} className="text-blue-500" /> : <EyeOff size={14} className="text-gray-400" />}
                    </button>
                    <button onClick={() => handleToggle(pkg.id)} className="p-1 rounded hover:bg-white/60" title={pkg.is_published ? 'Active' : 'Draft'}>
                      {pkg.is_published ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                    </button>
                    <button onClick={() => openEdit(pkg)} className="p-1 rounded hover:bg-white/60"><Edit2 size={13} className="text-gray-400" /></button>
                    <button onClick={() => { setDeleteId(pkg.id); setDeleteOpen(true); }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-gray-400" /></button>
                  </div>
                </div>

                {/* ─── Visibility Badge ─── */}
                {!pkg.visible_to_customer && (
                  <div className="px-4 pt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 text-[8px] font-bold uppercase tracking-wider rounded-md">
                      <EyeOff size={9} /> Hidden
                    </span>
                  </div>
                )}

                {/* ─── Complementary Services ─── */}
                <div className="px-4 py-3">
                  <p className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-2">Complementary Services</p>
                  <div className="space-y-1.5">
                    {ALL_SERVICES.map(svcName => {
                      const count = getServiceCount(pkg, svcName);
                      const included = count > 0;
                      return (
                        <div key={svcName} className="flex items-center gap-1.5">
                          {included ? (
                            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                              <XIcon className="w-2.5 h-2.5 text-red-400" strokeWidth={3} />
                            </div>
                          )}
                          <span className={`text-[11px] leading-tight ${included ? 'text-gray-800 font-medium' : 'text-gray-400 line-through'}`}>
                            {included && count > 1 ? `${count} ` : ''}{svcName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ─── V2 Pricing Grid (Basic / Premium) ─── */}
                <div className="px-4 pb-3 pt-2 border-t border-gray-100">
                  {pkg.pricing && pkg.pricing.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-6 gap-1 mb-1">
                        <div className="text-[7px] font-bold uppercase tracking-widest text-gray-400"></div>
                        {['S.Hatch','M.Hatch','Sedan','Prem','Large'].map(l => (
                          <div key={l} className="text-center text-[7px] font-bold uppercase tracking-widest text-gray-400 leading-tight">{l}</div>
                        ))}
                      </div>
                      {['basic','premium'].map(pt => (
                        <div key={pt} className="grid grid-cols-6 gap-1 py-0.5">
                          <div className={`text-[8px] font-bold uppercase tracking-wider ${pt === 'premium' ? 'text-purple-600' : 'text-gray-500'}`}>{pt}</div>
                          {['SMALL_HATCHBACK','MEDIUM_HATCHBACK','SEDAN_SUV','PREMIUM_SEDAN','LARGE_CAR'].map(ct => {
                            const p = pkg.pricing.find((r: any) => r.car_type === ct && r.pricing_type === pt);
                            return <div key={ct} className="text-center text-[10px] font-extrabold text-gray-900">{p ? formatINR(p.price) : '—'}</div>;
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1">
                      {CATEGORY_LABELS.map(cat => (
                        <div key={cat.key} className="text-center">
                          <p className="text-[7px] font-bold uppercase tracking-widest text-gray-400 leading-tight">{cat.short}</p>
                          <p className="text-[11px] font-extrabold text-gray-900 mt-0.5">{formatINR(pkg[cat.key])}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal — Custom Package Builder */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Package' : 'Create Custom Package'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column — Basic Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Basic Info</h4>
            <Input label="Package Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Silver Package" />
            <Textarea label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Pay For 5 Car Foam Wash" />
            
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

            {/* Published toggle */}
            <label className="flex items-center gap-3 cursor-pointer pt-2">
              <button type="button" onClick={() => setActive(!active)} className={`w-10 h-5 rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5f5e5e]">{active ? 'Published' : 'Draft'}</span>
            </label>

            {/* Customer Visibility toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <button type="button" onClick={() => setVisibleToCustomer(!visibleToCustomer)} className={`w-10 h-5 rounded-full transition-colors ${visibleToCustomer ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${visibleToCustomer ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5f5e5e]">
                {visibleToCustomer ? 'Visible to Customers' : 'Hidden from Customers'}
              </span>
            </label>
          </div>

          {/* Right Column — Services & Products */}
          <div className="space-y-6">
            {/* ── Custom Service Builder ─────────────────────── */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <h4 className="font-semibold text-gray-700">Package Services</h4>
                <button type="button" onClick={addServiceRow} className="text-xs text-[#D32F2F] font-semibold flex items-center gap-0.5 hover:underline">
                  <Plus size={12} /> Add Service
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Select a service and how many times it's included in this package.</p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {serviceRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s`, animationFillMode: 'forwards' }}>
                    {/* Service dropdown */}
                    <select
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F]/30 transition-all"
                      value={row.service_id}
                      onChange={e => updateServiceRow(idx, 'service_id', parseInt(e.target.value) || '')}
                    >
                      <option value="">Select Service…</option>
                      {services.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {/* Count input */}
                    <div className="relative w-24">
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F]/30 transition-all"
                        placeholder="Count"
                        value={row.total_count}
                        onChange={e => updateServiceRow(idx, 'total_count', parseInt(e.target.value) || 1)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold">×</span>
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeServiceRow(idx)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                ))}
                {serviceRows.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-400 italic mb-2">No services added yet</p>
                    <button type="button" onClick={addServiceRow} className="text-xs text-[#D32F2F] font-bold hover:underline">
                      + Add your first service
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Inventory Products ──────────────────────────── */}
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
                {selectedProducts.length === 0 && <p className="text-xs text-gray-500 italic">No products tied to package.</p>}
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
