import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, Package, Search, Plus, Trash2, User, Car,
  FileText, ShieldCheck, Tag, AlertTriangle
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';

import AdminTopBar from '../../components/layout/AdminTopBar';
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
  const watchedCustomerName = watch("customer_name");
  const watchedRegNo = watch("vehicle_reg_no");
  const currentBrand = watch("vehicle_brand") || '';
  const currentModel = watch("vehicle_model") || '';
  const currentCategory = watch("vehicle_category") || '';

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

  // Auto-fill details when mobile number is typed (length >= 10)
  useEffect(() => {
    if (watchedCustomerMobile && watchedCustomerMobile.length >= 10) {
      api.get(`/search/customers?q=${watchedCustomerMobile}`).then(res => {
        const list = res.data?.data || [];
        const match = list.find((c: any) => c.mobile === watchedCustomerMobile || (c.mobile && c.mobile.includes(watchedCustomerMobile)));
        if (match) applyCustomerMatch(match);
      }).catch(err => console.error(err));
    }
  }, [watchedCustomerMobile]);

  // Auto-fill details when customer name is typed (length >= 3)
  useEffect(() => {
    if (watchedCustomerName && watchedCustomerName.trim().length >= 3) {
      api.get(`/search/customers?q=${encodeURIComponent(watchedCustomerName.trim())}`).then(res => {
        const list = res.data?.data || [];
        const match = list.find((c: any) => c.name && c.name.toLowerCase().includes(watchedCustomerName.trim().toLowerCase()));
        if (match) applyCustomerMatch(match);
      }).catch(err => console.error(err));
    }
  }, [watchedCustomerName]);

  // Auto-fill details when registration number is typed (length >= 4)
  useEffect(() => {
    if (watchedRegNo && watchedRegNo.trim().length >= 4) {
      api.get(`/search/customers?q=${encodeURIComponent(watchedRegNo.trim())}`).then(res => {
        const list = res.data?.data || [];
        const match = list.find((c: any) => c.vehicle_reg_no && c.vehicle_reg_no.toLowerCase().includes(watchedRegNo.trim().toLowerCase()));
        if (match) applyCustomerMatch(match);
      }).catch(err => console.error(err));
    }
  }, [watchedRegNo]);

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

      const res = await api.post('/billing', payload);
      toast.success('Bill generated successfully!');
      
      // Optionally redirect to a print view or clear form
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate bill');
    } finally {
      setSubmitting(false);
    }
  };

  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [selectedCustKey, setSelectedCustKey] = useState('');

  useEffect(() => {
    api.get('/search/customers?limit=100').then(res => {
      setExistingCustomers(res.data?.data || []);
    }).catch(err => console.error(err));
  }, []);

  const handleSelectExistingCustomer = (key: string) => {
    setSelectedCustKey(key);
    if (!key) return;
    const found = existingCustomers.find(c => (c.mobile || c.name || '') === key);
    if (found) {
      setValue('customer_name', found.name || '');
      setValue('customer_mobile', found.mobile || '');
      if (found.vehicle_brand) setValue('vehicle_brand', found.vehicle_brand);
      if (found.vehicle_model) setValue('vehicle_model', found.vehicle_model);
      if (found.vehicle_reg_no) setValue('vehicle_reg_no', found.vehicle_reg_no);
      if (found.vehicle_category) setValue('vehicle_category', found.vehicle_category);
      toast.success(`Auto-filled details for ${found.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <AdminTopBar
        title="Quick Billing (POS)"
        subtitle="Generate instant invoices without job cards"
      />

      <div className="max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Customer Details */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-[#1c1b1b] mb-3 flex items-center gap-2">
              <User size={18} className="text-[#D32F2F]" /> Customer Details
            </h2>

            {/* Auto-fill Customer Selector */}
            {existingCustomers.length > 0 && (
              <div className="mb-4 bg-gradient-to-r from-red-50/60 to-orange-50/60 p-3.5 rounded-xl border border-red-100">
                <label className="block text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span>⚡ Auto-fill Existing Customer / Manual Bill</span>
                </label>
                <select
                  value={selectedCustKey}
                  onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
                >
                  <option value="">-- Select Existing Customer to Auto-fill --</option>
                  {existingCustomers.map((c: any, idx: number) => (
                    <option key={idx} value={c.mobile || c.name}>
                      {c.name} {c.mobile ? `(${c.mobile})` : ''} {c.vehicle_reg_no ? `— [${c.vehicle_reg_no}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Customer Name</label>
                <input
                  type="text"
                  {...register("customer_name")}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all text-sm font-semibold"
                  placeholder="e.g. Rahul Sharma"
                />
                {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Mobile Number</label>
                <input
                  type="text"
                  {...register("customer_mobile")}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all text-sm font-semibold"
                  placeholder="e.g. 9876543210"
                />
                {errors.customer_mobile && <p className="text-red-500 text-xs mt-1">{errors.customer_mobile.message}</p>}
                
                {availableCredits > 0 && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg flex items-center justify-between border border-green-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-green-700">Available Credits</p>
                      <p className="text-sm font-black text-green-800">{formatINR(availableCredits)}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={applyLoyaltyCredits}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
                    >
                      Redeem
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-[#1c1b1b] mb-4 flex items-center gap-2">
              <Car size={18} className="text-[#D32F2F]" /> Vehicle Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Vehicle Brand</label>
                <select
                  value={currentBrand}
                  onChange={(e) => {
                    setValue("vehicle_brand", e.target.value);
                    setValue("vehicle_model", "");
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#D32F2F] outline-none bg-white font-medium"
                >
                  <option value="">-- Select Brand --</option>
                  {effectiveBrands.map((b: string) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Vehicle Model</label>
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#D32F2F] outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                >
                  <option value="">{currentBrand ? '-- Select Model --' : 'Select Brand First'}</option>
                  {effectiveModels.map((m: any) => {
                    const mName = typeof m === 'string' ? m : m.model;
                    return <option key={mName} value={mName}>{mName}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Registration Number</label>
                <input
                  type="text"
                  {...register("vehicle_reg_no")}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all uppercase text-sm font-semibold"
                  placeholder="e.g. MH12AB1234"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Category</label>
                <select
                  value={currentCategory}
                  onChange={(e) => setValue("vehicle_category", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#D32F2F] outline-none bg-white font-medium"
                >
                  <option value="">Select Category...</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="medium_hatchback">Med Hatchback</option>
                  <option value="sedan">Sedan</option>
                  <option value="premium_sedan">Premium Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="luxury">Luxury / Multi-Utility</option>
                </select>
              </div>
            </div>
          </div>

          {/* Add Items */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#1c1b1b] flex items-center gap-2">
                <Package size={18} className="text-[#D32F2F]" /> Bill Items
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Add Service</label>
                <select onChange={handleAddService} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#D32F2F] outline-none">
                  <option value="">-- Select Service --</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
                  ))}
                  <option value="other">-- Other (Custom) --</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Add Product</label>
                <select onChange={handleAddProduct} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#D32F2F] outline-none">
                  <option value="">-- Select Inventory Product --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.product_name} ({p.quantity} in stock)</option>
                  ))}
                  <option value="other">-- Other (Custom) --</option>
                </select>
              </div>
            </div>

            {errors.items && <p className="text-red-500 text-xs mb-4">{errors.items.message}</p>}

            {fields.length > 0 ? (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-[#faf7f5] rounded-xl border border-gray-100 items-start sm:items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#5f5e5e] uppercase mb-1">{watchedItems[index].type}</p>
                      <input
                        {...register(`items.${index}.name` as const)}
                        className="w-full px-2 py-1 bg-white rounded border border-gray-200 text-sm font-medium"
                      />
                    </div>
                    
                    <div className="w-full sm:w-24">
                      <p className="text-[10px] font-bold text-[#5f5e5e] uppercase mb-1">Price</p>
                      <input
                        type="number"
                        {...register(`items.${index}.price` as const, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-white rounded border border-gray-200 text-sm"
                      />
                    </div>

                    {watchedItems[index].type === 'product' && (
                      <div className="w-full sm:w-20">
                        <p className="text-[10px] font-bold text-[#5f5e5e] uppercase mb-1">Qty</p>
                        <input
                          type="number"
                          {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                          className="w-full px-2 py-1 bg-white rounded border border-gray-200 text-sm"
                        />
                      </div>
                    )}

                    <div className="w-full sm:w-24 text-right">
                      <p className="text-[10px] font-bold text-[#5f5e5e] uppercase mb-1">Amount</p>
                      <p className="font-bold text-[#1c1b1b]">
                        ₹{((watchedItems[index]?.price || 0) * (watchedItems[index]?.quantity || 1)).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg mt-4 sm:mt-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Package size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-[#5f5e5e]">No items added yet.</p>
              </div>
            )}
          </div>

          {/* Payment & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-bold text-[#1c1b1b] mb-4">Payment & Notes</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Payment Method</label>
                    <select
                      {...register("payment_method")}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5f5e5e] mb-1">Bill Description / Notes</label>
                    <textarea
                      {...register("description")}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none"
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h2 className="text-sm font-bold text-[#1c1b1b] mb-4">Bill Summary</h2>
              
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5f5e5e] font-medium">Subtotal</span>
                  <span className="font-bold text-[#1c1b1b]">{formatINR(subtotal)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[#5f5e5e] uppercase">Discount Type</label>
                    <select {...register("discount_type")} className="w-full text-xs p-1 mt-1 border rounded">
                      <option value="fixed">Fixed (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[#5f5e5e] uppercase">Value</label>
                    <input 
                      type="number" 
                      {...register("discount_value", { valueAsNumber: true })} 
                      className="w-full text-xs p-1 mt-1 border rounded"
                    />
                  </div>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="font-medium">Discount</span>
                    <span className="font-bold">- {formatINR(discountAmount)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-black text-[#1c1b1b]">Total Payable</span>
                <span className="text-2xl font-black text-[#D32F2F]">{formatINR(total)}</span>
              </div>
              
              <Button
                type="submit"
                loading={submitting}
                className="w-full py-3"
              >
                Generate Bill
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
