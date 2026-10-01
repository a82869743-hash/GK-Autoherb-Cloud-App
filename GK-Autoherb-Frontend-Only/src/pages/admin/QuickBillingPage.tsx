import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
  IndianRupee, Package, Search, Plus, Trash2, User, Car,
  FileText, ShieldCheck, Tag, AlertTriangle, ArrowLeft, CheckCircle2, Sparkles, CreditCard
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';

import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import Button from '../../components/ui/Button';
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
        append({ type: 'service', id: service.id, name: service.name, price: Number(service.price), quantity: 1 });
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

      await api.post('/billing', payload);
      toast.success('Bill generated successfully!');
      navigate('/admin/invoices');
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

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

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

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Quick Billing (POS)"
        subtitle="Generate instant customer invoices, counter product sales, and direct service bills"
        actions={
          <button
            onClick={() => navigate('/admin/invoices')}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <ArrowLeft size={15} />
            <span>All Invoices</span>
          </button>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Bill Subtotal"
          value={formatINR(subtotal)}
          trend={{ text: `${watchedItems.length} items queued`, positive: true }}
          icon={<IndianRupee size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Discount Applied"
          value={formatINR(discountAmount)}
          trend={{ text: discountType === 'percentage' ? `${discountValue}% off` : 'Fixed discount', positive: true }}
          icon={<Tag size={20} />}
          accentColor="amber"
        />
        <AdminMetricCard
          label="Total Payable"
          value={formatINR(total)}
          trend={{ text: 'Net invoice amount', positive: true }}
          icon={<CheckCircle2 size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Client Loyalty Credits"
          value={formatINR(availableCredits)}
          trend={{ text: availableCredits > 0 ? 'Eligible for discount' : 'No balance', positive: availableCredits > 0 }}
          icon={<Sparkles size={20} />}
          accentColor="purple"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Client & Vehicle Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Customer Identification */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Client Identity</h3>
                </div>
                {availableCredits > 0 && (
                  <button 
                    type="button" 
                    onClick={applyLoyaltyCredits}
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1"
                  >
                    <Sparkles size={13} />
                    <span>Redeem {formatINR(availableCredits)} Credits</span>
                  </button>
                )}
              </div>

              {/* Search & Select Saved Customer */}
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7f1d1d] uppercase tracking-wider">
                    ⚡ Quick Search Directory ({filteredCustomers.length} clients)
                  </span>
                  {selectedCustKey && (
                    <button
                      type="button"
                      onClick={() => { setSelectedCustKey(''); setCustomerSearchQuery(''); }}
                      className="text-[11px] text-[#D32F2F] hover:text-[#991b1b] font-bold underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Type name, mobile or vehicle registration plate..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-red-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshCustomerList(customerSearchQuery)}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shrink-0 shadow-xs"
                  >
                    Search
                  </button>
                </div>
                <select
                  value={selectedCustKey}
                  onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-xs"
                >
                  <option value="">-- Choose from Search Results --</option>
                  {filteredCustomers.map((c: any, idx: number) => {
                    const uniqueVal = c.id ? `user_${c.id}` : `bill_${c.mobile}_${c.name}_${idx}`;
                    return (
                      <option key={uniqueVal} value={uniqueVal}>
                        {c.name} {c.mobile ? `(${c.mobile})` : ''} {c.vehicle_reg_no ? `— [${c.vehicle_reg_no}]` : ''} {c.vehicle_brand ? `(${c.vehicle_brand} ${c.vehicle_model || ''})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    {...register("customer_name")}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 focus:border-[#D32F2F] focus:ring-2 focus:ring-red-500/20 outline-none text-xs sm:text-sm font-semibold bg-slate-50/50 focus:bg-white transition-all"
                    placeholder="e.g. Aryan Sharma"
                  />
                  {errors.customer_name && <p className="text-rose-500 text-xs mt-1">{errors.customer_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    {...register("customer_mobile")}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 focus:border-[#D32F2F] focus:ring-2 focus:ring-red-500/20 outline-none text-xs sm:text-sm font-semibold bg-slate-50/50 focus:bg-white transition-all"
                    placeholder="e.g. 9876543210"
                  />
                  {errors.customer_mobile && <p className="text-rose-500 text-xs mt-1">{errors.customer_mobile.message}</p>}
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center">
                    <Car size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Vehicle Garage Identification</h3>
                </div>
                {currentBrand && (
                  <VehicleBrandBadge
                    brand={currentBrand}
                    model={currentModel}
                    regNo={currentRegNo}
                    size="sm"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Vehicle Brand</label>
                  <select
                    value={currentBrand}
                    onChange={(e) => {
                      setValue("vehicle_brand", e.target.value);
                      setValue("vehicle_model", "");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-[#D32F2F] outline-none bg-slate-50/50 focus:bg-white font-semibold"
                  >
                    <option value="">-- Select Brand --</option>
                    {effectiveBrands.map((b: string) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Vehicle Model</label>
                  <select
                    value={currentModel}
                    disabled={!currentBrand}
                    onChange={(e) => {
                      const modelName = e.target.value;
                      setValue("vehicle_model", modelName);
                      const selectedModelObj = modelsList.find((m: any) => (m.model || m) === modelName);
                      if (selectedModelObj && selectedModelObj.category) {
                        setValue("vehicle_category", selectedModelObj.category);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-[#D32F2F] outline-none bg-slate-50/50 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 font-semibold"
                  >
                    <option value="">{currentBrand ? '-- Select Model --' : 'Select Brand First'}</option>
                    {effectiveModels.map((m: any) => {
                      const mName = typeof m === 'string' ? m : m.model;
                      return <option key={mName} value={mName}>{mName}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Registration Plate</label>
                  <input
                    type="text"
                    {...register("vehicle_reg_no")}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-[#D32F2F] focus:ring-2 focus:ring-red-500/20 outline-none uppercase text-xs sm:text-sm font-bold bg-slate-50/50 focus:bg-white"
                    placeholder="e.g. MH 12 AB 1234"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Body Segment</label>
                  <select
                    value={currentCategory}
                    onChange={(e) => setValue("vehicle_category", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-[#D32F2F] outline-none bg-slate-50/50 focus:bg-white font-semibold"
                  >
                    <option value="">Select Category...</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="medium_hatchback">Medium Hatchback</option>
                    <option value="sedan">Sedan</option>
                    <option value="premium_sedan">Premium Sedan</option>
                    <option value="suv">SUV / Luxury 4x4</option>
                    <option value="luxury">Luxury / Multi-Utility</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bill Items Selection & List */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center">
                    <Package size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Invoice Line Items</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">{watchedItems.length} items added</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">+ Add Detailing Service</label>
                  <select 
                    onChange={handleAddService} 
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-[#D32F2F] outline-none bg-slate-50 font-semibold cursor-pointer"
                  >
                    <option value="">-- Choose Workshop Service --</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
                    ))}
                    <option value="other">-- Custom Service Entry --</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">+ Add Inventory Product</label>
                  <select 
                    onChange={handleAddProduct} 
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-[#D32F2F] outline-none bg-slate-50 font-semibold cursor-pointer"
                  >
                    <option value="">-- Choose Chemical / Product --</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.product_name} ({p.quantity} in stock)</option>
                    ))}
                    <option value="other">-- Custom Retail Product --</option>
                  </select>
                </div>
              </div>

              {errors.items && <p className="text-rose-500 text-xs font-bold">{errors.items.message}</p>}

              {fields.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 items-start sm:items-center">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-red-50 text-[#b71c1c] border border-red-100">
                          {watchedItems[index].type}
                        </span>
                        <input
                          {...register(`items.${index}.name` as const)}
                          className="w-full px-2.5 py-1.5 mt-1.5 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900"
                        />
                      </div>
                      
                      <div className="w-full sm:w-28">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Unit Price (₹)</span>
                        <input
                          type="number"
                          {...register(`items.${index}.price` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 mt-1 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900"
                        />
                      </div>

                      {watchedItems[index].type === 'product' && (
                        <div className="w-full sm:w-20">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Qty</span>
                          <input
                            type="number"
                            {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                            className="w-full px-2.5 py-1.5 mt-1 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 text-center"
                          />
                        </div>
                      )}

                      <div className="w-full sm:w-28 text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                        <p className="font-extrabold text-slate-900 text-sm mt-1">
                          ₹{((watchedItems[index]?.price || 0) * (watchedItems[index]?.quantity || 1)).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all self-end sm:self-center"
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Package size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Select a service or retail product above to add to this invoice.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Payment Method & Grand Total Checkout Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Payment & Description Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
                <CreditCard size={18} className="text-[#D32F2F]" />
                <span>Payment & Remarks</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Payment Method</label>
                <select
                  {...register("payment_method")}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-[#D32F2F] outline-none bg-slate-50 font-bold"
                >
                  <option value="cash">Cash Counter</option>
                  <option value="upi">UPI / QR Code Scan</option>
                  <option value="card">Credit / Debit Card POS</option>
                  <option value="bank_transfer">Direct Bank NEFT / IMPS</option>
                  <option value="other">Other / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Invoice Notes / Remarks</label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-[#D32F2F] outline-none bg-slate-50 focus:bg-white resize-none font-medium"
                  placeholder="Optional customer requests or service notes..."
                />
              </div>
            </div>

            {/* ClaimTrack Luxury Grand Total Checkout Card */}
            <div className="rounded-3xl bg-slate-950 text-white p-6 sm:p-7 border border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.12)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Order Summary</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#D32F2F]/20 text-red-300 border border-red-500/30">
                  POS Checkout
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs sm:text-sm text-slate-300 font-medium">
                  <span>Gross Subtotal</span>
                  <span className="font-bold text-white">{formatINR(subtotal)}</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discount Engine</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      {...register("discount_type")} 
                      className="text-xs bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 font-bold"
                    >
                      <option value="fixed">Fixed (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                    <input 
                      type="number" 
                      {...register("discount_value", { valueAsNumber: true })} 
                      className="text-xs bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 font-bold text-right"
                      placeholder="0"
                    />
                  </div>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-emerald-400 font-semibold">
                    <span>Discount Deducted</span>
                    <span>- {formatINR(discountAmount)}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Net Amount Payable</span>
                  <span className="text-2xl sm:text-3xl font-black text-white">{formatINR(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || watchedItems.length === 0}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Generating Invoice...' : 'Generate & Confirm Bill'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
