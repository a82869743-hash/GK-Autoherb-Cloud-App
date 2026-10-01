import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Clock, Car, Phone, User, FileText,
  ChevronLeft, ChevronRight, Loader2, X, Eye, History, Plus, Download
} from 'lucide-react';
import { useBookings, useVehicleHistory, useCreateManualBooking } from '../../api/hooks/useBookings';
import { useServices } from '../../api/hooks/useServices';
import AdminTopBar from '../../components/layout/AdminTopBar';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { formatTime } from '../../utils/formatters';
import api from '../../api/axiosInstance';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';

const TABS = [
  { key: 'pending_approval', label: 'Pending Approvals', color: 'bg-yellow-500' },
  { key: 'confirmed', label: 'Confirmed', color: 'bg-green-500' },
  { key: 'all', label: 'All', color: 'bg-gray-500' },
  { key: 'completed', label: 'Completed', color: 'bg-[#D32F2F]' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

export default function CustomerBookingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending_approval');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [historyRegNo, setHistoryRegNo] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: historyData, isLoading: historyLoading } = useVehicleHistory(historyRegNo);

  // Confirmation Modals
  const [confirmType, setConfirmType] = useState<'approve' | 'reject' | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Manual booking states
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);

  const [manualForm, setManualForm] = useState({
    customer_id: '',
    vehicle_id: '',
    slot_id: '',
    service_id: '',
    notes: '',
    booking_notes: ''
  });

  const { data: servicesRes } = useServices();
  const createManualBooking = useCreateManualBooking();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = useBookings({
    page,
    limit,
    status: activeTab !== 'all' ? activeTab : undefined,
    search: searchDebounced || undefined,
  });

  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000', {
      auth: { token }
    });

    socket.on('new_booking', () => {
      refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, refetch]);

  const bookings = data?.data || [];
  const pagination = data?.pagination || { page: 1, total: 0, limit };
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const openVehicleHistory = (regNo: string) => {
    setHistoryRegNo(regNo);
    setHistoryOpen(true);
  };

  const handleAction = async () => {
    if (!confirmTargetId || !confirmType) return;
    setIsConfirming(true);
    try {
      await api.patch(`/bookings/${confirmTargetId}/${confirmType}`);
      toast.success(`Booking ${confirmType}d successfully`);
      setConfirmType(null);
      setConfirmTargetId(null);
      refetch();
    } catch (err) {
      toast.error(`Failed to ${confirmType} booking`);
    } finally {
      setIsConfirming(false);
    }
  };

  // Fetch customers for manual booking modal
  useEffect(() => {
    if (manualBookingOpen) {
      api.get('/customers?limit=250').then((res) => {
        setCustomersList(res.data.data || []);
      }).catch(() => {});
    }
  }, [manualBookingOpen]);

  // Fetch customer vehicles when customer selection changes
  useEffect(() => {
    if (manualForm.customer_id) {
      api.get(`/vehicles/by-customer/${manualForm.customer_id}`).then((res) => {
        setCustomerVehicles(res.data.data || []);
        // Auto-select first vehicle if available
        const vehicles = res.data.data || [];
        if (vehicles.length > 0) {
          setManualForm(prev => ({ ...prev, vehicle_id: String(vehicles[0].id) }));
        } else {
          setManualForm(prev => ({ ...prev, vehicle_id: '' }));
        }
      }).catch(() => {
        setCustomerVehicles([]);
      });
    } else {
      setCustomerVehicles([]);
    }
  }, [manualForm.customer_id]);

  // Fetch slots for selected date
  useEffect(() => {
    if (manualBookingOpen) {
      api.get(`/slots?date=${selectedDate}`).then((res) => {
        setAvailableSlots(res.data.data || []);
      }).catch(() => {
        setAvailableSlots([]);
      });
    }
  }, [selectedDate, manualBookingOpen]);

  const handleCreateManualBookingSubmit = () => {
    if (!manualForm.customer_id) { toast.error('Select a customer'); return; }
    if (!manualForm.slot_id) { toast.error('Select a slot'); return; }
    if (!manualForm.service_id) { toast.error('Select a service'); return; }

    const selectedCust = customersList.find(c => String(c.id) === manualForm.customer_id);
    const selectedVeh = customerVehicles.find(v => String(v.id) === manualForm.vehicle_id);

    createManualBooking.mutate({
      customer_id: parseInt(manualForm.customer_id),
      slot_id: parseInt(manualForm.slot_id),
      service_id: parseInt(manualForm.service_id),
      vehicle_id: manualForm.vehicle_id ? parseInt(manualForm.vehicle_id) : undefined,
      vehicle_brand: selectedVeh?.brand || undefined,
      vehicle_model: selectedVeh?.model || undefined,
      vehicle_reg_no: selectedVeh?.registration_no || undefined,
      vehicle_category: selectedVeh?.category || undefined,
      notes: manualForm.notes || undefined,
      booking_notes: manualForm.booking_notes || undefined,
    }, {
      onSuccess: (res: any) => {
        toast.success('Manual booking created and confirmed successfully!');
        setManualBookingOpen(false);
        setManualForm({
          customer_id: '',
          vehicle_id: '',
          slot_id: '',
          service_id: '',
          notes: '',
          booking_notes: ''
        });
        setSearchCustomerQuery('');
        refetch();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to create manual booking');
      }
    });
  };

  const handleCreateJobCart = (booking: any) => {
    navigate('/admin/job-carts/new', {
      state: {
        prefill: {
          id: booking.id,
          customer_name: booking.customer_name,
          customer_mobile: booking.customer_mobile,
          customer_email: booking.customer_email,
          car_brand: booking.vehicle_brand,
          car_model: booking.vehicle_model,
          vehicle_reg_no: booking.vehicle_reg_no,
          service_name: booking.service_name || booking.package_name,
          notes: booking.notes || '',
        },
      },
    });
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      <AdminHeaderBar
        title="Customer Bookings"
        subtitle="Manage incoming customer slot appointments & convert to Job Cards"
      >
        <button
          onClick={() => setManualBookingOpen(true)}
          className="px-4 py-2.5 bg-[#D32F2F] hover:bg-[#3730A3] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-95"
        >
          <Plus size={15} />
          <span>+ New Manual Booking</span>
        </button>
      </AdminHeaderBar>

      {/* ─── Top 4 KPI Metrics ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <AdminMetricCard
          label="Pending Approvals"
          value={bookings.filter((b: any) => b.status === 'pending_approval').length || 0}
          icon={<Clock size={18} />}
          trend="Awaiting Action"
          variant="amber"
        />
        <AdminMetricCard
          label="Confirmed Appointments"
          value={bookings.filter((b: any) => b.status === 'confirmed').length || 0}
          icon={<Calendar size={18} />}
          trend="Slots Reserved"
          variant="red"
        />
        <AdminMetricCard
          label="Completed Today"
          value={bookings.filter((b: any) => b.status === 'completed').length || 0}
          icon={<Car size={18} />}
          trend="Services Done"
          variant="emerald"
        />
        <AdminMetricCard
          label="Total Bookings"
          value={pagination.total || 0}
          icon={<FileText size={18} />}
          trend="Lifetime Intake"
          variant="red"
        />
      </div>

      {/* Tabs + Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/70 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto max-w-full w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold tracking-tight transition-all shrink-0 ${
                activeTab === tab.key
                  ? 'bg-[#D32F2F] text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, mobile, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-widest">
          {pagination.total} Booking{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16">
          <Calendar size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-[#1c1b1b]">No Bookings Found</h3>
          <p className="text-sm text-[#5f5e5e] mt-1">
            {activeTab === 'confirmed' ? 'No confirmed bookings waiting to be processed' : 'No bookings match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Customer + Vehicle Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3.5 mb-3">
                    {/* Brand Badge & Avatar */}
                    <VehicleBrandBadge brand={b.vehicle_brand} size="md" />
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-900 text-sm tracking-tight truncate">{b.customer_name}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <a
                          href={`tel:${b.customer_mobile}`}
                          className="flex items-center gap-1 text-[#D32F2F] hover:underline font-bold"
                        >
                          <Phone size={11} />
                          {b.customer_mobile}
                        </a>
                        {b.customer_email && (
                          <span className="hidden sm:inline truncate">{b.customer_email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    {/* Vehicle */}
                    <div className="flex items-start gap-2">
                      <Car size={14} className="text-[#D32F2F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicle</p>
                        <p className="text-xs font-black text-slate-900">
                          {b.vehicle_brand || '—'} {b.vehicle_model || ''}
                        </p>
                        {b.vehicle_reg_no && (
                          <button
                            onClick={() => openVehicleHistory(b.vehicle_reg_no)}
                            className="text-[10px] font-bold text-[#D32F2F] hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            <History size={9} />
                            {b.vehicle_reg_no}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Service / Services Cart Details */}
                    <div className="flex items-start gap-2">
                      <FileText size={14} className="text-[#D32F2F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Services Cart</p>
                        {b.cart_items_json ? (
                          <div className="space-y-1 mt-0.5">
                            {(() => {
                              try {
                                const items = JSON.parse(b.cart_items_json);
                                return items.map((it: any, i: number) => (
                                  <div key={i} className="text-[11px] font-extrabold text-[#1c1b1b] flex items-center gap-1">
                                    <span>• {it.name}</span>
                                    {it.is_wash && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded">Wash</span>}
                                  </div>
                                ));
                              } catch {
                                return <p className="text-xs font-bold text-[#1c1b1b]">{b.service_name || b.package_name || '—'}</p>;
                              }
                            })()}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-[#1c1b1b] truncate">
                            {b.service_name || b.package_name || '—'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-2">
                      <Calendar size={14} className="text-[#D32F2F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Date</p>
                        <p className="text-xs font-bold text-[#1c1b1b]">
                          {b.slot_date
                            ? new Date(b.slot_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-start gap-2">
                      <Clock size={14} className="text-[#D32F2F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Time</p>
                        <p className="text-xs font-bold text-[#1c1b1b]">
                          {b.start_time ? `${formatTime(b.start_time)} – ${formatTime(b.end_time)}` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Status + Actions */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                    b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    b.status === 'completed' ? 'bg-red-50 text-[#b71c1c] border-red-200' :
                    b.status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {b.status.replace('_', ' ')}
                  </span>

                  {b.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setConfirmType('reject');
                          setConfirmTargetId(b.id);
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-xs font-bold transition-all"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setConfirmType('approve');
                          setConfirmTargetId(b.id);
                        }}
                        className="px-4 py-1.5 bg-[#D32F2F] hover:bg-[#3730A3] text-white rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-95"
                      >
                        Approve
                      </button>
                    </div>
                  )}

                  {b.status === 'confirmed' && !b.job_cart_id && (
                    <button
                      onClick={() => handleCreateJobCart(b)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                    >
                      <FileText size={13} />
                      <span>+ Create Job Card</span>
                    </button>
                  )}

                  {b.job_cart_id && (
                    <button
                      onClick={() => navigate(`/admin/job-carts/${b.job_cart_id}`)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#D32F2F] hover:underline"
                    >
                      <Eye size={12} />
                      <span>View Job Card #{b.job_cart_id}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 items-center w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Payment:</span>
                {b.booking_type === 'package' ? (
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                    📦 Package Credit ({b.package_name || 'Active Package'})
                  </span>
                ) : b.is_free_wash ? (
                  <span className="text-xs font-bold text-[#b71c1c] bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                    🎁 Free Wash (Loyalty)
                  </span>
                ) : b.advance_payment_id ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                      💰 Advance Paid: ₹{b.advance_amount || 0}
                    </span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                      💵 Studio Due: ₹{(b.total_amount || 0) - (b.advance_amount || 0)} (Total: ₹{b.total_amount || 0})
                    </span>
                    <button
                      onClick={() => {
                        const token = useAuthStore.getState().token;
                        window.open(`/api/payments/${b.advance_payment_id}/invoice?token=${token}`, '_blank');
                      }}
                      className="text-[#D32F2F] hover:text-[#991b1b] font-bold text-xs inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                      title="Download Payment Receipt"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Receipt
                    </button>
                  </div>
                ) : b.advance_amount > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 rounded-lg">
                      ⏳ Advance Pending: ₹{b.advance_amount || 0}
                    </span>
                    <span className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-lg">
                      💵 Total Bill: ₹{b.total_amount || 0}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-lg">
                    💵 Pay at Studio: ₹{b.total_amount || 0}
                  </span>
                )}
                
                <button
                  onClick={() => {
                    const token = useAuthStore.getState().token;
                    window.open(`/api/bookings/${b.id}/invoice?token=${token}`, '_blank');
                  }}
                  className="ml-auto text-[#D32F2F] hover:text-[#991b1b] font-bold text-xs inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                  title="Download Booking Invoice"
                >
                  <Download className="w-3.5 h-3.5" />
                  Booking Invoice
                </button>
              </div>

              {/* Notes */}
              {b.notes && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-[#5f5e5e]">
                    <span className="font-bold">Notes:</span> {b.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 pb-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-[#1c1b1b]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Vehicle History Modal */}
      <Modal
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistoryRegNo(''); }}
        title={`Vehicle History — ${historyRegNo}`}
        size="lg"
      >
        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#D32F2F]" />
          </div>
        ) : !historyData?.found ? (
          <div className="text-center py-12">
            <Car size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[#5f5e5e]">No records found for this vehicle</p>
          </div>
        ) : (
          <div>
            {/* Vehicle + Customer Summary */}
            <div className="bg-[#f6f3f2] rounded-xl p-4 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Vehicle</p>
                  <p className="font-bold text-[#1c1b1b]">{historyData.vehicle?.brand} {historyData.vehicle?.model}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Reg. No</p>
                  <p className="font-bold text-[#1c1b1b]">{historyData.vehicle?.registration_no}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Customer</p>
                  <p className="font-bold text-[#1c1b1b]">{historyData.customer?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Mobile</p>
                  <p className="font-bold text-[#1c1b1b]">{historyData.customer?.mobile}</p>
                </div>
              </div>
            </div>

            {/* Job Cart History */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-3">
              Service History ({historyData.history?.length || 0} visits)
            </p>

            {historyData.history?.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {historyData.history.map((jc: any) => (
                  <div
                    key={jc.id}
                    className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors cursor-pointer"
                    onClick={() => { setHistoryOpen(false); navigate(`/admin/job-carts/${jc.id}`); }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#D32F2F]">Visit #{jc.visit_number}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          jc.status === 'complete' ? 'bg-green-100 text-green-700' :
                          jc.status === 'open' ? 'bg-red-100 text-[#b71c1c]' :
                          'bg-gray-100 text-gray-600'
                        }`}>{jc.status}</span>
                      </div>
                      <span className="text-xs text-[#5f5e5e]">
                        {new Date(jc.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {jc.services_done && (
                      <p className="text-xs text-[#1c1b1b] font-medium">{jc.services_done}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs text-[#5f5e5e]">
                      {jc.invoice_number && <span>Invoice: {jc.invoice_number}</span>}
                      {jc.total_amount > 0 && (
                        <span className="font-bold text-[#1c1b1b]">₹{Number(jc.total_amount).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <p className="text-sm text-[#5f5e5e]">No previous service records</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Manual Booking Modal */}
      <Modal
        open={manualBookingOpen}
        onClose={() => {
          setManualBookingOpen(false);
          setManualForm({
            customer_id: '',
            vehicle_id: '',
            slot_id: '',
            service_id: '',
            notes: '',
            booking_notes: ''
          });
          setSearchCustomerQuery('');
        }}
        title="Create Manual Booking"
        size="md"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Step 1: Customer Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">
              Select Customer
            </label>
            {!manualForm.customer_id ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, mobile, or vehicle reg no..."
                    value={searchCustomerQuery}
                    onChange={(e) => setSearchCustomerQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all"
                  />
                  {searchCustomerQuery && (
                    <button onClick={() => setSearchCustomerQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {searchCustomerQuery.trim().length > 0 && (
                  <div className="border border-gray-100 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50 bg-white">
                    {customersList
                      .filter(c => {
                        const q = searchCustomerQuery.toLowerCase().trim();
                        const nameMatch = c.name?.toLowerCase().includes(q);
                        const mobileMatch = c.mobile?.includes(q);
                        const regMatch = c.vehicles?.some((v: any) => v.registration_no?.toLowerCase().includes(q));
                        return nameMatch || mobileMatch || regMatch;
                      })
                      .slice(0, 7)
                      .map(c => {
                        const q = searchCustomerQuery.toLowerCase().trim();
                        const matchedVeh = c.vehicles?.find((v: any) => v.registration_no?.toLowerCase().includes(q));

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setManualForm(prev => ({ ...prev, customer_id: String(c.id) }));
                              setSearchCustomerQuery('');
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-[#1c1b1b] flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="font-bold">{c.name}</p>
                              <p className="text-xs text-[#5f5e5e]">{c.mobile}</p>
                              {matchedVeh && (
                                <p className="text-[10px] text-[#D32F2F] font-bold mt-0.5">
                                  🚗 Matched Reg: {matchedVeh.registration_no} ({matchedVeh.brand} {matchedVeh.model})
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-black text-[#5f5e5e] uppercase">Select</span>
                          </button>
                        );
                      })}
                    {customersList.filter(c => {
                      const q = searchCustomerQuery.toLowerCase().trim();
                      return (
                        c.name?.toLowerCase().includes(q) ||
                        c.mobile?.includes(q) ||
                        c.vehicles?.some((v: any) => v.registration_no?.toLowerCase().includes(q))
                      );
                    }).length === 0 && (
                      <p className="text-xs text-[#5f5e5e] p-3 text-center">No customers or vehicles found matching search.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                <div>
                  <p className="text-sm font-bold text-green-900">
                    {customersList.find(c => String(c.id) === manualForm.customer_id)?.name}
                  </p>
                  <p className="text-xs text-green-700">
                    {customersList.find(c => String(c.id) === manualForm.customer_id)?.mobile}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManualForm(prev => ({ ...prev, customer_id: '', vehicle_id: '' }))}
                  className="text-xs font-black text-[#D32F2F] hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Vehicle Selection */}
          {manualForm.customer_id && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">
                Select Vehicle
              </label>
              {customerVehicles.length > 0 ? (
                <select
                  value={manualForm.vehicle_id}
                  onChange={(e) => setManualForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all animate-fadeIn"
                >
                  {customerVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.registration_no})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 font-medium">
                  No vehicles registered for this customer. Go to Customers page to add a vehicle, or proceed with manual details.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Date & Slot */}
          {manualForm.customer_id && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setManualForm(prev => ({ ...prev, slot_id: '' }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">
                  Select Slot
                </label>
                <select
                  value={manualForm.slot_id}
                  onChange={(e) => setManualForm(prev => ({ ...prev, slot_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all"
                >
                  <option value="">-- Choose Slot --</option>
                  {availableSlots
                    .filter(s => !s.is_blocked)
                    .map(s => (
                      <option key={s.id} value={s.id} disabled={s.booked_count >= s.max_capacity}>
                        {formatTime(s.start_time)} - {formatTime(s.end_time)} ({s.booked_count}/{s.max_capacity} booked)
                      </option>
                    ))}
                </select>
                {availableSlots.filter(s => !s.is_blocked).length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1 font-bold">No slots generated or available on this day</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Service selection */}
          {manualForm.customer_id && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">
                Select Service
              </label>
              <select
                value={manualForm.service_id}
                onChange={(e) => setManualForm(prev => ({ ...prev, service_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all"
              >
                <option value="">-- Choose Service --</option>
                {(servicesRes?.data || [])
                  .filter((s: any) => s.is_active !== 0)
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Duration: {s.duration_minutes}m)
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Step 5: Notes & Booking Notes */}
          {manualForm.customer_id && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">
                  Customer Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={manualForm.notes}
                  onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Customer requests extra interior cleaning..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">
                  Admin Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={manualForm.booking_notes}
                  onChange={(e) => setManualForm(prev => ({ ...prev, booking_notes: e.target.value }))}
                  placeholder="e.g. Confirmed on phone with customer..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="secondary"
            onClick={() => {
              setManualBookingOpen(false);
              setManualForm({
                customer_id: '',
                vehicle_id: '',
                slot_id: '',
                service_id: '',
                notes: '',
                booking_notes: ''
              });
              setSearchCustomerQuery('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateManualBookingSubmit}
            loading={createManualBooking.isPending}
            disabled={!manualForm.customer_id || !manualForm.slot_id || !manualForm.service_id}
          >
            Create & Confirm
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmType !== null}
        onClose={() => { setConfirmType(null); setConfirmTargetId(null); }}
        onConfirm={handleAction}
        title={confirmType === 'approve' ? 'Approve Booking' : 'Reject Booking'}
        description={confirmType === 'approve' ? 'Are you sure you want to approve this booking?' : 'Are you sure you want to reject this booking?'}
        confirmText={confirmType === 'approve' ? 'Approve' : 'Reject'}
        isDestructive={confirmType === 'reject'}
        loading={isConfirming}
      />
    </div>
  );
}
