import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Loader2, Save, ShoppingBag, Search, FileText, IndianRupee, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

import api from '../../api/axiosInstance';
import { useServices } from '../../api/hooks/useServices';
import { usePackages } from '../../api/hooks/usePackages';
import { useCreateQuotation, useUpdateQuotation, useQuotation } from '../../api/hooks/useQuotations';
import { useBrands, useModels } from '../../api/hooks/useVehicles';
import { getCategoryForModel, carBrands as fallbackCarBrands, getModelsForBrand } from '../../utils/carData';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';

const CAR_SEGMENTS = [
  { value: 'hatchback', label: 'Small Hatchback', packageCarType: 'SMALL_HATCHBACK', serviceCol: 'price_hatchback' },
  { value: 'medium_hatchback', label: 'Medium Hatchback', packageCarType: 'MEDIUM_HATCHBACK', serviceCol: 'price_medium_hatchback' },
  { value: 'sedan', label: 'Sedan', packageCarType: 'SEDAN_SUV', serviceCol: 'price_sedan' },
  { value: 'premium_sedan', label: 'Premium Sedan', packageCarType: 'PREMIUM_SEDAN', serviceCol: 'price_premium_sedan' },
  { value: 'suv', label: 'SUV / Large Car', packageCarType: 'LARGE_CAR', serviceCol: 'price_suv' }
];

function formatINR(n: number) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface FormItem {
  id?: string;
  item_type: 'service' | 'package' | 'custom';
  item_id: number | null;
  name: string;
  price: number;
  quantity: number;
  total: number;
  pricing_type?: 'basic' | 'premium';
}

export default function QuotationCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carSegment, setCarSegment] = useState('sedan');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'declined'>('draft');

  const [items, setItems] = useState<FormItem[]>([]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [applyTax, setApplyTax] = useState(true);

  // Queries & Mutations
  const { data: servicesRes } = useServices({ active_only: true });
  const { data: packagesRes } = usePackages({ published_only: true });
  const { data: existingQuotation, isLoading: loadingQuotation } = useQuotation(isEdit ? Number(id) : undefined);

  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [selectedCustKey, setSelectedCustKey] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const refreshCustomerList = (searchQuery?: string) => {
    const q = searchQuery || '';
    api.get(`/search/customers?q=${encodeURIComponent(q)}&limit=100`).then(res => {
      setExistingCustomers(res.data?.data || []);
    }).catch(err => console.error(err));
  };

  useEffect(() => {
    refreshCustomerList();

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('customer_updated', () => refreshCustomerList());
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
      if (found.name) setCustomerName(found.name);
      if (found.mobile) setCustomerMobile(found.mobile);
      if (found.email) setCustomerEmail(found.email);
      if (found.vehicle_reg_no) setVehicleNo(found.vehicle_reg_no);
      if (found.vehicle_brand) setCarBrand(found.vehicle_brand);
      if (found.vehicle_model) setCarModel(found.vehicle_model);
      if (found.vehicle_category) setCarSegment(found.vehicle_category);
      toast.success(`Auto-filled details for ${found.name}`);
    }
  };

  const createMutation = useCreateQuotation();
  const updateMutation = useUpdateQuotation();

  const { data: brandsRes } = useBrands();
  const { data: modelsRes } = useModels(carBrand);

  const brandsList: string[] = brandsRes?.data || fallbackCarBrands;
  const modelsList: string[] = modelsRes?.data?.map((m: any) => (typeof m === 'string' ? m : m.model)) || getModelsForBrand(carBrand);

  const servicesCatalog: any[] = servicesRes?.data || [];
  const packagesCatalog: any[] = packagesRes?.data || [];

  useEffect(() => {
    if (existingQuotation?.data) {
      const q = existingQuotation.data;
      setCustomerName(q.customer_name || '');
      setCustomerMobile(q.customer_mobile || '');
      setCustomerEmail(q.customer_email || '');
      setVehicleNo(q.vehicle_no || '');
      setCarBrand(q.car_brand || '');
      setCarModel(q.car_model || '');
      setCarSegment(q.car_segment || 'sedan');
      setValidUntil(q.valid_until ? q.valid_until.split('T')[0] : '');
      setNotes(q.notes || '');
      setStatus(q.status || 'draft');

      setDiscountType(q.discount_type || 'fixed');
      setDiscountValue(Number(q.discount_value) || 0);
      setTaxPercentage(Number(q.tax_percentage) || 18);
      setApplyTax(Number(q.tax_percentage) > 0);

      if (q.items && q.items.length > 0) {
        setItems(q.items.map((it: any) => ({
          id: String(Math.random()),
          item_type: it.item_type || 'service',
          item_id: it.item_id || null,
          name: it.name || '',
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          total: Number(it.total) || 0,
          pricing_type: it.pricing_type || 'basic'
        })));
      }
    }
  }, [existingQuotation]);

  const handleBrandChange = (brand: string) => {
    setCarBrand(brand);
    setCarModel('');
  };

  const handleModelChange = (model: string) => {
    setCarModel(model);
    const cat = getCategoryForModel(carBrand, model);
    if (cat) setCarSegment(cat);
  };

  const getPriceFromCatalog = (
    type: 'service' | 'package',
    itemId: number,
    segment: string,
    pricingTier: 'basic' | 'premium' = 'basic'
  ): number => {
    if (type === 'service') {
      const svc = servicesCatalog.find((s: any) => s.id === itemId);
      if (!svc) return 0;
      const segObj = CAR_SEGMENTS.find(s => s.value === segment);
      const col = segObj ? segObj.serviceCol : 'price_sedan';
      return Number(svc[col] || svc.price || 0);
    } else {
      const pkg = packagesCatalog.find((p: any) => p.id === itemId);
      if (!pkg) return 0;
      if (pricingTier === 'premium') {
        const segObj = CAR_SEGMENTS.find(s => s.value === segment);
        const col = segObj ? `premium_${segObj.serviceCol}` : 'premium_price_sedan';
        return Number(pkg[col] || pkg.price_sedan || 0);
      } else {
        const segObj = CAR_SEGMENTS.find(s => s.value === segment);
        const col = segObj ? segObj.serviceCol : 'price_sedan';
        return Number(pkg[col] || pkg.price_sedan || 0);
      }
    }
  };

  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        item_type: 'service',
        item_id: null,
        name: '',
        price: 0,
        quantity: 1,
        total: 0,
        pricing_type: 'basic'
      }
    ]);
  };

  const handleRemoveItemRow = (tempId: string) => {
    setItems(prev => prev.filter(i => i.id !== tempId));
  };

  const handleUpdateItemRow = (tempId: string, updates: Partial<FormItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== tempId) return item;
      const updated = { ...item, ...updates };

      if (updates.item_type !== undefined || updates.item_id !== undefined || updates.pricing_type !== undefined) {
        const itemType = updates.item_type ?? item.item_type;
        const itemId = updates.item_id ?? item.item_id;
        const pkgTier = updates.pricing_type ?? item.pricing_type ?? 'basic';

        if (itemType !== 'custom' && itemId) {
          const catalogItem = itemType === 'service' 
            ? servicesCatalog.find((s: any) => s.id === itemId)
            : packagesCatalog.find((p: any) => p.id === itemId);
          
          updated.name = catalogItem?.name || '';
          updated.price = getPriceFromCatalog(itemType, itemId, carSegment, pkgTier);
        } else if (itemType === 'custom') {
          updated.item_id = null;
          if (updates.item_type !== undefined) {
            updated.name = '';
            updated.price = 0;
          }
        }
      }

      updated.total = updated.price * updated.quantity;
      return updated;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  
  let discount_amount = 0;
  if (discountType === 'percentage') {
    discount_amount = subtotal * (discountValue / 100);
  } else {
    discount_amount = discountValue;
  }
  discount_amount = Math.min(subtotal, Math.max(0, discount_amount));

  const afterDiscount = Math.max(0, subtotal - discount_amount);
  const tax_amount = applyTax ? afterDiscount * (taxPercentage / 100) : 0;
  const grand_total = afterDiscount + tax_amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !customerMobile) {
      toast.error('Please enter customer name and mobile number');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one service or package');
      return;
    }

    const invalidRow = items.find(item => !item.name.trim() || item.price < 0 || item.quantity <= 0);
    if (invalidRow) {
      toast.error('Please ensure all items have descriptions, valid rates, and quantities');
      return;
    }

    const payload = {
      customer_name: customerName,
      customer_mobile: customerMobile,
      customer_email: customerEmail,
      vehicle_no: vehicleNo,
      car_brand: carBrand,
      car_model: carModel,
      car_segment: carSegment,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount,
      tax_percentage: applyTax ? taxPercentage : 0,
      tax_amount,
      grand_total,
      valid_until: validUntil,
      notes,
      status,
      items: items.map(it => ({
        item_type: it.item_type,
        item_id: it.item_id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        total: it.total,
        pricing_type: it.pricing_type
      }))
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(id), ...payload });
        toast.success('Quotation updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Quotation created successfully');
      }
      navigate('/admin/quotations');
    } catch (err) {
      toast.error('Failed to save quotation. Check server logs.');
    }
  };

  if (isEdit && loadingQuotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 size={36} className="animate-spin text-[#D32F2F]" />
        <p className="mt-3 text-xs font-bold text-slate-500">Loading proposal details...</p>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title={isEdit ? 'Edit Quotation Estimate' : 'Draft Service Proposal'}
        subtitle="Draft a detailed service estimate with segment-matched workshop rates"
        actions={
          <button
            onClick={() => navigate('/admin/quotations')}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <ArrowLeft size={15} />
            <span>All Proposals</span>
          </button>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Estimated Line Items"
          value={items.length}
          trend={{ text: 'Configured services', positive: true }}
          icon={<ShoppingBag size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Subtotal Estimation"
          value={`₹${formatINR(subtotal)}`}
          trend={{ text: 'Gross catalog rates', positive: true }}
          icon={<IndianRupee size={20} />}
          accentColor="sky"
        />
        <AdminMetricCard
          label="GST Tax Component"
          value={applyTax ? `₹${formatINR(tax_amount)}` : 'Exempt'}
          trend={{ text: `${taxPercentage}% GST rate`, positive: true }}
          icon={<ShieldCheck size={20} />}
          accentColor="amber"
        />
        <AdminMetricCard
          label="Estimated Grand Total"
          value={`₹${formatINR(grand_total)}`}
          trend={{ text: 'Final client proposal', positive: true }}
          icon={<CheckCircle2 size={20} />}
          accentColor="emerald"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Customer & Line Items */}
          <div className="lg:col-span-8 space-y-6">
            {/* Customer & Vehicle Information */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Client & Vehicle Information</h3>
                {carBrand && (
                  <VehicleBrandBadge
                    brand={carBrand}
                    model={carModel}
                    regNo={vehicleNo}
                    size="sm"
                  />
                )}
              </div>

              {/* Quick Search Saved Customers */}
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7f1d1d] uppercase tracking-wider">
                    ⚡ Auto-Fill From Saved Directory ({filteredCustomers.length} clients)
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
                      placeholder="Search client by name, phone or vehicle plate..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-red-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshCustomerList(customerSearchQuery)}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xs shrink-0"
                  >
                    Search
                  </button>
                </div>
                <select
                  value={selectedCustKey}
                  onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-xs"
                >
                  <option value="">-- Select Saved Client from Search --</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Customer Name *</label>
                  <input
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
                    placeholder="e.g. Gaurav Kapoor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mobile Number *</label>
                  <input
                    required
                    value={customerMobile}
                    onChange={e => setCustomerMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
                    placeholder="e.g. gaurav@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Registration Plate No</label>
                  <input
                    value={vehicleNo}
                    onChange={e => setVehicleNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 text-xs sm:text-sm font-bold uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
                    placeholder="e.g. MH 02 CD 5678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Vehicle Brand</label>
                  <select
                    value={carBrand}
                    onChange={e => handleBrandChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Choose Brand --</option>
                    {brandsList.map((b: string) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Vehicle Model</label>
                  <select
                    value={carModel}
                    disabled={!carBrand}
                    onChange={e => handleModelChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white disabled:bg-slate-100"
                  >
                    <option value="">{carBrand ? '-- Choose Model --' : 'Select brand first'}</option>
                    {modelsList.map((m: string) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Vehicle Segment (Auto-sets catalog rates)</label>
                  <select
                    value={carSegment}
                    onChange={e => setCarSegment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white"
                  >
                    {CAR_SEGMENTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Estimate Line Items</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Add services, packages or custom workshop lines</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="px-4 py-2 rounded-2xl bg-red-50 border border-red-200 text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <Plus size={14} />
                  <span>Add Line Item</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No items added to this proposal yet.</p>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="mt-3 text-xs font-bold text-[#D32F2F] hover:underline"
                  >
                    + Click here to add the first item
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-3">
                          <select
                            value={item.item_type}
                            onChange={e => handleUpdateItemRow(item.id!, { item_type: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                          >
                            <option value="service">Service</option>
                            <option value="package">Package</option>
                            <option value="custom">Custom Line</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          {item.item_type === 'service' ? (
                            <select
                              value={item.item_id || ''}
                              onChange={e => handleUpdateItemRow(item.id!, { item_id: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900"
                            >
                              <option value="">-- Select Service --</option>
                              {servicesCatalog.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          ) : item.item_type === 'package' ? (
                            <select
                              value={item.item_id || ''}
                              onChange={e => handleUpdateItemRow(item.id!, { item_id: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900"
                            >
                              <option value="">-- Select Package --</option>
                              {packagesCatalog.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={item.name}
                              onChange={e => handleUpdateItemRow(item.id!, { name: e.target.value })}
                              placeholder="Enter item description..."
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                            />
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            value={item.price}
                            onChange={e => handleUpdateItemRow(item.id!, { price: parseFloat(e.target.value) || 0 })}
                            placeholder="Rate (₹)"
                            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateItemRow(item.id!, { quantity: parseInt(e.target.value) || 1 })}
                            className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-center text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2 text-right flex items-center justify-end gap-2">
                          <span className="font-extrabold text-slate-900 text-xs">
                            ₹{formatINR(item.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(item.id!)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Settings & Grand Total */}
          <div className="lg:col-span-4 space-y-6">
            {/* Estimate Parameters */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Proposal Parameters</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Proposal Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white"
                >
                  <option value="draft">Draft Proposal</option>
                  <option value="sent">Sent to Client</option>
                  <option value="accepted">Accepted by Client</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valid Until Date</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Proposal Remarks & Terms</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Terms, vehicle pre-inspection notes, warranty conditions..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* Dark Luxury Grand Total Checkout Card */}
            <div className="rounded-3xl bg-slate-950 text-white p-6 sm:p-7 border border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.12)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Financial Summary</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#D32F2F]/20 text-red-300 border border-red-500/30">
                  {items.length} Line Items
                </span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Gross Subtotal</span>
                  <span className="font-bold text-white">₹{formatINR(subtotal)}</span>
                </div>

                {/* Discount options */}
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Discount Override</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${discountType === 'fixed' ? 'bg-[#D32F2F] text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        ₹ Fixed
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${discountType === 'percentage' ? 'bg-[#D32F2F] text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        % Off
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={discountValue}
                    min="0"
                    onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-1 text-xs font-bold text-right"
                    placeholder="0"
                  />
                  {discount_amount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-400 font-semibold pt-1">
                      <span>Discount Amount</span>
                      <span>- ₹{formatINR(discount_amount)}</span>
                    </div>
                  )}
                </div>

                {/* GST Tax Toggle */}
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={applyTax}
                        onChange={e => setApplyTax(e.target.checked)}
                        className="rounded accent-[#D32F2F]"
                      />
                      <span>Apply GST Tax</span>
                    </label>
                    {applyTax && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={taxPercentage}
                          onChange={e => setTaxPercentage(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-12 bg-slate-950 border border-slate-700 text-white rounded-lg px-1.5 py-0.5 text-center text-xs font-bold"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    )}
                  </div>
                  {applyTax && (
                    <div className="flex justify-between text-xs text-slate-400 pt-1">
                      <span>Calculated GST</span>
                      <span className="font-bold text-white">₹{formatINR(tax_amount)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Estimated Grand Total</span>
                  <span className="text-2xl sm:text-3xl font-black text-white">₹{formatINR(grand_total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || items.length === 0}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isEdit ? 'Save Changes' : 'Publish Quotation'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
