import { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight, CalendarPlus, Car, Sparkles, X, Loader2 } from 'lucide-react';
import AdminTopBar from '../../components/layout/AdminTopBar';
import EmptyState from '../../components/shared/EmptyState';
import Button from '../../components/ui/Button';
import { useBookings, useCancelBooking, useChangeBookingServices } from '../../api/hooks/useBookings';
import { useServices } from '../../api/hooks/useServices';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { formatTime } from '../../utils/formatters';

export default function BookingsPage() {
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useBookings({ page, limit: 20 });
  const cancelMut = useCancelBooking();
  const changeServicesMut = useChangeBookingServices();
  const { data: servicesRes } = useServices({ active_only: true });

  const [changeTargetBooking, setChangeTargetBooking] = useState<any>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  useEffect(() => {
    if (changeTargetBooking) {
      setSelectedServiceIds(changeTargetBooking.service_ids || (changeTargetBooking.service_id ? [changeTargetBooking.service_id] : []));
    } else {
      setSelectedServiceIds([]);
    }
  }, [changeTargetBooking]);

  const bookings = data?.data || [];
  const pagination = data?.pagination;
  const services = servicesRes?.data || [];

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await cancelMut.mutateAsync(id);
      toast('success', 'Booking cancelled');
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleUpdateServices = async () => {
    if (selectedServiceIds.length === 0) {
      toast('error', 'Select at least one service');
      return;
    }
    try {
      await changeServicesMut.mutateAsync({
        id: changeTargetBooking.id,
        service_ids: selectedServiceIds,
      });
      toast('success', 'Booking services updated');
      setChangeTargetBooking(null);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to update services');
    }
  };

  return (
    <>
      <AdminTopBar
        title="My Bookings"
        subtitle="Your upcoming appointments"
        actions={
          <Button icon={<CalendarPlus size={16} />} onClick={() => navigate('/customer/bookings/new')}>
            Book Service
          </Button>
        }
      />

      <div className="max-w-4xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#D32F2F]" />
          </div>
        ) : !bookings.length ? (
          <EmptyState
            icon={Calendar}
            title="No Bookings Yet"
            description="You don't have any service appointments. Book one now!"
            actionLabel="Book Now"
            onAction={() => navigate('/customer/bookings/new')}
          />
        ) : (
          <>
            <div className="grid gap-4">
              {bookings.map((b: any, idx: number) => {
                const dateObj = b.slot_date ? new Date(b.slot_date) : null;
                const isPast = dateObj ? dateObj < new Date(new Date().toISOString().split('T')[0]) : false;

                // Calculate if can change service (must be >= 24h away)
                let canChange = false;
                let hoursRemaining = 0;
                if (dateObj && b.start_time && !isPast) {
                  const slotDateStr = dateObj.toISOString().split('T')[0];
                  const slotDateTime = new Date(`${slotDateStr}T${b.start_time}`);
                  const now = new Date();
                  const diffMs = slotDateTime.getTime() - now.getTime();
                  hoursRemaining = diffMs / (1000 * 60 * 60);
                  canChange = hoursRemaining >= 24;
                }

                return (
                  <div
                    key={b.id}
                    className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group card-premium opacity-0 animate-fade-in-up ${
                      b.status === 'cancelled' ? 'border-red-100 bg-red-50/20' : 'border-gray-100'
                    }`}
                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-shadow ${
                        b.status === 'cancelled'
                          ? 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400'
                          : 'bg-gradient-to-br from-red-50 to-red-100 text-[#D32F2F] group-hover:shadow-glow-red'
                      }`}>
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg transition-colors ${
                          b.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-[#1c1b1b] group-hover:text-[#D32F2F]'
                        }`}>
                          {b.service_name || b.package_name || 'Service Booking'}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-[#5f5e5e] mt-1 font-medium flex-wrap">
                          {dateObj && (
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {b.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {formatTime(b.start_time)} – {formatTime(b.end_time)}
                            </span>
                          )}
                        </div>
                        {(b.vehicle_brand || b.vehicle_model) && (
                          <div className="flex items-center gap-1.5 text-xs text-[#5f5e5e] mt-1.5">
                            <Car size={12} className="text-[#D32F2F]" />
                            <span>{b.vehicle_brand} {b.vehicle_model} {b.vehicle_reg_no ? `(${b.vehicle_reg_no})` : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-gray-100">
                      {b.pickup_status && (
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                          b.pickup_status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          b.pickup_status === 'assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          b.pickup_status === 'picked_up' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          📍 Pickup: {b.pickup_status === 'picked_up' ? 'Picked Up' : b.pickup_status}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                        b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                        b.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {b.status}
                      </span>
                      {['confirmed', 'pending_approval'].includes(b.status) && canChange && (
                        <button
                          onClick={() => setChangeTargetBooking(b)}
                          className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all"
                        >
                          Change Service
                        </button>
                      )}
                      {b.status === 'confirmed' && !isPast && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="text-red-500 hover:text-red-700 transition p-2 rounded-full hover:bg-red-50 text-xs font-bold"
                          title="Cancel Booking"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > pagination.limit && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-[#5f5e5e] font-medium">
                  Page {page} of {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= Math.ceil(pagination.total / pagination.limit)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Service Update Modal */}
      {changeTargetBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setChangeTargetBooking(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D32F2F] to-[#af101a] flex items-center justify-center text-white">
                  <Sparkles size={16} />
                </div>
                <h3 className="font-bold text-[#1c1b1b]">Change Booking Services</h3>
              </div>
              <button onClick={() => setChangeTargetBooking(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              <p className="text-xs text-[#5f5e5e] font-medium mb-4">
                Choose the services you would like to swap for Booking #{changeTargetBooking.id}.
              </p>
              {services.map((s: any) => {
                const isChecked = selectedServiceIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      isChecked
                        ? 'border-[#D32F2F] bg-red-50/5'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedServiceIds(selectedServiceIds.filter(id => id !== s.id));
                          } else {
                            setSelectedServiceIds([...selectedServiceIds, s.id]);
                          }
                        }}
                        className="mt-1 accent-[#D32F2F] h-4 w-4 rounded text-[#D32F2F] border-gray-300 focus:ring-[#D32F2F]"
                      />
                      <div>
                        <div className="font-bold text-[#1c1b1b] text-sm">{s.name}</div>
                        <div className="text-xs text-[#5f5e5e] mt-0.5">{s.duration_minutes} min</div>
                      </div>
                    </div>
                    <div className="font-black text-sm text-[#1c1b1b]">
                      ₹{s.price_sedan || s.price_hatchback || s.price_suv}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setChangeTargetBooking(null)}>
                Cancel
              </Button>
              <Button
                loading={changeServicesMut.isPending}
                onClick={handleUpdateServices}
                disabled={selectedServiceIds.length === 0}
              >
                Update Services
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
