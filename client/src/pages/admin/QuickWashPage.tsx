import { useState, useEffect, useCallback } from 'react';
import { Droplets, Clock, CheckCircle2, Truck, Plus, RefreshCw, Search, Download, Check, Phone } from 'lucide-react';
import { OpsPageTitle, ChipRow, EmptyBlock, Skeleton, BottomSheet } from '../../components/ops/ui';
import { priceForSegment } from '../../utils/pricing';
import { useQuickWashes, useQuickWashStats, useCreateQuickWash, useUpdateWashStatus } from '../../api/hooks/useQuickWash';
import { useCustomerSearch } from '../../api/hooks/useSearch';
import { useBrands, useModels } from '../../api/hooks/useVehicles';
import { useServices } from '../../api/hooks/useServices';
import type { QuickWashBooking, WashStatus } from '../../types';
import { useToastStore } from '../../store/toastStore';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';

const STATUS_CONFIG: Record<WashStatus, { label: string; color: string; bg: string; icon: React.ElementType; next?: WashStatus }> = {
  pending:   { label: 'In Queue',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: Clock,        next: 'washing' },
  washing:   { label: 'Washing',   color: 'text-[#b71c1c]',    bg: 'bg-red-50 border-red-200',       icon: Droplets,     next: 'completed' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, next: 'delivered' },
  delivered: { label: 'Delivered', color: 'text-slate-500',    bg: 'bg-slate-50 border-slate-200',       icon: Truck },
};

const VEHICLE_CATEGORIES = [
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'medium_hatchback', label: 'Medium Hatchback' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'premium_sedan', label: 'Premium Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'luxury', label: 'Luxury' },
];

const WASH_PHASE_LABELS = {
  pre_wash: 'Pre-Wash',
  foam_apply: 'Foam Apply',
  pressure_rinse: 'Rinse',
  interior_clean: 'Vacuum',
  dry_polish: 'Dry/Polish',
};

const PHASE_ORDER = ['pre_wash', 'foam_apply', 'pressure_rinse', 'interior_clean', 'dry_polish'];

export default function QuickWashPage() {
  const [filter, setFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: washes = [], isLoading, refetch } = useQuickWashes({ status: filter !== 'all' ? filter : undefined });
  const { data: stats } = useQuickWashStats();
  const updateStatus = useUpdateWashStatus();
  const { addToast } = useToastStore();

  const handleStatusAdvance = async (id: number, nextStatus: WashStatus) => {
    try {
      await updateStatus.mutateAsync({ id, wash_status: nextStatus });
      addToast('success', `Status updated to ${STATUS_CONFIG[nextStatus].label}`);
    } catch {
      addToast('error', 'Failed to update status');
    }
  };

  const advancePhase = async (wash: QuickWashBooking) => {
    const currentIdx = PHASE_ORDER.indexOf(wash.current_phase || 'pre_wash');
    const nextPhase = currentIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIdx + 1] : 'complete';
    try {
      const { default: api } = await import('../../api/axiosInstance');
      await api.patch(`/quick-wash/${wash.id}/phase`, { phase: nextPhase });
      addToast('success', `Wash phase advanced to ${nextPhase === 'complete' ? 'Completed' : WASH_PHASE_LABELS[nextPhase as keyof typeof WASH_PHASE_LABELS]}`);
      refetch();
    } catch {
      addToast('error', 'Failed to advance wash phase');
    }
  };

  const downloadInvoice = async (wash: QuickWashBooking) => {
    try {
      const { default: api } = await import('../../api/axiosInstance');
      const res = await api.get(`/quick-wash/${wash.id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QuickWash-Invoice-${wash.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      addToast('error', 'Failed to download invoice');
    }
  };

  const TABS: { key: string; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Waiting', count: stats?.pending_count },
    { key: 'washing', label: 'Washing', count: stats?.washing_count },
    { key: 'completed', label: 'Ready', count: stats?.completed_count },
    { key: 'delivered', label: 'Released', count: stats?.delivered_count },
  ];
  const NEXT_LABEL: Record<string, string> = { washing: 'Start washing', completed: 'Mark ready', delivered: 'Hand over' };

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-28 font-sans">
      <OpsPageTitle
        kicker="Walk-in express"
        title="Quick wash"
        subtitle="Live wash bay queue"
        action={
          <button onClick={() => refetch()} className="h-10 w-10 rounded-full bg-white shadow-app flex items-center justify-center text-slate-700" aria-label="Refresh">
            <RefreshCw size={17} />
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Waiting', value: stats?.pending_count || 0, tone: 'text-amber-600' },
          { label: 'Washing', value: stats?.washing_count || 0, tone: 'text-[#D32F2F]' },
          { label: 'Ready', value: stats?.completed_count || 0, tone: 'text-emerald-600' },
          { label: 'Released', value: stats?.delivered_count || 0, tone: 'text-slate-500' },
        ].map((k) => (
          <div key={k.label} className="app-card px-2 py-3 text-center">
            <p className={`font-display text-[22px] font-extrabold leading-none ${k.tone}`}>{k.value}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <ChipRow value={filter} onChange={setFilter} items={TABS} />

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : washes.length === 0 ? (
        <EmptyBlock
          icon={<Droplets size={26} />}
          title="No cars in this queue"
          text="Add a walk-in to start."
          action={<button onClick={() => setShowCreateModal(true)} className="app-btn-primary h-11"><Plus size={16} /> New wash</button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {washes.map((wash: QuickWashBooking) => {
            const config = STATUS_CONFIG[wash.wash_status];
            const StatusIcon = config.icon;
            const phaseIdx = PHASE_ORDER.indexOf(wash.current_phase || 'pre_wash');
            return (
              <div key={wash.id} className="app-card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="relative h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                      <VehicleBrandBadge brand={wash.vehicle_brand} model={wash.vehicle_model} size="md" showText={false} />
                      <span className="absolute -top-1.5 -left-1.5 h-6 min-w-6 px-1 rounded-full bg-[#111] text-white text-[11px] font-bold flex items-center justify-center">#{wash.queue_position}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-extrabold text-[16px] text-slate-900 truncate tracking-wide">{wash.vehicle_reg_no || 'Walk-in'}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold shrink-0 ${config.bg} ${config.color}`}>
                          <StatusIcon size={12} /> {config.label}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-slate-500 truncate">{[wash.vehicle_brand, wash.vehicle_model].filter(Boolean).join(' ')}</p>
                      {wash.service_name && <p className="text-[12.5px] font-bold text-[#D32F2F] truncate">{wash.service_name}</p>}
                    </div>
                  </div>

                  {wash.customer_name && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-[13px] font-semibold text-slate-700 truncate">{wash.customer_name}</span>
                      {wash.customer_mobile && (
                        <a href={`tel:${wash.customer_mobile}`} className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0" aria-label="Call">
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  )}
                  {wash.notes && <p className="mt-2 text-[12px] text-slate-400 line-clamp-2">{wash.notes}</p>}

                  {wash.wash_status === 'washing' && (
                    <div className="mt-3">
                      <div className="flex gap-1">
                        {PHASE_ORDER.map((ph, i) => (
                          <span key={ph} className={`h-1.5 flex-1 rounded-full ${i < phaseIdx ? 'bg-[#D32F2F]' : i === phaseIdx ? 'bg-[#D32F2F]/50 animate-pulse' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[12px] font-bold text-slate-700">{WASH_PHASE_LABELS[(wash.current_phase || 'pre_wash') as keyof typeof WASH_PHASE_LABELS]}</span>
                        <button onClick={() => advancePhase(wash)} className="text-[12.5px] font-bold text-[#D32F2F]">Next phase →</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-slate-100 p-3">
                  <button onClick={() => downloadInvoice(wash)} className="app-btn h-11 px-3.5 bg-slate-100 text-slate-800" aria-label="Invoice">
                    <Download size={16} />
                  </button>
                  {config.next ? (
                    <button onClick={() => handleStatusAdvance(wash.id, config.next!)} disabled={updateStatus.isPending} className="app-btn-primary h-11">
                      {NEXT_LABEL[config.next] || STATUS_CONFIG[config.next].label}
                    </button>
                  ) : (
                    <span className="app-btn h-11 bg-slate-50 text-slate-400">Released</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 app-btn-primary h-12 px-5 rounded-full shadow-app-lg"
      >
        <Plus size={18} /> New wash
      </button>

      {showCreateModal && <CreateQuickWashModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

// ─── Create Quick Wash Modal ────────────────
function CreateQuickWashModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    customer_id: undefined as number | undefined,
    vehicle_id: undefined as number | undefined,
    service_id: undefined as number | undefined,
    vehicle_reg_no: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_category: 'hatchback',
    notes: '',
    customer_name: '',
    customer_mobile: '',
  });
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Data hooks
  const { data: searchResults = [] } = useCustomerSearch(customerQuery);
  const { data: brandsData } = useBrands();
  const { data: modelsData } = useModels(form.vehicle_brand);
  const { data: servicesData } = useServices({ active_only: true });
  const createMutation = useCreateQuickWash();
  const { addToast } = useToastStore();

  // Parse brands and models from API responses
  const brands: string[] = brandsData?.data || [];
  const models: string[] = modelsData?.data || [];
  const services: any[] = servicesData?.data || [];

  // Auto-fill customer/vehicle details when typing registration number
  useEffect(() => {
    const reg = form.vehicle_reg_no.trim();
    if (reg.length < 4) {
      setIsAutoFilled(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { default: api } = await import('../../api/axiosInstance');
        const res = await api.get(`/vehicles/all?search=${encodeURIComponent(reg)}`);
        const matches = res.data.data || [];
        const match = matches.find((v: any) => v.registration_no?.toUpperCase() === reg.toUpperCase()) || matches[0];
        if (match && match.registration_no?.toUpperCase() === reg.toUpperCase()) {
          setForm((f) => ({
            ...f,
            customer_id: match.customer_id,
            vehicle_id: match.id,
            vehicle_brand: match.brand || f.vehicle_brand,
            vehicle_model: match.model || f.vehicle_model,
            vehicle_category: match.category || f.vehicle_category,
          }));
          if (match.customer_name) {
            setSelectedCustomerName(`${match.customer_name} (${match.customer_mobile || 'No mobile'})`);
            setCustomerQuery(match.customer_name);
          }
          setIsAutoFilled(true);
        }
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [form.vehicle_reg_no]);

  // Auto-fill customer's vehicles when a customer is selected
  const handleSelectCustomer = useCallback(async (c: { id: number; name: string; mobile: string }) => {
    setForm((f) => ({ ...f, customer_id: c.id }));
    setSelectedCustomerName(`${c.name} (${c.mobile})`);
    setCustomerQuery(c.name);
    setShowCustomerDropdown(false);

    // Try to fetch the customer's primary vehicle
    try {
      const { default: api } = await import('../../api/axiosInstance');
      const res = await api.get(`/vehicles/by-customer/${c.id}`);
      if (res.data?.success && res.data.data?.length > 0) {
        const primary = res.data.data.find((v: any) => v.is_primary) || res.data.data[0];
        setForm((f) => ({
          ...f,
          vehicle_id: primary.id,
          vehicle_reg_no: primary.registration_no || '',
          vehicle_brand: primary.brand || '',
          vehicle_model: primary.model || '',
          vehicle_category: primary.category || 'hatchback',
        }));
      }
    } catch {
      // silently fail — no vehicles found
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_reg_no && !form.customer_id) {
      addToast('error', 'Please provide a vehicle registration or select a customer');
      return;
    }

    const finalBrand = form.vehicle_brand === 'Others' ? customBrand : form.vehicle_brand;
    const finalModel = (form.vehicle_brand === 'Others' || form.vehicle_model === 'Other') ? customModel : form.vehicle_model;
    if (!form.customer_id && !isAutoFilled && form.customer_mobile.replace(/\D/g, '').length !== 10) {
      addToast('error', "New car — add the customer's 10-digit mobile number");
      return;
    }

    try {
      const payload = {
        ...form,
        vehicle_brand: finalBrand,
        vehicle_model: finalModel,
        service_id: form.service_id || undefined,
        vehicle_id: form.vehicle_id || undefined,
        customer_id: form.customer_id || undefined,
      };
      const result = await createMutation.mutateAsync(payload);
      addToast('success', result.message || 'Quick wash booked!');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create quick wash';
      addToast('error', msg);
    }
  };

  const washServices = services.filter((s: any) => s.vehicle_type !== 'bike' && /wash|foam|spa|clean/i.test(`${s.name} ${s.category || ''}`));
  const pickServices = washServices.length ? washServices : services;

  return (
    <BottomSheet open onClose={onClose} title="New quick wash">
      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        <div>
          <label className="app-label">Number plate *</label>
          <input
            type="text"
            value={form.vehicle_reg_no}
            onChange={(e) => setForm((f) => ({ ...f, vehicle_reg_no: e.target.value.toUpperCase() }))}
            placeholder="GJ06AB1234"
            className="app-input h-14 text-[19px] font-display font-extrabold tracking-wider uppercase"
            autoFocus
          />
          {isAutoFilled && (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
              <Check size={13} /> Found — customer and car filled in
            </p>
          )}
        </div>

        <div className="relative">
          <label className="app-label">Customer (optional)</label>
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={selectedCustomerName || customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setSelectedCustomerName('');
                setShowCustomerDropdown(true);
                if (!e.target.value) setForm((f) => ({ ...f, customer_id: undefined, vehicle_id: undefined }));
              }}
              onFocus={() => customerQuery && setShowCustomerDropdown(true)}
              placeholder="Name or mobile"
              className="app-input pl-10"
            />
          </div>
          {showCustomerDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-2xl bg-white shadow-app-lg">
              {searchResults.map((c: { id: number; name: string; mobile: string }) => (
                <button key={c.id} type="button" onClick={() => handleSelectCustomer(c)} className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] active:bg-slate-50">
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  <span className="text-[12px] text-slate-400">{c.mobile}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!form.customer_id && !isAutoFilled && (
          <div className="rounded-2xl bg-amber-50 p-3 space-y-2.5">
            <p className="text-[12.5px] font-semibold text-amber-800">New customer? Add their details — the car is saved to their account.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                placeholder="Name"
                className="app-input bg-white"
              />
              <input
                type="tel"
                inputMode="numeric"
                value={form.customer_mobile}
                onChange={(e) => setForm((f) => ({ ...f, customer_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="Mobile *"
                className="app-input bg-white"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="app-label">Brand</label>
            <select
              value={form.vehicle_brand}
              onChange={(e) => {
                setForm((f) => ({ ...f, vehicle_brand: e.target.value, vehicle_model: '' }));
                setCustomBrand('');
                setCustomModel('');
              }}
              className="app-input"
            >
              <option value="">Brand</option>
              {brands.map((b: string) => <option key={b} value={b}>{b}</option>)}
              <option value="Others">Others</option>
            </select>
          </div>
          <div>
            <label className="app-label">Model</label>
            <select
              value={form.vehicle_model}
              onChange={(e) => {
                setForm((f) => ({ ...f, vehicle_model: e.target.value }));
                setCustomModel('');
              }}
              disabled={!form.vehicle_brand || form.vehicle_brand === 'Others'}
              className="app-input disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Model</option>
              {models.map((m: string) => <option key={m} value={m}>{m}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {(form.vehicle_brand === 'Others' || form.vehicle_model === 'Other') && (
          <div className="grid grid-cols-2 gap-3">
            {form.vehicle_brand === 'Others' && (
              <div>
                <label className="app-label">Brand name</label>
                <input type="text" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="Porsche" className="app-input" required />
              </div>
            )}
            <div>
              <label className="app-label">Model name</label>
              <input type="text" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="Cayenne" className="app-input" required />
            </div>
          </div>
        )}

        <div>
          <label className="app-label">Car type</label>
          <div className="-mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar">
            {VEHICLE_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                onClick={() => setForm((f) => ({ ...f, vehicle_category: cat.value }))}
                className={`app-chip shrink-0 ${form.vehicle_category === cat.value ? 'app-chip-on' : 'app-chip-off'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="app-label">Wash</label>
          <div className="grid grid-cols-2 gap-2">
            {pickServices.map((svc: any) => {
              const on = form.service_id === svc.id;
              return (
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => setForm((f) => ({ ...f, service_id: on ? undefined : svc.id }))}
                  className={`rounded-2xl border p-3 text-left transition-colors ${on ? 'border-[#D32F2F] bg-red-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className="font-display text-[13px] font-bold leading-tight text-slate-900 line-clamp-2">{svc.name}</p>
                  {(() => {
                    const p = priceForSegment(svc, form.vehicle_category);
                    return p > 0 ? <p className="mt-1 font-display text-[13px] font-extrabold text-[#D32F2F]">₹{p.toLocaleString('en-IN')}</p> : null;
                  })()}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="app-label">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Any special instructions…"
            className="app-input h-auto py-3 resize-none"
          />
        </div>

        <button type="submit" disabled={createMutation.isPending} className="app-btn-primary w-full">
          {createMutation.isPending ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Plus size={17} />} Add to queue
        </button>
      </form>
    </BottomSheet>
  );
}
