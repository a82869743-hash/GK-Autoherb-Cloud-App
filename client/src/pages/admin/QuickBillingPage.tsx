import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSocket } from '../../lib/socket';
import {
  IndianRupee, Package, Search, Plus, Trash2, User, Car,
  FileText, Tag, CheckCircle2, Sparkles, CreditCard, Smartphone, Landmark, Minus, Download, MessageCircle, Loader2
} from 'lucide-react';
import { OpsPageTitle } from '../../components/ops/ui';
import { priceForSegment } from '../../utils/pricing';
import { useAuthStore } from '../../store/authStore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';

import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import api from '../../api/axiosInstance';
import { useInventory } from '../../api/hooks/useInventory';
import { useServices } from '../../api/hooks/useServices';
import { useLoyaltySearch } from '../../api/hooks/useLoyalty';
import { useBrands, useModels } from '../../api/hooks/useVehicles';
import { formatINR } from '../../utils/formatters';

const schema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_mobile: z.string().min(10, 'Valid mobile number is required'),
  description: z.string().optional(),
  discount_type: z.enum(['fixed', 'percentage']).optional(),
  discount_value: z.number().min(0).optional(),
  items: z.array(z.object({
    type: z.enum(['service', 'product']),
    id: z.number().optional(),
    name: z.string().min(1, 'Name is required'),
    price: z.number().min(0, 'Price must be non-negative'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
  })).min(1, 'Add at least one item to bill'),
  payment_method: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'other']),
  loyalty_redeemed: z.boolean().optional(),
  vehicle_brand: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_reg_no: z.string().optional(),
  vehicle_category: z.string().optional(),
});

type QuickBillForm = z.infer<typeof schema>;

export default function QuickBillingPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [doneBill, setDoneBill] = useState<{ id: number; total: number; name: string; mobile: string } | null>(null);
  const [itemTab, setItemTab] = useState<'service' | 'product'>('service');
  const [itemSearch, setItemSearch] = useState('');

  const { data: inventoryData } = useInventory({ limit: 1000 });
  const { data: servicesData } = useServices();

  const products = inventoryData?.data || [];
  const services = Array.isArray(servicesData) ? servicesData : (servicesData?.data || []);

  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors }
  } = useForm<QuickBillForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: '',
      customer_mobile: '',
      items: [],
      discount_type: 'fixed',
      discount_value: 0,
      payment_method: 'cash',
      loyalty_redeemed: false,
      vehicle_brand: '',
      vehicle_model: '',
      vehicle_reg_no: '',
      vehicle_category: '',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const selectedBrand = watch('vehicle_brand');
  const { data: brandsResponse } = useBrands();
  const { data: modelsResponse } = useModels(selectedBrand || '');

  const brandsList = brandsResponse?.data || [];
  const modelsList = modelsResponse?.data || [];

  const watchedItems = watch("items") || [];
  const discountType = watch("discount_type");
  const discountValue = watch("discount_value") || 0;

  const subtotal = watchedItems.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
  
  const watchedCustomerMobile = watch("customer_mobile");
  const currentBrand = watch("vehicle_brand") || '';
  const currentModel = watch("vehicle_model") || '';
  const currentCategory = watch("vehicle_category") || '';
  const currentRegNo = watch("vehicle_reg_no") || '';

  // Lookup loyalty by mobile if length >= 10
  const { data: loyaltyCustomers } = useLoyaltySearch(watchedCustomerMobile?.length >= 10 ? watchedCustomerMobile : '');
  const matchedCustomer = loyaltyCustomers?.find((c: any) => c.mobile === watchedCustomerMobile);
  const availableCredits = matchedCustomer?.credits || 0;

  const effectiveBrands = currentBrand && !brandsList.includes(currentBrand)
    ? [currentBrand, ...brandsList]
    : brandsList;

  const effectiveModels = currentModel && !modelsList.some((m: any) => (typeof m === 'string' ? m : m.model) === currentModel)
    ? [{ model: currentModel }, ...modelsList]
    : modelsList;

  const applyCustomerMatch = (match: any) => {
    if (!match) return;
    if (match.name) setValue('customer_name', match.name);
    if (match.mobile) setValue('customer_mobile', match.mobile);
    if (match.vehicle_brand) setValue('vehicle_brand', match.vehicle_brand);
    if (match.vehicle_model) setValue('vehicle_model', match.vehicle_model);
    if (match.vehicle_reg_no) setValue('vehicle_reg_no', match.vehicle_reg_no);
    if (match.vehicle_category) setValue('vehicle_category', match.vehicle_category);
  };

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }
  
  const total = Math.max(0, subtotal - discountAmount);

  const applyLoyaltyCredits = () => {
    if (availableCredits > 0) {
      setValue('discount_type', 'fixed');
      const redeemAmt = subtotal > 0 ? Math.min(availableCredits, subtotal) : availableCredits;
      setValue('discount_value', redeemAmt);
      setValue('loyalty_redeemed', true);
      toast.success(`Applied ${formatINR(redeemAmt)} loyalty credits as discount!`);
    }
  };

  const handleAddService = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    if (val === 'other') {
      append({ type: 'service', id: undefined, name: '', price: 0, quantity: 1 });
    } else {
      const sId = Number(val);
      const service = services.find((s: any) => s.id === sId);
      if (service) {
        append({ type: 'service', id: service.id, name: service.name, price: priceForSegment(service, currentCategory || 'sedan') || Number(service.price) || 0, quantity: 1 });
      }
    }
    e.target.value = ''; // reset
  };

  const handleAddProduct = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    if (val === 'other') {
      append({ type: 'product', id: undefined, name: '', price: 0, quantity: 1 });
    } else {
      const pId = Number(val);
      const prod = products.find((p: any) => p.id === pId);
      if (prod) {
        append({ type: 'product', id: prod.id, name: prod.product_name, price: Number((prod as any).price || 0), quantity: 1 });
      }
    }
    e.target.value = ''; // reset
  };

  const onSubmit = async (data: QuickBillForm) => {
    try {
      setSubmitting(true);
      
      const payloadServices = data.items.filter(i => i.type === 'service').map(i => ({ service_name: i.name, price: i.price }));
      const payloadProducts = data.items.filter(i => i.type === 'product').map(i => ({ id: i.id, product_name: i.name, price: i.price, quantity: i.quantity }));

      const payload = {
        customer_id: matchedCustomer?.id,
        customer_name: data.customer_name,
        customer_mobile: data.customer_mobile,
        description: data.description || 'Quick Bill',
        amount: total,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        services: payloadServices,
        products: payloadProducts,
        payment_method: data.payment_method,
        loyalty_redeemed: data.loyalty_redeemed,
        vehicle_brand: data.vehicle_brand,
        vehicle_model: data.vehicle_model,
        vehicle_reg_no: data.vehicle_reg_no,
        vehicle_category: data.vehicle_category,
      };

      const res = await api.post('/billing', payload);
      toast.success('Bill generated successfully!');
      setDoneBill({ id: res.data?.data?.id, total, name: data.customer_name, mobile: data.customer_mobile });
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate bill');
    } finally {
      setSubmitting(false);
    }
  };

  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [selectedCustKey, setSelectedCustKey] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const refreshCustomerList = (searchQuery?: string) => {
    const q = searchQuery || '';
    api.get(`/search/customers?q=${encodeURIComponent(q)}&limit=100`).then(res => {
      const data = res.data?.data || [];
      setExistingCustomers(data);
    }).catch(err => console.error(err));
  };

  useEffect(() => {
    refreshCustomerList();

    const socket = createSocket();

    socket.on('customer_updated', () => refreshCustomerList());
    socket.on('new_booking', () => refreshCustomerList());
    socket.on('customer_created', () => refreshCustomerList());
    socket.on('manual_bill_created', () => refreshCustomerList());

    return () => {
      socket.disconnect();
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return existingCustomers;
    const q = customerSearchQuery.trim().toLowerCase();
    return existingCustomers.filter((c: any) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.vehicle_reg_no && c.vehicle_reg_no.toLowerCase().includes(q)) ||
      (c.vehicle_brand && c.vehicle_brand.toLowerCase().includes(q))
    );
  }, [existingCustomers, customerSearchQuery]);

  const handleSelectExistingCustomer = (key: string) => {
    setSelectedCustKey(key);
    if (!key) return;
    const found = existingCustomers.find((c: any, idx: number) => {
      const uniqueVal = c.id ? `user_${c.id}` : `bill_${c.mobile}_${c.name}_${idx}`;
      return uniqueVal === key;
    });
    if (found) {
      applyCustomerMatch(found);
      toast.success(`Auto-filled details for ${found.name}`);
    }
  };

  const segment = (currentCategory || 'sedan') as string;
  const shownServices = services.filter((s: any) => s.vehicle_type !== 'bike' && (!itemSearch || s.name.toLowerCase().includes(itemSearch.toLowerCase())));
  const shownProducts = products.filter((p: any) => !itemSearch || p.product_name?.toLowerCase().includes(itemSearch.toLowerCase()));
  const addServiceItem = (s: any) => {
    append({ type: 'service', id: s.id, name: s.name, price: priceForSegment(s, segment) || Number(s.price) || 0, quantity: 1 });
    toast.success(`${s.name} added`);
  };
  const addProductItem = (p: any) => {
    append({ type: 'product', id: p.id, name: p.product_name, price: Number(p.price || p.selling_price || 0), quantity: 1 });
    toast.success(`${p.product_name} added`);
  };
  const setQty = (index: number, q: number) => setValue(`items.${index}.quantity` as const, Math.max(1, q), { shouldValidate: true });
  const paymentMethod = watch('payment_method');
  const PAY = [
    { v: 'cash', label: 'Cash', icon: IndianRupee },
    { v: 'upi', label: 'UPI', icon: Smartphone },
    { v: 'card', label: 'Card', icon: CreditCard },
    { v: 'bank_transfer', label: 'Bank', icon: Landmark },
    { v: 'other', label: 'Other', icon: FileText },
  ] as const;

  // ─── Done screen ───
  if (doneBill) {
    const t = useAuthStore.getState().token;
    const invoiceUrl = `/api/billing/${doneBill.id}/invoice?token=${t}`;
    const waText = encodeURIComponent(`Hi ${doneBill.name}, thank you for visiting GK AutoHerb! Your bill amount is ${formatINR(doneBill.total)}.`);
    const waTo = String(doneBill.mobile || '').replace(/\D/g, '').slice(-10);
    return (
      <div className="mx-auto max-w-md space-y-4 pt-6 pb-28 text-center font-sans">
        <div className="mx-auto h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 size={44} />
        </div>
        <div>
          <p className="font-display text-[24px] font-extrabold text-slate-900">Bill created</p>
          <p className="text-[13px] text-slate-500">#{doneBill.id} · {doneBill.name}</p>
        </div>
        <p className="font-display text-[34px] font-extrabold text-slate-900">{formatINR(doneBill.total)}</p>
        <div className="space-y-2.5 text-left">
          <a href={invoiceUrl} target="_blank" rel="noreferrer" className="app-btn-dark w-full"><Download size={17} /> Download / print invoice</a>
          {waTo && (
            <a href={`https://wa.me/91${waTo}?text=${waText}`} target="_blank" rel="noreferrer" className="app-btn w-full h-12 bg-emerald-500 text-white"><MessageCircle size={17} /> Send on WhatsApp</a>
          )}
          <button onClick={() => window.location.reload()} className="app-btn-primary w-full"><Plus size={17} /> New bill</button>
          <button onClick={() => navigate('/admin/invoices')} className="app-btn-outline w-full">All invoices</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-44 font-sans">
      <OpsPageTitle
        kicker="Counter"
        title="Quick bill"
        subtitle="Services and products in one bill"
        action={
          <button onClick={() => navigate('/admin/invoices')} className="app-chip app-chip-off">
            <FileText size={15} /> Invoices
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 min-w-0">
          {/* ─── Customer ─── */}
          <section className="app-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center"><User size={18} /></span>
              <h3 className="font-display text-[16px] font-extrabold text-slate-900 flex-1">Customer</h3>
              {selectedCustKey && (
                <button type="button" onClick={() => { setSelectedCustKey(''); setCustomerSearchQuery(''); }} className="text-[12.5px] font-bold text-[#D32F2F]">Clear</button>
              )}
            </div>
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), refreshCustomerList(customerSearchQuery))}
                placeholder="Find saved customer — name, mobile, plate"
                className="app-input pl-10 bg-slate-50"
              />
            </div>
            {customerSearchQuery.trim() && !selectedCustKey && (
              <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {filteredCustomers.slice(0, 8).map((c: any, idx: number) => {
                  const key = c.id ? `user_${c.id}` : `bill_${c.mobile}_${c.name}_${idx}`;
                  return (
                    <button type="button" key={key} onClick={() => handleSelectExistingCustomer(key)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-slate-50">
                      <span className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[13px]">{(c.name || 'C').charAt(0)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-slate-900 truncate">{c.name}</span>
                        <span className="block text-[12px] text-slate-500 truncate">{c.mobile}{c.vehicle_reg_no ? ` · ${c.vehicle_reg_no}` : ''}</span>
                      </span>
                    </button>
                  );
                })}
                {!filteredCustomers.length && (
                  <button type="button" onClick={() => refreshCustomerList(customerSearchQuery)} className="w-full px-3 py-3 text-[13px] font-bold text-[#D32F2F]">Search all customers</button>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="app-label">Name *</label>
                <input type="text" {...register('customer_name')} className="app-input" placeholder="Full name" />
                {errors.customer_name && <p className="text-rose-500 text-[12px] mt-1">{errors.customer_name.message}</p>}
              </div>
              <div>
                <label className="app-label">Mobile *</label>
                <input type="text" inputMode="numeric" {...register('customer_mobile')} className="app-input" placeholder="10 digits" />
                {errors.customer_mobile && <p className="text-rose-500 text-[12px] mt-1">{errors.customer_mobile.message}</p>}
              </div>
            </div>
            {availableCredits > 0 && (
              <button type="button" onClick={applyLoyaltyCredits} className="app-btn h-11 w-full bg-emerald-50 text-emerald-700">
                <Sparkles size={16} /> Use {formatINR(availableCredits)} loyalty credits
              </button>
            )}
          </section>

          {/* ─── Car ─── */}
          <section className="app-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Car size={18} /></span>
              <h3 className="font-display text-[16px] font-extrabold text-slate-900 flex-1">Car (optional)</h3>
              {currentBrand && <VehicleBrandBadge brand={currentBrand} model={currentModel} size="sm" showText={false} />}
            </div>
            <input type="text" {...register('vehicle_reg_no')} className="app-input font-display font-bold tracking-wider uppercase" placeholder="Number plate" />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={currentBrand}
                onChange={(e) => {
                  setValue('vehicle_brand', e.target.value);
                  setValue('vehicle_model', '');
                }}
                className="app-input"
              >
                <option value="">Brand</option>
                {effectiveBrands.map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                value={currentModel}
                disabled={!currentBrand}
                onChange={(e) => {
                  const modelName = e.target.value;
                  setValue('vehicle_model', modelName);
                  const selectedModelObj = modelsList.find((m: any) => (m.model || m) === modelName);
                  if (selectedModelObj && selectedModelObj.category) setValue('vehicle_category', selectedModelObj.category);
                }}
                className="app-input disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{currentBrand ? 'Model' : 'Brand first'}</option>
                {effectiveModels.map((m: any) => {
                  const mName = typeof m === 'string' ? m : m.model;
                  return <option key={mName} value={mName}>{mName}</option>;
                })}
              </select>
            </div>
            <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
              {[
                ['hatchback', 'Hatchback'], ['medium_hatchback', 'Medium hatch'], ['sedan', 'Sedan'],
                ['premium_sedan', 'Premium sedan'], ['suv', 'SUV'], ['luxury', 'Luxury'],
              ].map(([v, l]) => (
                <button type="button" key={v} onClick={() => setValue('vehicle_category', v)} className={`app-chip shrink-0 h-8 text-[12px] ${currentCategory === v ? 'app-chip-on' : 'app-chip-off'}`}>{l}</button>
              ))}
            </div>
          </section>

          {/* ─── Add items ─── */}
          <section className="app-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center"><Package size={18} /></span>
              <h3 className="font-display text-[16px] font-extrabold text-slate-900 flex-1">Add to bill</h3>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
              {(['service', 'product'] as const).map((k) => (
                <button type="button" key={k} onClick={() => setItemTab(k)} className={`h-9 rounded-xl text-[13px] font-display font-bold ${itemTab === k ? 'bg-white text-slate-900 shadow-app' : 'text-slate-500'}`}>
                  {k === 'service' ? 'Services' : 'Products'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder={itemTab === 'service' ? 'Search services' : 'Search products'} className="app-input pl-10 bg-slate-50" />
            </div>
            <div className="max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-slate-100">
              {(itemTab === 'service' ? shownServices : shownProducts).map((x: any) => {
                const price = itemTab === 'service' ? priceForSegment(x, segment) || Number(x.price) || 0 : Number(x.price || x.selling_price || 0);
                return (
                  <button type="button" key={x.id} onClick={() => (itemTab === 'service' ? addServiceItem(x) : addProductItem(x))} className="w-full flex items-center gap-3 py-2.5 text-left active:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-slate-900 truncate">{itemTab === 'service' ? x.name : x.product_name}</span>
                      <span className="block text-[12px] text-slate-500">{itemTab === 'service' ? (price ? formatINR(price) : 'Set price') : `${x.quantity} ${x.unit || ''} in stock${price ? ` · ${formatINR(price)}` : ''}`}</span>
                    </span>
                    <span className="h-8 w-8 rounded-full bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0"><Plus size={16} /></span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => append({ type: itemTab, id: undefined, name: '', price: 0, quantity: 1 })}
              className="w-full text-[13px] font-bold text-[#D32F2F]"
            >
              + Custom {itemTab}
            </button>
          </section>
        </div>

        <div className="space-y-4 min-w-0">
          {/* ─── Cart ─── */}
          <section className="app-card p-4">
            <h3 className="font-display text-[16px] font-extrabold text-slate-900 mb-2">Bill ({fields.length})</h3>
            {errors.items && <p className="text-rose-500 text-[12px] font-bold mb-2">{errors.items.message}</p>}
            {fields.length ? (
              <div className="divide-y divide-slate-100">
                {fields.map((field, index) => (
                  <div key={field.id} className="py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize ${watchedItems[index]?.type === 'service' ? 'bg-red-50 text-[#D32F2F]' : 'bg-sky-50 text-sky-700'}`}>{watchedItems[index]?.type}</span>
                      <input {...register(`items.${index}.name` as const)} placeholder="Item name" className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-slate-900 outline-none" />
                      <button type="button" onClick={() => remove(index)} className="h-8 w-8 rounded-full text-slate-400 flex items-center justify-center" aria-label="Remove"><Trash2 size={15} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">₹</span>
                        <input type="number" {...register(`items.${index}.price` as const, { valueAsNumber: true })} className="app-input h-10 pl-7 text-[14px]" />
                      </div>
                      {watchedItems[index]?.type === 'product' ? (
                        <div className="flex items-center rounded-xl border border-slate-200">
                          <button type="button" onClick={() => setQty(index, (watchedItems[index]?.quantity || 1) - 1)} className="h-10 w-9 flex items-center justify-center text-slate-600"><Minus size={15} /></button>
                          <span className="w-7 text-center text-[14px] font-bold">{watchedItems[index]?.quantity || 1}</span>
                          <button type="button" onClick={() => setQty(index, (watchedItems[index]?.quantity || 1) + 1)} className="h-10 w-9 flex items-center justify-center text-slate-600"><Plus size={15} /></button>
                        </div>
                      ) : null}
                      <span className="ml-auto font-display font-extrabold text-[15px] text-slate-900">
                        {formatINR((watchedItems[index]?.price || 0) * (watchedItems[index]?.quantity || 1))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-[13px] text-slate-400">Tap a service or product to add it.</p>
            )}
          </section>

          {/* ─── Discount, payment, notes ─── */}
          <section className="app-card p-4 space-y-3">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-900">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-slate-500 flex-1 flex items-center gap-1.5"><Tag size={14} /> Discount</span>
              <select {...register('discount_type')} className="app-input h-10 w-20 px-2 text-[13px]">
                <option value="fixed">₹</option>
                <option value="percentage">%</option>
              </select>
              <input type="number" {...register('discount_value', { valueAsNumber: true })} className="app-input h-10 w-24 text-right text-[14px]" placeholder="0" />
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[13px] font-semibold text-emerald-600"><span>You save</span><span>- {formatINR(discountAmount)}</span></div>
            )}
            <div>
              <p className="app-label">Paid by</p>
              <div className="grid grid-cols-5 gap-1.5">
                {PAY.map(({ v, label, icon: Icon }) => (
                  <button type="button" key={v} onClick={() => setValue('payment_method', v)} className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11.5px] font-bold ${paymentMethod === v ? 'border-[#111] bg-[#111] text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>
            <textarea {...register('description')} rows={2} className="app-input h-auto py-3 resize-none text-[14px]" placeholder="Notes on the invoice (optional)" />
          </section>
        </div>

        {/* ─── Sticky checkout ─── */}
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <div className="shrink-0">
              <p className="text-[11px] font-semibold text-slate-500 leading-none">To pay</p>
              <p className="font-display text-[19px] font-extrabold text-slate-900">{formatINR(total)}</p>
            </div>
            <button type="submit" disabled={submitting || watchedItems.length === 0} className="app-btn-primary flex-1">
              {submitting ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} {submitting ? 'Creating bill…' : 'Create bill'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
