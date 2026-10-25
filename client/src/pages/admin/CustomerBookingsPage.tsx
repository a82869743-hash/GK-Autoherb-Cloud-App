import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Clock, Car, Phone, User, FileText,
  ChevronLeft, ChevronRight, Loader2, X, Eye, History, Plus, Download, MessageCircle, Check
} from 'lucide-react';
import { OpsPageTitle, SearchBar, ChipRow, EmptyBlock, Skeleton, StatusPill } from '../../components/ops/ui';
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
import { createSocket } from '../../lib/socket';
import { CancelBookingSheet, RescheduleSheet } from '../../components/customer/BookingActionSheets';
import { useAuthStore } from '../../store/authStore';

const TABS = [
  { key: 'pending_approval', label: 'Needs OK' },
  { key: 'today', label: 'Today' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
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
  const [cancelFor, setCancelFor] = useState<any>(null);
  const [rescheduleFor, setRescheduleFor] = useState<any>(null);
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
    status: activeTab !== 'all' && activeTab !== 'today' ? activeTab : undefined,
    date: activeTab === 'today' ? 'today' : undefined,
    search: searchDebounced || undefined,
  });

  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    const socket = createSocket(token);

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

  const counts: Record<string, number> = (data as any)?.counts || {};
  const REPLY: Record<string, { label: string; cls: string }> = {
    confirmed: { label: '✓ Customer confirmed', cls: 'bg-emerald-50 text-emerald-700' },
    reschedule_requested: { label: '↻ Wants to reschedule', cls: 'bg-amber-50 text-amber-700' },
    declined: { label: '✕ Customer declined', cls: 'bg-red-50 text-red-600' },
  };
  const openInvoice = (path: string) => {
    const t = useAuthStore.getState().token;
    window.open(`${path}?token=${t}`, '_blank');
  };
  const serviceLabel = (b: any) => {
    if (b.cart_items_json) {
      try {
        const items = JSON.parse(b.cart_items_json);
        if (Array.isArray(items) && items.length) return items.map((it: any) => it.name).join(', ');
      } catch {
        /* fall through */
      }
    }
    return b.package_service_name || b.service_name || b.package_name || 'Service';
  };
  const paymentLine = (b: any) => {
    if (b.booking_type === 'package') return { text: `Package credit · ${b.package_name || 'active package'}`, cls: 'text-purple-700' };
    if (b.is_free_wash) return { text: 'Free wash (loyalty)', cls: 'text-[#D32F2F]' };
    if (b.advance_payment_id) return { text: `Advance ₹${b.advance_amount || 0} paid · ₹${(b.total_amount || 0) - (b.advance_amount || 0)} due`, cls: 'text-emerald-700' };
    if (b.advance_amount > 0) return { text: `Advance ₹${b.advance_amount} pending · total ₹${b.total_amount || 0}`, cls: 'text-amber-700' };
    return { text: `Pay at studio · ₹${b.total_amount || 0}`, cls: 'text-slate-600' };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-28 font-sans">
      <OpsPageTitle kicker="Appointments" title="Bookings" subtitle={`${pagination.total} in this list`} />

      <SearchBar value={search} onChange={setSearch} placeholder="Name, mobile or number plate" />
      <ChipRow
        value={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          setPage(1);
        }}
        items={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] }))}
      />

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
      ) : bookings.length === 0 ? (
        <EmptyBlock
          icon={<Calendar size={26} />}
          title={activeTab === 'pending_approval' ? 'Nothing waiting for approval' : activeTab === 'today' ? 'No bookings today' : 'No bookings here'}
          text={search ? 'Try another search.' : undefined}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {bookings.map((b: any) => {
            const pay = paymentLine(b);
            const reply = b.customer_confirmation && ['confirmed', 'pending_approval'].includes(b.status) ? REPLY[b.customer_confirmation] || { label: '⏳ Reminder sent, no reply yet', cls: 'bg-slate-100 text-slate-500' } : null;
            return (
              <div key={b.id} className="app-card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                      <VehicleBrandBadge brand={b.vehicle_brand} model={b.vehicle_model} size="md" showText={false} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-extrabold text-[15.5px] text-slate-900 truncate">{b.customer_name}</p>
                        <StatusPill status={b.status} />
                      </div>
                      <p className="text-[12.5px] text-slate-500 truncate">
                        {[b.vehicle_brand, b.vehicle_model].filter(Boolean).join(' ') || 'Vehicle'}
                        {b.vehicle_reg_no ? ` · ${b.vehicle_reg_no}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Calendar size={11} /> Date</p>
                      <p className="font-display text-[13.5px] font-bold text-slate-900">
                        {b.slot_date ? new Date(`${b.slot_date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Clock size={11} /> Time</p>
                      <p className="font-display text-[13.5px] font-bold text-slate-900">{b.start_time ? `${formatTime(b.start_time)} – ${formatTime(b.end_time)}` : '—'}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-[13px] font-bold text-slate-800 line-clamp-2">{serviceLabel(b)}</p>
                  <p className={`text-[12.5px] font-semibold ${pay.cls}`}>{pay.text}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {reply && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${reply.cls}`}>{reply.label}</span>}
                    {b.cancel_reason && b.status === 'cancelled' && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {b.cancelled_by ? `By ${b.cancelled_by}: ` : ''}{b.cancel_reason}
                      </span>
                    )}
                  </div>
                  {b.notes && <p className="mt-2 text-[12.5px] text-slate-500 line-clamp-2">“{b.notes}”</p>}
                </div>

                {/* Quick contact + documents */}
                <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5">
                  <a href={`tel:${b.customer_mobile}`} className="h-9 w-9 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center" aria-label="Call">
                    <Phone size={15} />
                  </a>
                  <a href={`https://wa.me/91${String(b.customer_mobile || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center" aria-label="WhatsApp">
                    <MessageCircle size={15} />
                  </a>
                  {b.vehicle_reg_no && (
                    <button onClick={() => openVehicleHistory(b.vehicle_reg_no)} className="h-9 px-3 rounded-full bg-slate-100 text-slate-700 text-[12px] font-bold flex items-center gap-1">
                      <History size={13} /> History
                    </button>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {b.advance_payment_id && (
                      <button onClick={() => openInvoice(`/api/payments/${b.advance_payment_id}/invoice`)} className="h-9 px-2.5 rounded-full text-[12px] font-bold text-[#D32F2F] flex items-center gap-1">
                        <Download size={13} /> Receipt
                      </button>
                    )}
                    <button onClick={() => openInvoice(`/api/bookings/${b.id}/invoice`)} className="h-9 px-2.5 rounded-full text-[12px] font-bold text-[#D32F2F] flex items-center gap-1">
                      <Download size={13} /> Invoice
                    </button>
                  </div>
                </div>

                {/* Actions */}
                {(b.status === 'pending_approval' || b.status === 'confirmed' || b.job_cart_id) && (
                  <div className="space-y-2 border-t border-slate-100 p-3">
                    {b.status === 'pending_approval' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setConfirmType('reject'); setConfirmTargetId(b.id); }} className="app-btn h-11 bg-red-50 text-[#D32F2F]">Reject</button>
                        <button onClick={() => { setConfirmType('approve'); setConfirmTargetId(b.id); }} className="app-btn-primary h-11"><Check size={16} /> Approve</button>
                      </div>
                    )}
                    {b.status === 'confirmed' && !b.job_cart_id && (
                      <button onClick={() => handleCreateJobCart(b)} className="app-btn-dark h-11 w-full">
                        <FileText size={16} /> Car arrived — create job card
                      </button>
                    )}
                    {b.job_cart_id && (
                      <button onClick={() => navigate(`/admin/job-carts/${b.job_cart_id}`)} className="app-btn h-11 w-full bg-slate-100 text-slate-800">
                        <Eye size={16} /> Open job card #{b.job_cart_id}
                      </button>
                    )}
                    {['confirmed', 'pending_approval'].includes(b.status) && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setRescheduleFor(b)} className="app-btn h-10 bg-white border border-slate-200 text-slate-800 text-[13px]">Reschedule</button>
                        <button onClick={() => setCancelFor(b)} className="app-btn h-10 bg-white border border-slate-200 text-slate-500 text-[13px]">Cancel booking</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="app-btn-outline h-10 px-3"><ChevronLeft size={16} /> Prev</button>
          <span className="text-[13px] font-semibold text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="app-btn-outline h-10 px-3">Next <ChevronRight size={16} /></button>
        </div>
      )}

      {/* Floating new booking */}
      <button
        onClick={() => setManualBookingOpen(true)}
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 app-btn-primary h-12 px-5 rounded-full shadow-app-lg"
      >
        <Plus size={18} /> New booking
      </button>

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

      <CancelBookingSheet booking={cancelFor} onClose={() => setCancelFor(null)} onDone={() => refetch()} />
      <RescheduleSheet booking={rescheduleFor} onClose={() => setRescheduleFor(null)} onDone={() => refetch()} />
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
