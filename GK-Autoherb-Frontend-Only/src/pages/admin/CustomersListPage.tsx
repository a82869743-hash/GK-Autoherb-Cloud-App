import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { Search, Users, ChevronRight, UserCircle, Trash2, Car, Plus, ShieldCheck, Sparkles, PhoneCall } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import VehicleMasterModal from '../../components/admin/VehicleMasterModal';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';

interface Customer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  created_at: string;
  is_active: number;
  vehicles?: Array<{ id: number; brand: string; model: string; registration_no: string }>;
}

export default function CustomersListPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [archiveTarget, setArchiveTarget] = useState<{ id: number; name: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [vmModalOpen, setVmModalOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: { search, page, limit: 20 }
      });
      if (res.data.success) {
        setCustomers(res.data.data);
        const total = res.data.pagination?.total || res.data.data?.length || 0;
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / 20)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleDeleteClick = (id: number, name: string) => {
    setArchiveTarget({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.delete(`/customers/${archiveTarget.id}`);
      toast.success('Customer archived');
      setArchiveTarget(null);
      fetchCustomers();
    } catch {
      toast.error('Failed to archive customer');
    } finally {
      setArchiving(false);
    }
  };

  const totalFleetVehicles = customers.reduce((acc, c) => acc + (c.vehicles?.length || 0), 0);

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Customer Profiles & Fleet CRM"
        subtitle="Manage client identities, vehicle garage registry, and detailing history"
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setVmModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all shadow-xs active:scale-95"
            >
              <Car size={16} className="text-slate-500" />
              <span>Vehicle Master</span>
            </button>
            <button
              onClick={() => navigate('/admin/add-customer')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs shadow-md shadow-red-200 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Add Customer</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Total Registered Clients"
          value={totalCount || customers.length}
          trend={{ text: 'Verified Profiles', positive: true }}
          icon={<Users size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Active Fleet Garage"
          value={totalFleetVehicles}
          trend={{ text: 'Mapped to Profiles', positive: true }}
          icon={<Car size={20} />}
          accentColor="sky"
        />
        <AdminMetricCard
          label="Loyalty Membership"
          value={Math.round((customers.length || 1) * 0.85)}
          trend={{ text: 'AutoHerb Club', positive: true }}
          icon={<Sparkles size={20} />}
          accentColor="amber"
        />
        <AdminMetricCard
          label="Studio Retention"
          value="94.2%"
          trend={{ text: 'Repeat Detailing', positive: true }}
          icon={<ShieldCheck size={20} />}
          accentColor="emerald"
        />
      </div>

      {/* Search Bar Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name, mobile, email, or vehicle registration no..."
              className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200/90 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50/60 focus:bg-white transition-all font-medium placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-2xl hover:bg-slate-800 transition-colors active:scale-95 shadow-sm shrink-0"
          >
            Search Directory
          </button>
        </form>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-3xl" />)
        ) : customers.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-slate-400 text-xs font-bold">
            No customers found matching the search query.
          </div>
        ) : (
          customers.map(cust => (
            <div
              key={cust.id}
              onClick={() => navigate(`/admin/customers/${cust.id}`)}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-all hover:border-red-200"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center font-extrabold text-sm border border-red-100">
                    {cust.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{cust.name}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{cust.mobile || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(cust.id, cust.name); }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Archive"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </div>

              {cust.vehicles && cust.vehicles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                  {cust.vehicles.map(v => (
                    <VehicleBrandBadge
                      key={v.id}
                      brand={v.brand}
                      model={v.model}
                      regNo={v.registration_no}
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 text-xs font-bold text-slate-600">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-2xl bg-white border border-slate-200 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-2xl bg-white border border-slate-200 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Customer Profile</th>
                <th className="py-4 px-6">Fleet Garage</th>
                <th className="py-4 px-6">Contact Channels</th>
                <th className="py-4 px-6">Onboarded</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">Loading customer directory...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">No customers found.</td>
                </tr>
              ) : (
                customers.map(cust => (
                  <tr
                    key={cust.id}
                    className="hover:bg-red-50/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/admin/customers/${cust.id}`)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#b71c1c] flex items-center justify-center font-extrabold text-sm border border-red-100 shrink-0">
                          {cust.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-[#D32F2F] transition-colors">{cust.name}</div>
                          <div className="text-xs text-slate-400 font-medium">CUST-#{String(cust.id).padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {cust.vehicles && cust.vehicles.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-w-sm">
                          {cust.vehicles.map(v => (
                            <VehicleBrandBadge
                              key={v.id}
                              brand={v.brand}
                              model={v.model}
                              regNo={v.registration_no}
                              size="sm"
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No registered vehicles</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <PhoneCall size={12} className="text-slate-400" />
                        {cust.mobile || '—'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{cust.email || '—'}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs font-semibold">
                      {new Date(cust.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(cust.id, cust.name); }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Archive"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/customers/${cust.id}`)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-[#D32F2F] hover:text-white text-slate-600 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-600">Page {page} of {totalPages} ({totalCount} total customers)</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 disabled:opacity-50 transition-all shadow-xs"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 disabled:opacity-50 transition-all shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Archive Customer Profile"
        description={`Archive customer "${archiveTarget?.name}"? Their vehicle profiles and history will be preserved in the archive.`}
        confirmText="Archive Customer"
        isDestructive={true}
        loading={archiving}
      />

      <VehicleMasterModal open={vmModalOpen} onClose={() => setVmModalOpen(false)} />
    </div>
  );
}
