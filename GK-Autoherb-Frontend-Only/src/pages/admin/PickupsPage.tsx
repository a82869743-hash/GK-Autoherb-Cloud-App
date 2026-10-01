import { useState, useEffect } from 'react';
import { MapPin, CheckCircle2, Clock, RefreshCw, User, Phone, Clipboard, ArrowRight, UserCheck, Navigation, Car } from 'lucide-react';
import api from '../../api/axiosInstance';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { useUIStore } from '../../store/uiStore';
import { formatDate } from '../../utils/formatters';
import { usePickups, useAssignPickupStaff, useMarkPickedUp } from '../../api/hooks/usePickups';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

interface PickupRequest {
  id: number;
  booking_id: number;
  customer_id: number;
  address: string;
  scheduled_time: string | null;
  assigned_staff_id: number | null;
  status: 'pending' | 'assigned' | 'picked_up' | 'cancelled';
  notes: string | null;
  pickup_charges: string;
  created_at: string;
  // Joined fields
  customer_name?: string;
  customer_mobile?: string;
  staff_name?: string;
  staff_mobile?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending Assignment', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   icon: Clock },
  assigned:  { label: 'Driver Assigned',    color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',       icon: UserCheck },
  picked_up: { label: 'Picked Up & En Route', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled',          color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',     icon: Clipboard },
};

export default function PickupsPage() {
  const toast = useUIStore((s) => s.toast);
  const { data: pickupsRes, isLoading, refetch } = usePickups();
  const assignMut = useAssignPickupStaff();
  const markPickedUpMut = useMarkPickedUp();

  const [filter, setFilter] = useState('all');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<PickupRequest | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Fetch staff list for assignment
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/staff');
        setStaffList(res.data.data || []);
      } catch {
        setStaffList([]);
      }
    })();
  }, []);

  const pickups: PickupRequest[] = pickupsRes?.data || [];

  const filteredPickups = pickups.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const stats = {
    total: pickups.length,
    pending: pickups.filter(p => p.status === 'pending').length,
    assigned: pickups.filter(p => p.status === 'assigned').length,
    picked_up: pickups.filter(p => p.status === 'picked_up').length,
  };

  const handleAssign = async () => {
    if (!selectedPickup || !selectedStaffId) {
      toast('error', 'Please select a driver');
      return;
    }

    try {
      await assignMut.mutateAsync({
        id: selectedPickup.id,
        assigned_staff_id: parseInt(selectedStaffId),
      });
      toast('success', 'Driver assigned successfully!');
      setAssignModalOpen(false);
      setSelectedStaffId('');
      setSelectedPickup(null);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to assign driver');
    }
  };

  const handleMarkPickedUp = async (id: number) => {
    if (!confirm('Mark this vehicle as picked up and on the way to the studio?')) return;

    try {
      await markPickedUpMut.mutateAsync(id);
      toast('success', 'Pickup request marked as picked up');
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1400px] mx-auto">
      <AdminHeaderBar
        title="Vehicle Pickups"
        subtitle="Manage door-to-door concierge intake and assign workshop drivers"
        badge="Intake Concierge"
        actions={
          <button
            onClick={() => refetch()}
            className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          title="Total Pickups"
          value={stats.total}
          subtitle="All concierge requests"
          icon={Car}
          variant="red"
          trend="Doorstep requests"
        />
        <AdminMetricCard
          title="Pending Driver"
          value={stats.pending}
          subtitle="Unassigned intake"
          icon={Clock}
          variant="amber"
          trend="Needs allocation"
        />
        <AdminMetricCard
          title="Driver Assigned"
          value={stats.assigned}
          subtitle="Dispatched to client"
          icon={UserCheck}
          variant="sky"
          trend="En route to pickup"
        />
        <AdminMetricCard
          title="Picked Up"
          value={stats.picked_up}
          subtitle="Arrived at studio bay"
          icon={CheckCircle2}
          variant="emerald"
          trend="In workshop"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Requests', count: stats.total },
          { key: 'pending', label: 'Pending Assignment', count: stats.pending },
          { key: 'assigned', label: 'Assigned', count: stats.assigned },
          { key: 'picked_up', label: 'Picked Up', count: stats.picked_up },
          { key: 'cancelled', label: 'Cancelled', count: pickups.filter(p => p.status === 'cancelled').length },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              filter === item.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{item.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              filter === item.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="w-9 h-9 border-3 border-red-200 border-t-[#D32F2F] rounded-full animate-spin" />
        </div>
      ) : filteredPickups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#D32F2F] mx-auto flex items-center justify-center mb-3">
            <MapPin size={28} />
          </div>
          <p className="text-slate-900 text-base font-bold">No pickup requests found</p>
          <p className="text-slate-400 text-xs mt-1">Customers can request doorstep pickup during online booking</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPickups.map(p => {
            const config = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;

            return (
              <div key={p.id} className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D32F2F] font-bold">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <span className="text-slate-900 font-extrabold text-sm">Pickup #{p.id}</span>
                        <p className="text-[11px] font-semibold text-[#D32F2F]">Booking #{p.booking_id}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${config.bg} ${config.color} flex items-center gap-1`}>
                      <StatusIcon size={12} />
                      {config.label}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600 mb-4">
                    {/* Customer */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-slate-400" />
                        <span className="font-bold text-slate-900">{p.customer_name || 'Customer'}</span>
                      </div>
                      {p.customer_mobile && (
                        <a href={`tel:${p.customer_mobile}`} className="text-[#D32F2F] hover:underline flex items-center gap-1 font-semibold text-[11px]">
                          <Phone size={11} /> {p.customer_mobile}
                        </a>
                      )}
                    </div>

                    {/* Address */}
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pickup Location</p>
                      <p className="text-slate-700 leading-relaxed font-medium text-xs">{p.address}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-[#D32F2F] hover:underline inline-flex items-center gap-1 pt-1"
                      >
                        <Navigation size={11} /> Open in Google Maps
                      </a>
                    </div>

                    {/* Scheduled Time */}
                    {p.scheduled_time && (
                      <div className="flex items-center gap-2 bg-red-50/60 text-[#7f1d1d] font-bold rounded-2xl p-2.5 border border-red-100">
                        <Clock size={13} className="text-[#D32F2F]" />
                        <span>Scheduled Slot: {formatDate(p.scheduled_time)}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {p.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-2xl border border-dashed border-slate-200">
                        "{p.notes}"
                      </p>
                    )}

                    {/* Driver details */}
                    {p.staff_name && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-1">
                        <span className="text-slate-400 font-medium">Assigned Driver:</span>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">{p.staff_name}</p>
                          {p.staff_mobile && <p className="text-[10px] text-slate-400">{p.staff_mobile}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Fee: <strong className="text-slate-900 font-black">{parseFloat(p.pickup_charges) > 0 ? `₹${p.pickup_charges}` : 'Complimentary'}</strong>
                  </span>

                  <div className="flex gap-2">
                    {p.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedPickup(p);
                          setAssignModalOpen(true);
                        }}
                        className="h-9 px-4 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-2xl shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
                      >
                        Assign Driver <ArrowRight size={13} />
                      </button>
                    )}
                    {p.status === 'assigned' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedPickup(p);
                            setSelectedStaffId(String(p.assigned_staff_id || ''));
                            setAssignModalOpen(true);
                          }}
                          className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all"
                        >
                          Reassign
                        </button>
                        <button
                          onClick={() => handleMarkPickedUp(p.id)}
                          className="h-9 px-3.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 size={13} />
                          Picked Up
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Assignment Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedPickup(null);
          setSelectedStaffId('');
        }}
        title="Assign Concierge Driver"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} loading={assignMut.isPending} disabled={!selectedStaffId}>
              Confirm Driver
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select a certified team driver to pick up the vehicle for Booking #{selectedPickup?.booking_id}.
          </p>
          <Select
            label="Select Driver (Staff Member)"
            options={staffList.map(s => ({ value: s.id, label: `${s.name} (${s.mobile || 'No phone'})` }))}
            value={selectedStaffId}
            onChange={e => setSelectedStaffId(e.target.value)}
            placeholder="Choose driver..."
          />
        </div>
      </Modal>
    </div>
  );
}
