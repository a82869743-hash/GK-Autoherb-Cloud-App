import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { UserCircle, Car, ArrowLeft, Loader2, Send, History, Calendar, ClipboardList, Package, Clock, RefreshCw, Download, Plus, Trash2, Phone, Mail, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PackageRenewModal from '../../components/shared/PackageRenewModal';
import { useAuthStore } from '../../store/authStore';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [packageHistory, setPackageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Assign package state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  const [packageServices, setPackageServices] = useState<any[]>([]);
  const [durationMonths, setDurationMonths] = useState('12');
  const [assigning, setAssigning] = useState(false);

  // Package renewal states
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewTargetPackage, setRenewTargetPackage] = useState<any>(null);
  const [renewalsHistory, setRenewalsHistory] = useState<any[]>([]);

  // Adjust credits states
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustService, setAdjustService] = useState('');
  const [adjustNewCount, setAdjustNewCount] = useState(0);
  const [adjustTotalCount, setAdjustTotalCount] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const handleAdjustCreditsSubmit = async () => {
    if (!adjustService) {
      alert('Please select a service.');
      return;
    }
    setAdjusting(true);
    try {
      const res = await api.patch(`/user-packages/${activePackage.id}/adjust-credits`, {
        service_name: adjustService,
        new_used_count: Number(adjustNewCount)
      });
      if (res.data.success) {
        alert('Credits adjusted successfully!');
        setAdjustModalOpen(false);
        setAdjustService('');
        setAdjustNewCount(0);
        fetchDetail();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to adjust credits');
    } finally {
      setAdjusting(false);
    }
  };

  // Custom package states
  const [customAssignModalOpen, setCustomAssignModalOpen] = useState(false);
  const [customPackageName, setCustomPackageName] = useState('');
  const [customPricePaid, setCustomPricePaid] = useState('');
  const [customDurationMonths, setCustomDurationMonths] = useState('12');
  const [customVehicleId, setCustomVehicleId] = useState('');
  const [customServices, setCustomServices] = useState<{ service_id: number; total_count: number }[]>([]);
  const [allServicesList, setAllServicesList] = useState<any[]>([]);
  const [customAssigning, setCustomAssigning] = useState(false);

  useEffect(() => {
    if (customAssignModalOpen) {
      api.get('/services').then(res => {
        if (res.data.success) {
          setAllServicesList(res.data.data);
        }
      }).catch(console.error);
    }
  }, [customAssignModalOpen]);

  const handleCustomAssignSubmit = async () => {
    if (!customPackageName || !customVehicleId || !customServices.length) {
      alert('Please fill in name, select a vehicle, and add at least one service.');
      return;
    }
    setCustomAssigning(true);
    try {
      const res = await api.post('/packages/custom-assign', {
        user_id: Number(id),
        vehicle_id: Number(customVehicleId),
        name: customPackageName,
        price_paid: Number(customPricePaid) || 0,
        duration_months: Number(customDurationMonths) || 12,
        services: customServices
      });
      if (res.data.success) {
        alert('Custom package assigned successfully!');
        setCustomAssignModalOpen(false);
        setCustomPackageName('');
        setCustomPricePaid('');
        setCustomDurationMonths('12');
        setCustomVehicleId('');
        setCustomServices([]);
        fetchDetail();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to assign custom package');
    } finally {
      setCustomAssigning(false);
    }
  };

  const handleExportPackageHistory = async (format: 'pdf' | 'xlsx') => {
    try {
      const res = await api.get(`/customers/${id}/package-history/export`, {
        params: { format },
        responseType: 'blob'
      });
      const file = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileURL = URL.createObjectURL(file);
      const fileLink = document.createElement('a');
      fileLink.href = fileURL;
      fileLink.setAttribute('download', `PackageHistory_${data?.name?.replace(/\s+/g, '_') || 'Customer'}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(fileLink);
      fileLink.click();
      document.body.removeChild(fileLink);
      URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error(err);
      alert('Failed to export package history');
    }
  };

  // Fetch all packages when modal opens
  useEffect(() => {
    if (assignModalOpen) {
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
      fetchPackages();
    }
  }, [assignModalOpen]);

  // Fetch services when selected package changes
  useEffect(() => {
    if (!selectedPackageId) {
      setPackageServices([]);
      return;
    }
    const loadServices = async () => {
      try {
        const res = await api.get(`/packages/${selectedPackageId}/services`);
        if (res.data.success) {
          const mapped = res.data.data.map((s: any) => ({
            service_name: s.name,
            total_count: s.total_count || 1,
            paid: s.paid || 0,
            complimentary: s.complimentary || 0,
            remaining: s.total_count || 1
          }));
          setPackageServices(mapped);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadServices();
  }, [selectedPackageId]);

  // Auto-fill price based on package and selected vehicle category
  useEffect(() => {
    if (!selectedPackageId || !selectedVehicleId) return;
    const pkg = packages.find(p => p.id.toString() === selectedPackageId);
    const vehicle = data?.vehicles?.find((v: any) => v.id.toString() === selectedVehicleId);
    if (pkg && vehicle) {
      const cat = vehicle.category || 'sedan';
      let priceKey = 'price_sedan';
      if (cat === 'hatchback') priceKey = 'price_hatchback';
      else if (cat === 'medium_hatchback') priceKey = 'price_medium_hatchback';
      else if (cat === 'premium_sedan') priceKey = 'price_premium_sedan';
      else if (cat === 'suv') priceKey = 'price_suv';
      
      setPricePaid(pkg[priceKey] || pkg.price_sedan || '0');
    }
  }, [selectedPackageId, selectedVehicleId, packages, data]);

  const handleAssignPackageSubmit = async () => {
    if (!selectedPackageId || !selectedVehicleId) {
      alert('Please select both a package and a vehicle.');
      return;
    }
    setAssigning(true);
    try {
      const vehicle = data.vehicles.find((v: any) => v.id.toString() === selectedVehicleId);
      const payload = {
        user_id: Number(id),
        package_id: Number(selectedPackageId),
        vehicle_id: Number(selectedVehicleId),
        vehicle_segment: vehicle?.category || 'sedan',
        price_paid: Number(pricePaid) || 0,
        duration_months: Number(durationMonths) || 12,
        package_custom_services: packageServices
      };
      const res = await api.post('/packages/assign', payload);
      if (res.data.success) {
        alert('Package assigned successfully!');
        setAssignModalOpen(false);
        setSelectedPackageId('');
        setSelectedVehicleId('');
        setPricePaid('');
        setDurationMonths('12');
        setPackageServices([]);
        fetchDetail();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to assign package');
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const [resCust, resPkg, resPkgHistory, resRenewals] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/user-packages/active?user_id=${id}`).catch(() => ({ data: { success: false, data: null } })),
        api.get(`/user-packages/history?user_id=${id}`).catch(() => ({ data: { success: false, data: [] } })),
        api.get(`/user-packages/renewals?user_id=${id}`).catch(() => ({ data: { success: false, data: [] } })),
      ]);
      if (resCust.data.success) {
        setData(resCust.data.data);
      }
      if (resPkg.data && resPkg.data.success && resPkg.data.data) {
        setActivePackage(resPkg.data.data);
      } else {
        setActivePackage(null);
      }
      // Package history — filter out the active one
      const allPkgs = resPkgHistory.data?.data || [];
      const activePkgId = resPkg.data?.data?.id;
      setPackageHistory(allPkgs.filter((p: any) => p.id !== activePkgId));
      setRenewalsHistory(resRenewals.data?.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load customer details.');
      navigate('/admin/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await api.post(`/customers/${id}/notes`, { note: newNote });
      if (res.data.success) {
        setData((prev: any) => ({
          ...prev,
          notes: [res.data.data, ...prev.notes]
        }));
        setNewNote('');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D32F2F]" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title={data.name}
        subtitle={`Client Dossier • CUST-#${String(data.id).padStart(4, '0')} • Mobile: ${data.mobile || '—'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/admin/customers')}
              className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <ArrowLeft size={15} />
              <span>Back to CRM</span>
            </button>
            <button
              onClick={() => handleExportPackageHistory('pdf')}
              className="px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Download size={14} className="text-slate-500" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExportPackageHistory('xlsx')}
              className="px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Download size={14} className="text-slate-500" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => setCustomAssignModalOpen(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus size={15} />
              <span>Custom Package</span>
            </button>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="px-4 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shadow-md shadow-red-200 active:scale-95"
            >
              <Package size={15} />
              <span>Assign Package</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Registered Vehicles"
          value={data.vehicles?.length || 0}
          trend={{ text: 'Garage Fleet', positive: true }}
          icon={<Car size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Active Subscription"
          value={activePackage ? 'Enrolled' : 'None'}
          trend={{ text: activePackage ? activePackage.package_name : 'No active pack', positive: Boolean(activePackage) }}
          icon={<Sparkles size={20} />}
          accentColor="purple"
        />
        <AdminMetricCard
          label="Activity Notes"
          value={data.notes?.length || 0}
          trend={{ text: 'Logged interactions', positive: true }}
          icon={<ClipboardList size={20} />}
          accentColor="sky"
        />
        <AdminMetricCard
          label="Account Status"
          value="Verified"
          trend={{ text: 'Loyalty active', positive: true }}
          icon={<ShieldCheck size={20} />}
          accentColor="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details, Packages & Vehicles */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 h-24 relative p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-300">Customer Identity</div>
            </div>
            <div className="px-6 pb-6 relative">
              <div className="absolute -top-10 bg-white p-1.5 rounded-2xl shadow-md border border-slate-100">
                <div className="w-14 h-14 rounded-xl bg-red-50 text-[#b71c1c] flex items-center justify-center font-black text-xl">
                  {data.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
              </div>
              <div className="pt-10">
                <h2 className="text-xl font-bold text-slate-900">{data.name}</h2>
                <p className="text-xs text-slate-400 mb-4 font-medium">AutoHerb Dossier #{String(data.id).padStart(4, '0')}</p>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" /> Phone
                    </span>
                    <span className="font-bold text-slate-900 text-xs">{data.mobile || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Mail size={13} className="text-slate-400" /> Email
                    </span>
                    <span className="font-bold text-slate-900 text-xs truncate max-w-[180px]">{data.email || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400" /> Member Since
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {new Date(data.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Package Card */}
          {activePackage ? (
            <div className="rounded-3xl border border-red-100 bg-gradient-to-b from-red-50/40 via-white to-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-[#b71c1c] flex items-center justify-center">
                    <Package size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Active Subscription</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Valid plan benefits</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide">
                  Active
                </span>
              </div>

              <div className="p-4 bg-white border border-red-100 rounded-2xl shadow-xs">
                <div className="font-extrabold text-slate-900 text-base">{activePackage.package_name}</div>
                {activePackage.start_date && activePackage.end_date && (
                  <div className="text-xs text-slate-500 mt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Activated On:</span>
                      <span className="font-semibold text-slate-800">{new Date(activePackage.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid Till:</span>
                      <span className="font-semibold text-slate-800">{new Date(activePackage.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}

                {activePackage.usage && activePackage.usage.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Credits</p>
                    {activePackage.usage.map((u: any) => (
                      <div key={u.service_name} className="flex justify-between items-center text-xs">
                        <span className="text-slate-700 font-medium">{u.service_name}</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${u.remaining > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                          {u.remaining} left
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (activePackage.usage && activePackage.usage.length > 0) {
                        const firstSvc = activePackage.usage[0];
                        setAdjustService(firstSvc.service_name);
                        setAdjustNewCount(firstSvc.used_count);
                        setAdjustTotalCount(firstSvc.total_count);
                      }
                      setAdjustModalOpen(true);
                    }}
                    className="w-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl transition-all"
                  >
                    Adjust Credits
                  </button>
                  <button
                    onClick={() => {
                      setRenewTargetPackage({
                        id: activePackage.id,
                        package_name: activePackage.package_name,
                        customer_name: data.name,
                        customer_id: data.id,
                        package_id: activePackage.package_id,
                        expiry_date: activePackage.end_date,
                        package_status: activePackage.package_status || 'active'
                      });
                      setRenewModalOpen(true);
                    }}
                    className="w-full text-xs font-bold bg-[#D32F2F] hover:bg-[#b71c1c] text-white py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={12} />
                    <span>Renew</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            packageHistory.length > 0 && (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      No Active Package
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Reactivate former package subscription.</p>
                  </div>
                  <button
                    onClick={() => {
                      const mostRecent = packageHistory[0];
                      setRenewTargetPackage({
                        id: mostRecent.id,
                        package_name: mostRecent.package_name,
                        customer_name: data.name,
                        customer_id: data.id,
                        package_id: mostRecent.package_id,
                        expiry_date: mostRecent.end_date,
                        package_status: mostRecent.package_status || 'expired'
                      });
                      setRenewModalOpen(true);
                    }}
                    className="text-xs font-bold bg-[#D32F2F] hover:bg-[#b71c1c] text-white px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} />
                    Reactivate
                  </button>
                </div>
              </div>
            )
          )}

          {/* Registered Vehicles Garage */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Car className="w-4 h-4 text-[#D32F2F]" />
              Garage Fleet ({data.vehicles?.length || 0})
            </h3>
            {data.vehicles.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">No vehicles currently registered.</p>
            ) : (
              <div className="space-y-3">
                {data.vehicles.map((v: any) => (
                  <div key={v.id} className="p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-2xl">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <VehicleBrandBadge
                        brand={v.brand}
                        model={v.model}
                        regNo={v.registration_no}
                        size="md"
                      />
                      {v.is_primary === 1 && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="capitalize">{v.category ? v.category.replace('_', ' ') : 'Standard'}</span>
                      {v.car_year && <span>• Year {v.car_year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: CRM History Notes */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[550px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">CRM Engagement Log & Workshop Notes</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Chronological interaction timeline</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                {data.notes?.length || 0} entries
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {data.notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ClipboardList className="w-12 h-12 mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-medium">No notes recorded yet for this client. Add the first one below.</p>
                </div>
              ) : (
                data.notes.map((note: any) => (
                  <div key={note.id} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-[#D32F2F] shrink-0 border border-red-100">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
                    </div>
                    <div className="flex-1 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 mb-2">
                      <div className="text-[11px] text-slate-400 mb-1.5 font-semibold">
                        {new Date(note.created_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                        {note.note}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Input Bar */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <form onSubmit={handleAddNote} className="flex gap-2.5">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record customer preferences, car details, detailing recommendations, or complaints..."
                  className="flex-1 border border-slate-200/90 rounded-2xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] resize-none h-14 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote(e);
                    }
                  }}
                ></textarea>
                <button
                  type="submit"
                  disabled={!newNote.trim() || submittingNote}
                  className="px-6 rounded-2xl bg-[#D32F2F] text-white font-bold text-xs hover:bg-[#b71c1c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                >
                  {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Log Note</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Renewal History Timeline */}
      {renewalsHistory.length > 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 mt-6">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-slate-900 text-base">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#D32F2F]" />
                <span>Subscription Renewal Records ({renewalsHistory.length})</span>
              </div>
              <span className="text-slate-400 transition-transform group-open:rotate-180">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            
            <div className="mt-5 border-t border-slate-100 pt-5 space-y-3">
              {renewalsHistory.map((ren: any) => (
                <div key={ren.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{ren.package_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Processed By: <span className="capitalize font-semibold text-slate-700">{ren.renewed_by}</span>
                    </p>
                    {ren.notes && (
                      <p className="text-xs text-slate-600 bg-white border border-slate-200/60 rounded-xl p-2 mt-2 italic">
                        {ren.notes}
                      </p>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <span className="text-base font-extrabold text-slate-900">₹{parseFloat(ren.amount_paid).toLocaleString('en-IN')}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(ren.renewal_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Assign Package Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Package to Customer"
        size="md"
      >
        <div className="space-y-4 py-2 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Select Customer Vehicle *</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
            >
              <option value="">Choose a vehicle...</option>
              {data.vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.registration_no || 'No Reg'}) - {v.category ? v.category.toUpperCase() : 'UNKNOWN'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Select Package *</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
            >
              <option value="">Choose a package...</option>
              {packages.map((pkg: any) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Price Paid (₹) *"
            type="number"
            value={pricePaid}
            onChange={(e) => setPricePaid(e.target.value)}
            placeholder="0"
          />

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Duration (Months) *</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
            >
              <option value="1">1 Month</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months (1 Year)</option>
              <option value="24">24 Months (2 Years)</option>
            </select>
          </div>

          {packageServices.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Included Services</p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {packageServices.map((svc: any) => (
                  <div key={svc.service_name} className="flex items-center gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-800 font-bold">
                      {svc.total_count || (svc.paid || 0) + (svc.complimentary || 0) || 1} {svc.service_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <button
              onClick={handleAssignPackageSubmit}
              disabled={assigning}
              className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs rounded-2xl shadow-sm transition-all"
            >
              {assigning ? 'Assigning...' : 'Assign Package'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create & Assign Custom Package Modal */}
      <Modal
        open={customAssignModalOpen}
        onClose={() => setCustomAssignModalOpen(false)}
        title="Create & Assign Custom Package"
        size="md"
      >
        <div className="space-y-4 py-2 font-sans">
          <Input
            label="Custom Package Name *"
            value={customPackageName}
            onChange={(e) => setCustomPackageName(e.target.value)}
            placeholder="e.g. VIP Ceramic Executive Club"
          />

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Select Vehicle *</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
              value={customVehicleId}
              onChange={(e) => setCustomVehicleId(e.target.value)}
            >
              <option value="">Choose a vehicle...</option>
              {data.vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.registration_no || 'No Reg'})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Price Paid (₹) *"
            type="number"
            value={customPricePaid}
            onChange={(e) => setCustomPricePaid(e.target.value)}
            placeholder="0"
          />

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Duration (Months) *</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
              value={customDurationMonths}
              onChange={(e) => setCustomDurationMonths(e.target.value)}
            >
              <option value="1">1 Month</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months (1 Year)</option>
              <option value="24">24 Months (2 Years)</option>
            </select>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Service Entitlements</p>
              <button
                type="button"
                onClick={() => setCustomServices(prev => [...prev, { service_id: 0, total_count: 1 }])}
                className="text-xs text-[#D32F2F] font-bold hover:underline"
              >
                + Add Service
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {customServices.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
                    value={row.service_id}
                    onChange={(e) => {
                      const updated = [...customServices];
                      updated[idx].service_id = Number(e.target.value);
                      setCustomServices(updated);
                    }}
                  >
                    <option value="0">Choose service...</option>
                    {allServicesList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-xl text-center text-xs font-bold"
                    placeholder="Qty"
                    value={row.total_count}
                    onChange={(e) => {
                      const updated = [...customServices];
                      updated[idx].total_count = Math.max(1, parseInt(e.target.value) || 1);
                      setCustomServices(updated);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomServices(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {customServices.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-2 font-medium">No services added yet.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setCustomAssignModalOpen(false)}>Cancel</Button>
            <button
              onClick={handleCustomAssignSubmit}
              disabled={customAssigning}
              className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs rounded-2xl shadow-sm transition-all"
            >
              {customAssigning ? 'Assigning...' : 'Assign Custom Package'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Adjust Credits Modal */}
      {activePackage && (
        <Modal
          open={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          title="Adjust Package Credits"
          size="sm"
        >
          <div className="space-y-4 py-2 font-sans">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Select Service</label>
              <select
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
                value={adjustService}
                onChange={(e) => {
                  setAdjustService(e.target.value);
                  const svc = activePackage.usage.find((u: any) => u.service_name === e.target.value);
                  if (svc) {
                    setAdjustNewCount(svc.used_count);
                    setAdjustTotalCount(svc.total_count);
                  }
                }}
              >
                {activePackage.usage?.map((u: any) => (
                  <option key={u.service_name} value={u.service_name}>
                    {u.service_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Used Count</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={adjustTotalCount}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={adjustNewCount}
                  onChange={(e) => setAdjustNewCount(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="text-sm text-slate-400 font-bold">/ {adjustTotalCount}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Remaining Credits: {Math.max(0, adjustTotalCount - adjustNewCount)}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>Cancel</Button>
              <button
                onClick={handleAdjustCreditsSubmit}
                disabled={adjusting}
                className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs rounded-2xl shadow-sm transition-all"
              >
                {adjusting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Package Renewal Modal */}
      {renewTargetPackage && (
        <PackageRenewModal
          isOpen={renewModalOpen}
          onClose={() => {
            setRenewModalOpen(false);
            setRenewTargetPackage(null);
            fetchDetail();
          }}
          userPackage={renewTargetPackage}
        />
      )}
    </div>
  );
}
