import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { PlusCircle, Search, User, Car, Phone, Mail, Box, Calendar, Loader2, IndianRupee, UserPlus, Package, ShieldCheck, Sparkles } from 'lucide-react';
import { useBrands, useModels } from '../../api/hooks/useVehicles';
import { getCategoryForModel } from '../../utils/carData';
import SearchableSelect from '../../components/ui/SearchableSelect';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';

interface OfflineRegistration {
  customer_id: number;
  name: string;
  mobile: string;
  brand: string;
  model: string;
  registration_no: string;
  package_id: number | null;
  package_name: string | null;
  status: string | null;
  created_at: string;
}

export default function ManualRegistrationPage() {
  const [registrations, setRegistrations] = useState<OfflineRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    brand: '',
    model: '',
    category: '',
    registration_no: '',
    package_id: '',
    price: '',
    package_start_date: new Date().toISOString().split('T')[0],
    package_end_date: ''
  });

  const [packages, setPackages] = useState<any[]>([]);
  const [packageServices, setPackageServices] = useState<any[]>([]);
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');

  // Car brand/model lists
  const { data: brandsRes } = useBrands();
  const { data: modelsRes } = useModels(formData.brand);
  const brandsList: string[] = brandsRes?.data || [];
  const modelsList: string[] = modelsRes?.data || [];

  const brandsOptions = [
    ...brandsList.map((b: string) => ({ value: b, label: b })),
    { value: 'Others', label: 'Others (Enter Manually)' }
  ];

  const modelsOptions = [
    ...modelsList.map((m: string) => ({ value: m, label: m })),
    { value: 'Others', label: 'Others (Enter Manually)' }
  ];

  useEffect(() => {
    fetchRegistrations();
    fetchPackages();
  }, []);

  useEffect(() => {
    if (!formData.package_id) {
      setPackageServices([]);
      return;
    }
    const loadServices = async () => {
      try {
        const res = await api.get(`/packages/${formData.package_id}/services`);
        if (res.data.success) {
          const mapped = res.data.data.map((s: any) => ({
            service_name: s.name,
            total_count: s.total_count || 1,
            remaining: s.total_count || 1,
            complimentary: s.complimentary || 0,
            display_order: s.display_order || 0
          }));
          setPackageServices(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch package services:', err);
      }
    };
    loadServices();
  }, [formData.package_id]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers/manual-registration/list', { params: { search } });
      if (res.data.success) {
        setRegistrations(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      if (res.data.success) {
        setPackages(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegistrations();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBrand = formData.brand === 'Others' ? customBrand : formData.brand;
    const finalModel = (formData.brand === 'Others' || formData.model === 'Others') ? customModel : formData.model;

    if (formData.package_id) {
      if (!finalBrand.trim() || !finalModel.trim() || !formData.registration_no.trim() || !formData.category) {
        alert('All vehicle details (Brand, Model, Reg No, Category) are required when selecting a package.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        brand: finalBrand,
        model: finalModel,
        package_custom_services: formData.package_id ? packageServices : undefined
      };
      const res = await api.post('/customers/manual-registration', payload);
      if (res.data.success) {
        alert('Customer registered successfully!');
        setFormData({
          name: '', mobile: '', email: '', brand: '', model: '',
          category: '', registration_no: '', package_id: '', price: '',
          package_start_date: new Date().toISOString().split('T')[0],
          package_end_date: ''
        });
        setCustomBrand('');
        setCustomModel('');
        setPackageServices([]);
        fetchRegistrations();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to register customer');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto lookup when a 10-digit mobile number is typed
  useEffect(() => {
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length === 10) {
      const lookupCustomer = async () => {
        try {
          const res = await api.get(`/customers/lookup/${cleanMobile}`);
          if (res.data.success && res.data.found) {
            const cust = res.data.data;
            setFormData(prev => ({
              ...prev,
              name: cust.name || prev.name,
              email: cust.email || prev.email || '',
              brand: cust.vehicle?.brand || prev.brand || '',
              model: cust.vehicle?.model || prev.model || '',
              category: cust.vehicle?.category || prev.category || '',
              registration_no: cust.vehicle?.registration_no || prev.registration_no || ''
            }));
          }
        } catch (err) {
          console.warn('Customer auto-lookup failed:', err);
        }
      };
      lookupCustomer();
    }
  }, [formData.mobile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const packageEnrolledCount = registrations.filter(r => r.package_id).length;

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Walk-in Client Onboarding"
        subtitle="Manually register walk-in studio clients, vehicle garage records, and assign package subscriptions"
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Total Walk-in Registrations"
          value={registrations.length}
          trend={{ text: 'Counter Intakes', positive: true }}
          icon={<UserPlus size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Packages Assigned"
          value={packageEnrolledCount}
          trend={{ text: 'Enrolled Members', positive: true }}
          icon={<Package size={20} />}
          accentColor="purple"
        />
        <AdminMetricCard
          label="Auto-Lookup Active"
          value="Enabled"
          trend={{ text: 'Phone matching on', positive: true }}
          icon={<Sparkles size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Garage Fleet Sync"
          value="Direct"
          trend={{ text: 'Instant DB sync', positive: true }}
          icon={<ShieldCheck size={20} />}
          accentColor="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-5">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-7 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center">
                <PlusCircle size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">New Client Onboarding</h3>
                <p className="text-[11px] text-slate-400 font-medium">Fill in client & vehicle details</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Identity</h4>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all font-medium" 
                    placeholder="Enter customer full name" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="tel" 
                    name="mobile" 
                    value={formData.mobile} 
                    onChange={handleChange} 
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all font-medium" 
                    placeholder="10-digit mobile number" 
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Typing 10 digits auto-fills saved client records.</p>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="space-y-3.5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Garage Vehicle</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableSelect
                    label="Brand"
                    options={brandsOptions}
                    value={formData.brand}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, brand: e.target.value, model: '', category: '' }));
                      setCustomBrand('');
                      setCustomModel('');
                    }}
                    placeholder="Select Brand"
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Model"
                    options={modelsOptions}
                    value={formData.model}
                    onChange={(e) => {
                      const mVal = e.target.value;
                      const cat = getCategoryForModel(formData.brand, mVal) || '';
                      setFormData(prev => ({ ...prev, model: mVal, category: cat }));
                      setCustomModel('');
                    }}
                    placeholder={formData.brand ? "Select Model" : "Select brand first"}
                    disabled={!formData.brand || formData.brand === 'Others'}
                  />
                </div>
              </div>

              {(formData.brand === 'Others' || formData.model === 'Others') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {formData.brand === 'Others' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Brand Name</label>
                      <input
                        type="text"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        placeholder="e.g. Porsche"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>
                  )}
                  {(formData.brand === 'Others' || formData.model === 'Others') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Model Name</label>
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="e.g. Cayenne"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Plate Number</label>
                  <input 
                    name="registration_no" 
                    value={formData.registration_no} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm uppercase focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] font-bold" 
                    placeholder="MH 01 AB 1234" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Body Segment</label>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 font-semibold"
                  >
                    <option value="">Select Category...</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="medium_hatchback">Medium Hatchback</option>
                    <option value="sedan">Sedan</option>
                    <option value="premium_sedan">Premium Sedan</option>
                    <option value="suv">SUV / Luxury</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="space-y-3.5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Package Subscription (Optional)</h4>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Package Choice</label>
                <select 
                  name="package_id" 
                  value={formData.package_id} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 font-semibold"
                >
                  <option value="">No Package (Service only)</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {formData.package_id && (
                <div className="space-y-3.5 p-4 bg-red-50/50 rounded-2xl border border-red-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price Paid (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        name="price" 
                        value={formData.price} 
                        onChange={handleChange} 
                        className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500" 
                        placeholder="0" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        name="package_start_date" 
                        value={formData.package_start_date} 
                        onChange={handleChange} 
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
                      <input 
                        type="date" 
                        name="package_end_date" 
                        value={formData.package_end_date} 
                        onChange={handleChange} 
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium" 
                      />
                    </div>
                  </div>

                  {packageServices.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-red-100">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Service Allocations</label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {packageServices.map((svc, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-100">
                            <span className="text-xs font-medium text-slate-700 truncate flex-1">{svc.service_name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max={svc.total_count}
                                className="w-12 px-1 py-0.5 text-center border border-slate-200 rounded-lg text-xs font-bold"
                                value={svc.remaining}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(svc.total_count, parseInt(e.target.value) || 0));
                                  const next = [...packageServices];
                                  next[idx].remaining = val;
                                  setPackageServices(next);
                                }}
                              />
                              <span className="text-[10px] text-slate-400 font-bold">/ {svc.total_count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={submitting} 
              className="w-full py-3 px-4 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-red-200 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Client Dossier'}
            </button>
          </form>
        </div>

        {/* Right List Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Search walk-in records by client, vehicle plate or phone..." 
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200/90 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50/60 focus:bg-white transition-all font-medium" 
                />
              </div>
              <button 
                type="submit" 
                className="px-5 py-2 bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
              >
                Search
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Vehicle</th>
                    <th className="py-4 px-6">Package</th>
                    <th className="py-4 px-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" /></td></tr>
                  ) : registrations.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-xs">No recent walk-in intake registrations found.</td></tr>
                  ) : (
                    registrations.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{reg.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <Phone className="w-3 h-3 text-slate-400"/> {reg.mobile}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {reg.brand ? (
                            <VehicleBrandBadge
                              brand={reg.brand}
                              model={reg.model}
                              regNo={reg.registration_no}
                              size="sm"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 italic">No vehicle recorded</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {reg.package_id ? (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 text-[#b71c1c] border border-red-100">
                                {reg.package_name}
                              </span>
                              {reg.status && <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{reg.status}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Service only</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right text-slate-600 text-xs font-semibold whitespace-nowrap">
                          {new Date(reg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
