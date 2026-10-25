import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, Search, CheckCircle, Loader2, X, ArrowLeft, ChevronRight } from 'lucide-react';
import { SectionTitle } from '../../components/ops/ui';
import ServiceImage from '../../components/customer/ServiceImage';
import { segmentForVehicle, priceForSegment, SEGMENT_LABEL } from '../../utils/pricing';
import { useCreateJobCart, useVehicleLookup, useAddService, useUploadPhoto } from '../../api/hooks/useJobCarts';
import { useBrands, useModels, useVariants } from '../../api/hooks/useVehicles';
import api from '../../api/axiosInstance';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FileUpload from '../../components/ui/FileUpload';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import type { InventoryItem } from '../../types';

interface ProductRow {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_cost: number;
  unit: string;
}

interface ServiceBlock {
  key: string;
  service_name: string;
  is_custom: boolean;
  service_price: number;
  labor_charges: number;
  products: ProductRow[];
}

const emptyProduct = (): ProductRow => ({
  product_id: 0, product_name: '', quantity: 1, unit_cost: 0, unit: 'pcs',
});

const emptyService = (): ServiceBlock => ({
  key: crypto.randomUUID(),
  service_name: '',
  is_custom: false,
  service_price: 0,
  labor_charges: 0,
  products: [],
});

export default function JobCartCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;

  const toast = useUIStore((s) => s.toast);
  const createCart = useCreateJobCart();
  const addServiceMut = useAddService();
  const uploadPhotoMut = useUploadPhoto();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'staff';
  const cancelPath = isStaff ? '/staff/job-carts' : '/admin/job-carts';

  // ─── Form state ─────────────────────────
  const [regNo, setRegNo] = useState(prefill?.vehicle_reg_no || '');
  const [lookupQuery, setLookupQuery] = useState('');
  const [customerName, setCustomerName] = useState(prefill?.customer_name || '');
  const [customerMobile, setCustomerMobile] = useState(prefill?.customer_mobile || '');
  const [customerEmail, setCustomerEmail] = useState(prefill?.customer_email || '');
  const [carBrand, setCarBrand] = useState(prefill?.car_brand || '');
  const [carModel, setCarModel] = useState(prefill?.car_model || '');
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [carVariant, setCarVariant] = useState(prefill?.car_variant || '');
  const [carRegYear, setCarRegYear] = useState(prefill?.car_registration_year?.toString() || '');
  // Fix timezone: use local date instead of toISOString() which shifts dates in IST
  const now = new Date();
  const [visitDate, setVisitDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  const [notes, setNotes] = useState(prefill?.notes || '');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [nextVisit, setNextVisit] = useState(1);
  const [bookingId] = useState<number | null>(prefill?.id || null);
  const [step, setStep] = useState(1);
  const [svcSearch, setSvcSearch] = useState('');

  // Autocomplete data
  const { data: brandsRes } = useBrands();
  const { data: modelsRes } = useModels(carBrand);
  const { data: variantsRes } = useVariants(carBrand, carModel);

  // Build dropdown options from API data
  const brandOptions = [
    ...(brandsRes?.data || []).map((b: string) => ({ value: b, label: b })),
    { value: 'Others', label: 'Others (Enter Manually)' }
  ];
  const modelOptions = [
    ...(modelsRes?.data || []).map((m: string) => ({ value: m, label: m })),
    { value: 'Other', label: 'Other (Enter Manually)' }
  ];
  const variantOptions = (variantsRes?.data || []).map((v: string) => ({ value: v, label: v }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: (currentYear + 2) - 1990 + 1 }, (_, i) => {
    const y = 1990 + i;
    return { value: y.toString(), label: y.toString() };
  }).reverse();

  const segment = segmentForVehicle({
    brand: carBrand === 'Others' ? customBrand : carBrand,
    model: carBrand === 'Others' || carModel === 'Other' ? customModel : carModel,
  });

  // Services
  const [serviceBlocks, setServiceBlocks] = useState<ServiceBlock[]>(() => {
    if (prefill?.service_name) {
      return [{ ...emptyService(), service_name: prefill.service_name }];
    }
    return [emptyService()];
  });

  // Photos
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);

  // Catalog data
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // ─── Fetch catalogs ─────────────────────
  useEffect(() => {
    api.get('/services').then(r => {
      const catalogs = r.data.data || [];
      setServicesCatalog(catalogs);
      // Auto-populate price if prefilled service matches a catalog service
      if (prefill?.service_name) {
        const found = catalogs.find((s: any) => s.name === prefill.service_name);
        if (found) {
          setServiceBlocks(prev => prev.map(block => block.service_name === prefill.service_name ? {
            ...block,
            service_price: priceForSegment(found, segmentForVehicle({ brand: prefill?.car_brand, model: prefill?.car_model })) || Number(found.price_sedan) || Number(found.price_hatchback) || 0
          } : block));
        }
      }
    }).catch(() => {});
    api.get('/inventory?limit=500').then(r => setInventory(r.data.data || [])).catch(() => {});
  }, [prefill]);

  // Auto-trigger vehicle lookup if arriving with a prefilled reg number
  useEffect(() => {
    if (prefill?.vehicle_reg_no) {
      const clean = prefill.vehicle_reg_no.toUpperCase().replace(/\s/g, '');
      if (clean.length >= 4) setLookupQuery(clean);
    }
  }, [prefill]);

  // ─── Vehicle lookup ─────────────────────
  const { data: lookupData, isLoading: lookupLoading, isError: lookupNotFound } = useVehicleLookup(lookupQuery);

  useEffect(() => {
    if (lookupData?.found) {
      setCustomerId(lookupData.customer?.id || null);
      setCustomerName(lookupData.customer?.name || '');
      setCustomerMobile(lookupData.customer?.mobile || '');
      setCustomerEmail(lookupData.customer?.email || '');
      setCarBrand(lookupData.vehicle?.brand || '');
      setCarModel(lookupData.vehicle?.model || '');
      if ((lookupData.vehicle as any)?.year_of_manufacture) {
        setCarRegYear((lookupData.vehicle as any).year_of_manufacture.toString());
      }
      setIsReturning(true);
      setNextVisit(lookupData.next_visit_number || 1);
    }
  }, [lookupData]);

  const handleRegBlur = () => {
    const clean = regNo.toUpperCase().replace(/\s/g, '');
    if (clean.length >= 4) {
      setLookupQuery(clean);
      setIsReturning(false);
      setCustomerId(null);
    }
  };

  // ─── Service helpers ────────────────────
  const updateService = (key: string, field: string, value: any) => {
    setServiceBlocks(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s));
  };

  const handleServiceSelect = (key: string, val: string) => {
    if (val === '__custom__') {
      updateService(key, 'service_name', '');
      updateService(key, 'is_custom', true);
      updateService(key, 'service_price', 0);
    } else {
      const svc = servicesCatalog.find(s => s.name === val);
      updateService(key, 'service_name', val);
      updateService(key, 'is_custom', false);
      updateService(key, 'service_price', priceForSegment(svc, segment) || Number(svc?.price_sedan) || Number(svc?.price_hatchback) || 0);
    }
  };

  const addProduct = (key: string) => {
    setServiceBlocks(prev => prev.map(s =>
      s.key === key ? { ...s, products: [...s.products, emptyProduct()] } : s
    ));
  };

  const updateProduct = (sKey: string, pIdx: number, field: string, value: any) => {
    setServiceBlocks(prev => prev.map(s =>
      s.key === sKey ? {
        ...s,
        products: s.products.map((p, i) => i === pIdx ? { ...p, [field]: value } : p),
      } : s
    ));
  };

  const removeProduct = (sKey: string, pIdx: number) => {
    setServiceBlocks(prev => prev.map(s =>
      s.key === sKey ? { ...s, products: s.products.filter((_, i) => i !== pIdx) } : s
    ));
  };

  const handleProductSelect = (sKey: string, pIdx: number, productId: number) => {
    const item = inventory.find(i => i.id === productId);
    if (item) {
      updateProduct(sKey, pIdx, 'product_id', productId);
      updateProduct(sKey, pIdx, 'product_name', item.product_name);
      updateProduct(sKey, pIdx, 'unit', item.unit);
    }
  };

  const removeServiceBlock = (key: string) => {
    if (serviceBlocks.length <= 1) return;
    setServiceBlocks(prev => prev.filter(s => s.key !== key));
  };

  const calcBlockSubtotal = (block: ServiceBlock) => {
    const prodCost = block.products.reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.unit_cost) || 0), 0);
    return (Number(block.service_price) || 0) + (Number(block.labor_charges) || 0) + prodCost;
  };

  const grandTotal = serviceBlocks.reduce((sum, b) => sum + calcBlockSubtotal(b), 0);

  // ─── Submit ─────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (submitAfter: boolean) => {
    const cleanReg = regNo.toUpperCase().replace(/\s/g, '');
    const finalBrand = carBrand === 'Others' ? customBrand : carBrand;
    const finalModel = (carBrand === 'Others' || carModel === 'Other') ? customModel : carModel;

    if (!cleanReg) { toast('error', 'Registration number is required'); return; }
    if (!finalBrand || !finalModel) { toast('error', 'Brand and model are required'); return; }
    if (!customerName && !customerId) { toast('error', 'Customer name is required'); return; }
    if (!customerMobile && !customerId) { toast('error', 'Customer mobile is required'); return; }

    setSubmitting(true);
    try {
      // 1. Create cart
      const cart = await createCart.mutateAsync({
        registration_no: cleanReg,
        customer_id: customerId,
        customer_name: customerName,
        customer_mobile: customerMobile,
        customer_email: customerEmail,
        car_brand: finalBrand,
        car_model: finalModel,
        car_registration_year: carRegYear ? parseInt(carRegYear) : null,
        visit_date: visitDate,
        notes,
        booking_id: bookingId,
      });
      const cartId = cart.id;

      // 2. Add services
      for (const block of serviceBlocks) {
        if (!block.service_name) continue;
        await addServiceMut.mutateAsync({
          id: cartId,
          service_name: block.service_name,
          service_price: block.service_price,
          labor_charges: block.labor_charges,
          products: block.products.filter(p => p.product_id > 0).map(p => ({
            product_id: p.product_id,
            quantity: p.quantity,
            unit_cost: p.unit_cost,
          })),
        });
      }

      // 3. Upload photos (batch)
      if (beforePhotos.length > 0) {
        await uploadPhotoMut.mutateAsync({ cartId, files: beforePhotos, type: 'before' });
      }
      if (afterPhotos.length > 0) {
        await uploadPhotoMut.mutateAsync({ cartId, files: afterPhotos, type: 'after' });
      }

      // 4. Submit if requested
      if (submitAfter) {
        await api.patch(`/job-carts/${cartId}/submit`);
        toast('success', 'Job cart created and submitted!');
      } else {
        toast('success', 'Job cart saved as draft');
      }

      navigate(isStaff ? `/staff/job-carts/${cartId}` : `/admin/job-carts/${cartId}`);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to create job cart');
    } finally {
      setSubmitting(false);
    }
  };

  const serviceOptions = [
    ...servicesCatalog.map(s => ({ value: s.name, label: s.name })),
    { value: '__custom__', label: '✏️ Custom / Other' },
  ];

  const inventoryOptions = inventory
    .filter(i => !i.is_deleted)
    .map(i => ({ value: i.id, label: `${i.product_name} (${i.quantity} ${i.unit})` }));

  // ─── Step flow (car → services → confirm) ───
  const finalBrandNow = carBrand === 'Others' ? customBrand : carBrand;
  const finalModelNow = carBrand === 'Others' || carModel === 'Other' ? customModel : carModel;
  const usedBlocks = serviceBlocks.filter((b) => b.service_name);
  const carServices = servicesCatalog.filter((s: any) => s.is_active !== 0 && s.vehicle_type !== 'bike');
  const shownCatalog = carServices.filter((s: any) => !svcSearch || s.name.toLowerCase().includes(svcSearch.toLowerCase()));

  const addFromCatalog = (svc: any) => {
    const price = priceForSegment(svc, segment) || Number(svc.price_sedan) || Number(svc.price_hatchback) || 0;
    setServiceBlocks((prev) => {
      if (prev.some((b) => b.service_name === svc.name)) return prev.filter((b) => b.service_name !== svc.name).length ? prev.filter((b) => b.service_name !== svc.name) : [emptyService()];
      const blank = prev.findIndex((b) => !b.service_name);
      const block = { ...emptyService(), service_name: svc.name, service_price: price };
      if (blank >= 0) return prev.map((b, i) => (i === blank ? { ...block, key: b.key } : b));
      return [...prev, block];
    });
  };

  const addCustom = () => {
    setServiceBlocks((prev) => {
      const blank = prev.findIndex((b) => !b.service_name && !b.is_custom);
      if (blank >= 0) return prev.map((b, i) => (i === blank ? { ...b, is_custom: true } : b));
      return [...prev, { ...emptyService(), is_custom: true }];
    });
  };

  const goNext = () => {
    if (step === 1) {
      if (!regNo.trim()) return toast('error', 'Enter the registration number');
      if (!finalBrandNow || !finalModelNow) return toast('error', 'Choose the car brand and model');
      if (!customerId && (!customerName || !customerMobile)) return toast('error', 'Customer name and mobile are required');
    }
    if (step === 2 && !usedBlocks.length) return toast('error', 'Add at least one service');
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0 });
  };

  const STEPS = ['Car', 'Services', 'Confirm'];

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 font-sans">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(cancelPath))}
          className="-ml-1 h-10 w-10 rounded-full flex items-center justify-center text-slate-900 active:bg-slate-200"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D32F2F]">New job card</p>
          <h1 className="font-display text-[20px] font-extrabold text-slate-900 leading-tight">{STEPS[step - 1] === 'Car' ? 'Car & customer' : STEPS[step - 1] === 'Services' ? 'Pick services' : 'Review & create'}</h1>
        </div>
        <span className="text-[12px] font-bold text-slate-400">Step {step}/3</span>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-3 gap-1.5">
        {STEPS.map((label, i) => (
          <button key={label} onClick={() => i + 1 < step && setStep(i + 1)} className="text-left">
            <span className={`block h-1.5 rounded-full ${i + 1 <= step ? 'bg-[#D32F2F]' : 'bg-slate-200'}`} />
            <span className={`mt-1 block text-[11.5px] font-bold ${i + 1 === step ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
          </button>
        ))}
      </div>

      {/* ─── STEP 1: Car & customer ─── */}
      {step === 1 && (
        <>
          <section className="app-card p-4 space-y-3">
            <label className="app-label">Number plate</label>
            <div className="relative">
              <input
                className="app-input h-14 text-[20px] font-display font-extrabold tracking-wider uppercase"
                placeholder="GJ06AB1234"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                onBlur={handleRegBlur}
                autoFocus
              />
              <button onClick={handleRegBlur} className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-[#111] text-white flex items-center justify-center" aria-label="Look up">
                {lookupLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>
            {isReturning && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] font-semibold text-emerald-800">
                <CheckCircle size={16} className="text-emerald-600" /> Returning customer · visit #{nextVisit}
              </div>
            )}
            {lookupNotFound && lookupQuery && !isReturning && (
              <p className="text-[12.5px] font-semibold text-slate-500">New car — add the customer details below.</p>
            )}
          </section>

          <section className="app-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[16px] font-extrabold text-slate-900 flex-1">Customer</h3>
              {customerId && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Saved customer</span>}
            </div>
            <Input label="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={!!customerId} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Mobile" inputMode="numeric" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} disabled={!!customerId} />
              <Input label="Email (optional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} disabled={!!customerId} />
            </div>
          </section>

          <section className="app-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[16px] font-extrabold text-slate-900 flex-1">Car</h3>
              {finalBrandNow && finalModelNow && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{SEGMENT_LABEL[segment] || segment} pricing</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Brand"
                options={brandOptions}
                value={carBrand}
                onChange={(e) => {
                  setCarBrand(e.target.value);
                  setCarModel('');
                  setCarVariant('');
                  setCustomBrand('');
                  setCustomModel('');
                }}
                placeholder="Brand"
                disabled={!!customerId}
              />
              <Select
                label="Model"
                options={modelOptions}
                value={carModel}
                onChange={(e) => {
                  setCarModel(e.target.value);
                  setCarVariant('');
                  setCustomModel('');
                }}
                placeholder={carBrand ? 'Model' : 'Brand first'}
                disabled={!!customerId || !carBrand || carBrand === 'Others'}
              />
            </div>
            {(carBrand === 'Others' || carModel === 'Other') && (
              <div className="grid grid-cols-2 gap-3">
                {carBrand === 'Others' && <Input label="Brand name" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="Porsche" />}
                <Input label="Model name" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="Cayenne" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Select label="Year" options={yearOptions} value={carRegYear} onChange={(e) => setCarRegYear(e.target.value)} placeholder="Year" />
              <Select
                label="Variant"
                options={variantOptions}
                value={carVariant}
                onChange={(e) => setCarVariant(e.target.value)}
                placeholder={carModel ? 'Variant' : 'Model first'}
                disabled={!!customerId || !carModel}
              />
            </div>
          </section>
        </>
      )}

      {/* ─── STEP 2: Services ─── */}
      {step === 2 && (
        <>
          {usedBlocks.length > 0 || serviceBlocks.some((b) => b.is_custom) ? (
            <section className="space-y-2.5">
              <SectionTitle>Added ({usedBlocks.length})</SectionTitle>
              {serviceBlocks
                .filter((b) => b.service_name || b.is_custom)
                .map((block) => (
                  <div key={block.key} className="app-card p-3.5 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {block.is_custom ? (
                          <Input label="Custom service" value={block.service_name} onChange={(e) => updateService(block.key, 'service_name', e.target.value)} placeholder="Service name" />
                        ) : (
                          <p className="font-display font-bold text-[15px] text-slate-900">{block.service_name}</p>
                        )}
                      </div>
                      {!isStaff && <span className="font-display font-extrabold text-[15px] text-slate-900 shrink-0 pt-0.5">₹{calcBlockSubtotal(block).toLocaleString('en-IN')}</span>}
                      <button
                        onClick={() => (serviceBlocks.length > 1 ? removeServiceBlock(block.key) : setServiceBlocks([emptyService()]))}
                        className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
                        aria-label="Remove service"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    {!isStaff && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <Input label="Price ₹" type="number" value={block.service_price || ''} onChange={(e) => updateService(block.key, 'service_price', parseFloat(e.target.value) || 0)} />
                        <Input label="Labour ₹" type="number" value={block.labor_charges || ''} onChange={(e) => updateService(block.key, 'labor_charges', parseFloat(e.target.value) || 0)} />
                      </div>
                    )}
                    <div className="space-y-2">
                      {block.products.map((prod, pIdx) => (
                        <div key={pIdx} className="flex gap-2 items-end">
                          <div className="flex-1 min-w-0">
                            <Select options={inventoryOptions} value={prod.product_id || ''} onChange={(e) => handleProductSelect(block.key, pIdx, parseInt(e.target.value))} placeholder="Product" />
                          </div>
                          <div className="w-16">
                            <Input type="number" value={prod.quantity || ''} onChange={(e) => updateProduct(block.key, pIdx, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Qty" />
                          </div>
                          {!isStaff && (
                            <div className="w-20">
                              <Input type="number" value={prod.unit_cost || ''} onChange={(e) => updateProduct(block.key, pIdx, 'unit_cost', parseFloat(e.target.value) || 0)} placeholder="₹" />
                            </div>
                          )}
                          <button onClick={() => removeProduct(block.key, pIdx)} className="h-11 w-8 text-slate-300 flex items-center justify-center" aria-label="Remove product">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addProduct(block.key)} className="text-[13px] font-bold text-[#D32F2F] flex items-center gap-1">
                        <Plus size={14} /> Product used
                      </button>
                    </div>
                  </div>
                ))}
            </section>
          ) : null}

          <section className="space-y-3">
            <SectionTitle action={<button onClick={addCustom} className="text-[13px] font-bold text-[#D32F2F]">+ Custom</button>}>
              {SEGMENT_LABEL[segment] || 'Car'} services
            </SectionTitle>
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} placeholder="Search services" className="app-input pl-10" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {shownCatalog.map((svc: any) => {
                const picked = serviceBlocks.some((b) => b.service_name === svc.name);
                const price = priceForSegment(svc, segment) || Number(svc.price_sedan) || 0;
                return (
                  <button key={svc.id} onClick={() => addFromCatalog(svc)} className={`app-card overflow-hidden text-left transition-transform active:scale-[0.98] ${picked ? 'ring-2 ring-[#D32F2F]' : ''}`}>
                    <div className="relative h-24 bg-slate-100">
                      <ServiceImage service={svc} className="h-full w-full object-cover" />
                      {picked && (
                        <span className="absolute right-2 top-2 h-7 w-7 rounded-full bg-[#D32F2F] text-white flex items-center justify-center"><CheckCircle size={16} /></span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-display font-bold text-[13px] leading-tight text-slate-900 line-clamp-2">{svc.name}</p>
                      {!isStaff && <p className="mt-1 font-display font-extrabold text-[14px] text-[#D32F2F]">₹{price.toLocaleString('en-IN')}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ─── STEP 3: Confirm ─── */}
      {step === 3 && (
        <>
          <section className="app-card p-4">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <VehicleBrandBadge brand={finalBrandNow} model={finalModelNow} showText={false} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[18px] font-extrabold text-slate-900 tracking-wide">{regNo}</p>
                <p className="text-[12.5px] text-slate-500 truncate">{finalBrandNow} {finalModelNow} · {customerName || 'Customer'}</p>
              </div>
              <button onClick={() => setStep(1)} className="text-[13px] font-bold text-[#D32F2F]">Edit</button>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
              {usedBlocks.map((b) => (
                <div key={b.key} className="flex justify-between gap-2 text-[13.5px]">
                  <span className="text-slate-700 truncate">{b.service_name}</span>
                  {!isStaff && <span className="font-semibold text-slate-900 shrink-0">₹{calcBlockSubtotal(b).toLocaleString('en-IN')}</span>}
                </div>
              ))}
              <button onClick={() => setStep(2)} className="text-[13px] font-bold text-[#D32F2F]">Change services</button>
            </div>
          </section>

          <section className="app-card p-4 space-y-3">
            <Input label="Visit date" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scratches on left door, customer wants it by 6 PM…" />
          </section>

          <section className="app-card p-4 space-y-3">
            <h3 className="font-display text-[16px] font-extrabold text-slate-900">Photos (optional)</h3>
            <FileUpload label="Before photos" files={beforePhotos} onChange={setBeforePhotos} maxFiles={5} />
            <FileUpload label="After photos" files={afterPhotos} onChange={setAfterPhotos} maxFiles={5} />
          </section>
        </>
      )}

      {/* ─── Sticky action bar ─── */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          {!isStaff && (
            <div className="mr-1 shrink-0">
              <p className="text-[11px] font-semibold text-slate-500 leading-none">{usedBlocks.length} service{usedBlocks.length === 1 ? '' : 's'}</p>
              <p className="font-display text-[17px] font-extrabold text-slate-900">₹{grandTotal.toLocaleString('en-IN')}</p>
            </div>
          )}
          {step < 3 ? (
            <button onClick={goNext} className="app-btn-primary flex-1">
              Continue <ChevronRight size={18} />
            </button>
          ) : (
            <>
              <button onClick={() => handleSave(false)} disabled={submitting} className="app-btn-outline px-4">
                Draft
              </button>
              <button onClick={() => handleSave(true)} disabled={submitting} className="app-btn-primary flex-1">
                {submitting ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle size={17} />} Create job card
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
