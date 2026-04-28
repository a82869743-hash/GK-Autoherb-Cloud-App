import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Clock, Car, Phone, User, FileText,
  ChevronLeft, ChevronRight, Loader2, X, Eye, History
} from 'lucide-react';
import { useBookings, useVehicleHistory } from '../../api/hooks/useBookings';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { formatTime } from '../../utils/formatters';

const TABS = [
  { key: 'confirmed', label: 'Confirmed', color: 'bg-green-500' },
  { key: 'all', label: 'All', color: 'bg-gray-500' },
  { key: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

export default function CustomerBookingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('confirmed');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Vehicle history modal
  const [historyRegNo, setHistoryRegNo] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: historyData, isLoading: historyLoading } = useVehicleHistory(historyRegNo);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useBookings({
    page,
    limit,
    status: activeTab !== 'all' ? activeTab : undefined,
    search: searchDebounced || undefined,
  });

  const bookings = data?.data || [];
  const pagination = data?.pagination || { page: 1, total: 0, limit };
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const openVehicleHistory = (regNo: string) => {
    setHistoryRegNo(regNo);
    setHistoryOpen(true);
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
    <>
      <AdminTopBar
        title="Customer Bookings"
        subtitle="Manage incoming customer slot bookings"
      />

      {/* Tabs + Search Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#f6f3f2] rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-white text-[#1c1b1b] shadow-sm'
                  : 'text-[#5f5e5e] hover:text-[#1c1b1b]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, mobile, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Customer + Vehicle Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D32F2F]/10 to-[#D32F2F]/20 flex items-center justify-center text-[#D32F2F] font-black text-sm shrink-0">
                      {b.customer_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[#1c1b1b] text-sm truncate">{b.customer_name}</h4>
                      <div className="flex items-center gap-3 text-xs text-[#5f5e5e]">
                        <span className="flex items-center gap-1">
                          <Phone size={10} />
                          {b.customer_mobile}
                        </span>
                        {b.customer_email && (
                          <span className="hidden sm:inline truncate">{b.customer_email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Vehicle */}
                    <div className="flex items-start gap-2">
                      <Car size={14} className="text-[#D32F2F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Vehicle</p>
                        <p className="text-xs font-bold text-[#1c1b1b]">
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

                    {/* Service */}
                    <div className="flex items-start gap-2">
                      <FileText size={14} className="text-[#D32F2F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Service</p>
                        <p className="text-xs font-bold text-[#1c1b1b] truncate">
                          {b.service_name || b.package_name || '—'}
                        </p>
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
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {b.status}
                  </span>

                  {b.status === 'confirmed' && !b.job_cart_id && (
                    <Button
                      size="sm"
                      onClick={() => handleCreateJobCart(b)}
                      icon={<FileText size={14} />}
                      className="whitespace-nowrap"
                    >
                      Create Job Cart
                    </Button>
                  )}

                  {b.job_cart_id && (
                    <button
                      onClick={() => navigate(`/admin/job-carts/${b.job_cart_id}`)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#D32F2F] hover:underline"
                    >
                      <Eye size={12} />
                      View Job Cart #{b.job_cart_id}
                    </button>
                  )}
                </div>
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
                          jc.status === 'open' ? 'bg-blue-100 text-blue-700' :
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
    </>
  );
}
