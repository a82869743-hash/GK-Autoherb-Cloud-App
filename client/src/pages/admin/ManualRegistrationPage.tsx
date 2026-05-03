import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { PlusCircle, Search, User, Car, Phone, Mail, Box, Calendar, Loader2, IndianRupee } from 'lucide-react';

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
    price: ''
  });

  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    fetchRegistrations();
    fetchPackages();
  }, []);

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
    setSubmitting(true);
    try {
      const res = await api.post('/customers/manual-registration', formData);
      if (res.data.success) {
        alert('Customer registered successfully!');
        setFormData({
          name: '', mobile: '', email: '', brand: '', model: '',
          category: '', registration_no: '', package_id: '', price: ''
        });
        fetchRegistrations();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to register customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="text-red-600 w-7 h-7" />
          Offline Registration
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manually register walk-in customers, their vehicles, and directly assign packages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-3 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-red-600" />
              New Registration
            </h3>

            {/* Customer Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Customer Details</h4>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required name="name" value={formData.name} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="John Doe" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="9876543210" />
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Vehicle Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                  <input name="brand" value={formData.brand} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500" placeholder="e.g. BMW" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                  <input name="model" value={formData.model} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500" placeholder="e.g. X1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reg No.</label>
                  <input name="registration_no" value={formData.registration_no} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm uppercase focus:bg-white focus:ring-2 focus:ring-red-500" placeholder="MH01AB1234" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500">
                    <option value="">Select...</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="medium_hatchback">Med Hatchback</option>
                    <option value="sedan">Sedan</option>
                    <option value="premium_sedan">Premium Sedan</option>
                    <option value="suv">SUV</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Package Details (Optional)</h4>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Package</label>
                <select name="package_id" value={formData.package_id} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500">
                  <option value="">No Package</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {formData.package_id && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Final Price (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition flex justify-center items-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Customer'}
            </button>
          </form>
        </div>

        {/* Right List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search registrations..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
            </div>
            <button type="submit" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition shadow-sm">Search</button>
          </form>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-4">Customer</th>
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Package</th>
                    <th className="p-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                  ) : registrations.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No recent registrations found.</td></tr>
                  ) : (
                    registrations.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{reg.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3"/> {reg.mobile}</div>
                        </td>
                        <td className="p-4">
                          {reg.brand ? (
                            <>
                              <div className="font-medium text-gray-800">{reg.brand} {reg.model}</div>
                              <div className="text-xs text-gray-500">{reg.registration_no || 'No Reg'}</div>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">No vehicle</span>
                          )}
                        </td>
                        <td className="p-4">
                          {reg.package_id ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                {reg.package_name}
                              </span>
                              {reg.status && <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{reg.status}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-gray-500 text-xs whitespace-nowrap">
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
