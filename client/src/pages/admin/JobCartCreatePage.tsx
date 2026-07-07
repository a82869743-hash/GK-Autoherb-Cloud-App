import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, Search, CheckCircle, Loader2, X } from 'lucide-react';
import { useCreateJobCart, useVehicleLookup, useAddService, useUploadPhoto } from '../../api/hooks/useJobCarts';
import { useBrands, useModels, useVariants } from '../../api/hooks/useVehicles';
import api from '../../api/axiosInstance';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
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

  // Autocomplete data
  const { data: brandsRes } = useBrands();
  const { data: modelsRes } = useModels(carBrand);
  const { data: variantsRes } = useVariants(carBrand, carModel);

  // Build dropdown options from API data
  const brandOptions = (brandsRes?.data || []).map((b: string) => ({ value: b, label: b }));
  const modelOptions = (modelsRes?.data || []).map((m: string) => ({ value: m, label: m }));
  const variantOptions = (variantsRes?.data || []).map((v: string) => ({ value: v, label: v }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: (currentYear + 2) - 1990 + 1 }, (_, i) => {
    const y = 1990 + i;
    return { value: y.toString(), label: y.toString() };
  }).reverse();

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
            service_price: Number(found.price_sedan) || Number(found.price_hatchback) || 0
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
      updateService(key, 'service_price', Number(svc?.price_sedan) || Number(svc?.price_hatchback) || 0);
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
    if (!cleanReg) { toast('error', 'Registration number is required'); return; }
    if (!carBrand || !carModel) { toast('error', 'Brand and model are required'); return; }
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
        car_brand: carBrand,
        car_model: carModel,
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

      // 3. Upload photos
      for (const file of beforePhotos) {
        await uploadPhotoMut.mutateAsync({ cartId, file, type: 'before' });
      }
      for (const file of afterPhotos) {
        await uploadPhotoMut.mutateAsync({ cartId, file, type: 'after' });
      }

      // 4. Submit if requested
      if (submitAfter) {
        await api.patch(`/job-carts/${cartId}/submit`);
        toast('success', 'Job cart created and submitted!');
      } else {
        toast('success', 'Job cart saved as draft');
      }

      navigate(`/admin/job-carts/${cartId}`);
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

  return (
    <>
      <AdminTopBar
        title="Create Job Cart"
        subtitle="New service entry"
      />

      <div className="max-w-4xl space-y-8">

        {/* ─── SECTION A: Vehicle Registration ─────── */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-5">Vehicle Registration</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Registration Number"
                placeholder="e.g. GJ06AB1234"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                onBlur={handleRegBlur}
              />
            </div>
            {lookupLoading && (
              <div className="pb-3"><Loader2 size={20} className="animate-spin text-[#D32F2F]" /></div>
            )}
          </div>

          {isReturning && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                Returning Customer — Visit #{nextVisit}
              </span>
            </div>
          )}
          {lookupNotFound && lookupQuery && (
            <p className="mt-2 text-xs text-[#5f5e5e] font-medium">🆕 New vehicle — fill customer details below</p>
          )}
        </section>

        {/* ─── SECTION B: Customer & Vehicle ────────── */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-5">Customer & Vehicle</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={!!customerId} />
            <Input label="Mobile Number" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} disabled={!!customerId} />
            <Input label="Email (Optional)" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} disabled={!!customerId} />
            <Select
              label="Car Brand"
              options={brandOptions}
              value={carBrand}
              onChange={e => { setCarBrand(e.target.value); setCarModel(''); setCarVariant(''); }}
              placeholder="Select brand..."
              disabled={!!customerId}
            />
            <Select
              label="Car Model"
              options={modelOptions}
              value={carModel}
              onChange={e => { setCarModel(e.target.value); setCarVariant(''); }}
              placeholder={carBrand ? 'Select model...' : 'Select brand first'}
              disabled={!!customerId || !carBrand}
            />
            <Select
              label="Registration Year"
              options={yearOptions}
              value={carRegYear}
              onChange={e => setCarRegYear(e.target.value)}
              placeholder="Select year..."
            />
            <Select
              label="Variant"
              options={variantOptions}
              value={carVariant}
              onChange={e => setCarVariant(e.target.value)}
              placeholder={carModel ? 'Select variant...' : 'Select model first'}
              disabled={!!customerId || !carModel}
            />
            <Input label="Visit Date" type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
          </div>
          <div className="mt-5">
            <Textarea label="Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." />
          </div>
        </section>

        {/* ─── SECTION C: Services ─────────────────── */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-5">Services</h3>

          {serviceBlocks.map((block, blockIdx) => (
            <div key={block.key} className="mb-6 last:mb-0 border border-gray-100 rounded-lg p-5 relative group">
              {serviceBlocks.length > 1 && (
                <button
                  onClick={() => removeServiceBlock(block.key)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove service"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className={`grid grid-cols-1 ${isStaff ? '' : 'sm:grid-cols-3'} gap-4`}>
                {block.is_custom ? (
                  <div className={`${isStaff ? 'col-span-full' : 'sm:col-span-3'} flex gap-2 items-end`}>
                    <div className="flex-1">
                      <Input
                        label="Custom Service Name"
                        value={block.service_name}
                        onChange={e => updateService(block.key, 'service_name', e.target.value)}
                        placeholder="Enter service name"
                      />
                    </div>
                    <button onClick={() => updateService(block.key, 'is_custom', false)} className="pb-3 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                ) : (
                  <Select
                    label="Service"
                    options={serviceOptions}
                    value={block.service_name}
                    onChange={e => handleServiceSelect(block.key, e.target.value)}
                    placeholder="Select service..."
                  />
                )}
                {!isStaff && (
                  <>
                    <Input
                      label="Service Price (₹)"
                      type="number"
                      value={block.service_price || ''}
                      onChange={e => updateService(block.key, 'service_price', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      label="Labor Charges (₹)"
                      type="number"
                      value={block.labor_charges || ''}
                      onChange={e => updateService(block.key, 'labor_charges', parseFloat(e.target.value) || 0)}
                    />
                  </>
                )}
              </div>

              {/* Products */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#5f5e5e]">Products Used</span>
                  <button
                    onClick={() => addProduct(block.key)}
                    className="text-xs font-bold text-[#D32F2F] hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Product
                  </button>
                </div>

                {block.products.map((prod, pIdx) => (
                  <div key={pIdx} className="flex gap-2 items-end mb-2">
                    <div className="flex-1">
                      <Select
                        options={inventoryOptions}
                        value={prod.product_id || ''}
                        onChange={e => handleProductSelect(block.key, pIdx, parseInt(e.target.value))}
                        placeholder="Select product..."
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        value={prod.quantity || ''}
                        onChange={e => updateProduct(block.key, pIdx, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                      />
                    </div>
                    {!isStaff && (
                      <div className="w-24">
                        <Input
                          type="number"
                          value={prod.unit_cost || ''}
                          onChange={e => updateProduct(block.key, pIdx, 'unit_cost', parseFloat(e.target.value) || 0)}
                          placeholder="₹ Cost"
                        />
                      </div>
                    )}
                    <button onClick={() => removeProduct(block.key, pIdx)} className="pb-3 text-gray-300 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Block subtotal */}
              {!isStaff && (
                <div className="mt-3 pt-3 border-t border-gray-50 text-right">
                  <span className="text-xs font-bold text-[#5f5e5e]">Subtotal: </span>
                  <span className="text-sm font-extrabold text-[#1c1b1b]">
                    ₹{calcBlockSubtotal(block).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => setServiceBlocks(prev => [...prev, emptyService()])}
            className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm font-bold text-[#5f5e5e] hover:border-[#D32F2F] hover:text-[#D32F2F] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Another Service
          </button>
        </section>

        {/* ─── SECTION D: Photos ───────────────────── */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-5">Photos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FileUpload
              label="Before Photos"
              files={beforePhotos}
              onChange={setBeforePhotos}
              maxFiles={5}
            />
            <FileUpload
              label="After Photos"
              files={afterPhotos}
              onChange={setAfterPhotos}
              maxFiles={5}
            />
          </div>
        </section>

        {/* ─── SECTION E: Grand Total ──────────────── */}
        {!isStaff && (
          <div className="bg-[#1c1b1b] rounded-lg p-6 flex items-center justify-between">
            <span className="text-white text-sm font-bold uppercase tracking-widest">Grand Total</span>
            <span className="text-3xl font-black text-white tracking-tight">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* ─── SECTION F: Actions ──────────────────── */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="ghost" onClick={() => navigate(cancelPath)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleSave(false)} loading={submitting}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSave(true)} loading={submitting}>
            Submit Job Cart
          </Button>
        </div>
      </div>
    </>
  );
}
