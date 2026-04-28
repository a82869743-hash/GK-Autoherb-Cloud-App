import { useState } from 'react';
import { Calendar, Clock, ArrowRight, CalendarPlus, Car, Sparkles, X, Loader2 } from 'lucide-react';
import AdminTopBar from '../../components/layout/AdminTopBar';
import EmptyState from '../../components/shared/EmptyState';
import Button from '../../components/ui/Button';
import { useBookings, useCancelBooking } from '../../api/hooks/useBookings';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { formatTime } from '../../utils/formatters';

export default function BookingsPage() {
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useBookings({ page, limit: 20 });
  const cancelMut = useCancelBooking();

  const bookings = data?.data || [];
  const pagination = data?.pagination;

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
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                        b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                        b.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {b.status}
                      </span>
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
    </>
  );
}
