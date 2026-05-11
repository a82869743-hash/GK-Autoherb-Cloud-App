import { useState } from 'react';
import { Droplets, Clock, CheckCircle2, Truck, Plus, RefreshCw, Hash } from 'lucide-react';
import { useQuickWashes, useQuickWashStats, useCreateQuickWash, useUpdateWashStatus } from '../../api/hooks/useQuickWash';
import { useCustomerSearch } from '../../api/hooks/useSearch';
import type { QuickWashBooking, WashStatus } from '../../types';
import { useToastStore } from '../../store/toastStore';

const STATUS_CONFIG: Record<WashStatus, { label: string; color: string; icon: React.ElementType; next?: WashStatus }> = {
  pending:   { label: 'In Queue',   color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock,        next: 'washing' },
  washing:   { label: 'Washing',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     icon: Droplets,     next: 'completed' },
  completed: { label: 'Completed',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, next: 'delivered' },
  delivered: { label: 'Delivered',  color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',     icon: Truck },
};

export default function QuickWashPage() {
  const [filter, setFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: washes = [], isLoading, refetch } = useQuickWashes({ status: filter !== 'all' ? filter : undefined });
  const { data: stats } = useQuickWashStats();
  const updateStatus = useUpdateWashStatus();
  const { addToast } = useToastStore();

  const handleStatusAdvance = async (id: number, nextStatus: WashStatus) => {
    try {
      await updateStatus.mutateAsync({ id, wash_status: nextStatus });
      addToast('success', `Status updated to ${STATUS_CONFIG[nextStatus].label}`);
    } catch {
      addToast('error', 'Failed to update status');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Droplets size={24} className="text-blue-400" />
            </div>
            Quick Wash
          </h1>
          <p className="text-gray-400 text-sm mt-1">Fast-track walk-in wash bookings</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 bg-white/5 text-gray-300 rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#D32F2F] to-[#af101a] text-white rounded-xl shadow-lg hover:shadow-red-500/20 transition-all flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            New Wash
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([
            { label: 'In Queue', value: stats.pending_count, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20', textColor: 'text-amber-400' },
            { label: 'Washing', value: stats.washing_count, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20', textColor: 'text-blue-400' },
            { label: 'Completed', value: stats.completed_count, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20', textColor: 'text-emerald-400' },
            { label: 'Delivered', value: stats.delivered_count, color: 'from-gray-500/20 to-gray-600/10 border-gray-500/20', textColor: 'text-gray-400' },
            { label: 'Total Today', value: stats.total_today, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/20', textColor: 'text-purple-400' },
          ]).map((stat) => (
            <div key={stat.label} className={`p-4 rounded-xl bg-gradient-to-br ${stat.color} border`}>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.textColor}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'pending', 'washing', 'completed', 'delivered'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === status
                ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-500/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {status === 'all' ? 'All' : STATUS_CONFIG[status as WashStatus]?.label || status}
          </button>
        ))}
      </div>

      {/* Wash Cards */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-gray-700 border-t-[#D32F2F] rounded-full animate-spin" />
        </div>
      ) : washes.length === 0 ? (
        <div className="text-center py-20">
          <Droplets size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg font-medium">No wash bookings</p>
          <p className="text-gray-500 text-sm mt-1">Click "New Wash" to add a walk-in</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {washes.map((wash: QuickWashBooking) => {
            const config = STATUS_CONFIG[wash.wash_status];
            const StatusIcon = config.icon;

            return (
              <div
                key={wash.id}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:bg-white/[0.05] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#D32F2F]/20 flex items-center justify-center">
                      <Hash size={14} className="text-[#D32F2F]" />
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm">Queue #{wash.queue_position}</span>
                      <p className="text-[11px] text-gray-500">#{wash.id}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${config.color}`}>
                    <StatusIcon size={12} className="inline mr-1 -mt-0.5" />
                    {config.label}
                  </span>
                </div>

                {/* Vehicle */}
                <div className="space-y-1.5 mb-3">
                  <p className="text-sm text-white font-medium">
                    {wash.vehicle_brand} {wash.vehicle_model}
                  </p>
                  <p className="text-xs text-gray-400">{wash.vehicle_reg_no || 'No reg'}</p>
                  {wash.customer_name && (
                    <p className="text-xs text-gray-500">{wash.customer_name} · {wash.customer_mobile}</p>
                  )}
                  {wash.service_name && (
                    <p className="text-xs text-blue-400">{wash.service_name}</p>
                  )}
                </div>

                {wash.notes && (
                  <p className="text-xs text-gray-500 italic mb-3 line-clamp-2">{wash.notes}</p>
                )}

                {/* Action */}
                {config.next && (
                  <button
                    onClick={() => handleStatusAdvance(wash.id, config.next!)}
                    disabled={updateStatus.isPending}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <StatusIcon size={14} />
                    Move to {STATUS_CONFIG[config.next].label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateQuickWashModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

// ─── Create Quick Wash Modal ────────────────
function CreateQuickWashModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    customer_id: undefined as number | undefined,
    vehicle_reg_no: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_category: 'hatchback',
    notes: '',
  });
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const { data: searchResults = [] } = useCustomerSearch(customerQuery);
  const createMutation = useCreateQuickWash();
  const { addToast } = useToastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_reg_no && !form.customer_id) {
      addToast('error', 'Please provide a vehicle registration or select a customer');
      return;
    }

    try {
      const result = await createMutation.mutateAsync(form);
      addToast('success', result.message || 'Quick wash booked!');
      onClose();
    } catch {
      addToast('error', 'Failed to create quick wash');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Droplets size={20} className="text-blue-400" />
            New Quick Wash
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer search */}
          <div className="relative">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Customer (optional)</label>
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setShowCustomerDropdown(true);
              }}
              placeholder="Search by name or mobile..."
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D32F2F]/40 focus:border-[#D32F2F]/50 outline-none"
            />
            {showCustomerDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#252525] border border-white/10 rounded-xl max-h-40 overflow-y-auto z-10 shadow-xl">
                {searchResults.map((c: { id: number; name: string; mobile: string }) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, customer_id: c.id }));
                      setCustomerQuery(c.name);
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/5 transition-colors flex justify-between"
                  >
                    <span>{c.name}</span>
                    <span className="text-gray-500">{c.mobile}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle details */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Vehicle Reg No *</label>
            <input
              type="text"
              value={form.vehicle_reg_no}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_reg_no: e.target.value.toUpperCase() }))}
              placeholder="MH12AB1234"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D32F2F]/40 focus:border-[#D32F2F]/50 outline-none uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Brand</label>
              <input
                type="text"
                value={form.vehicle_brand}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_brand: e.target.value }))}
                placeholder="Hyundai"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D32F2F]/40 focus:border-[#D32F2F]/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Model</label>
              <input
                type="text"
                value={form.vehicle_model}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_model: e.target.value }))}
                placeholder="Creta"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D32F2F]/40 focus:border-[#D32F2F]/50 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Vehicle Category</label>
            <select
              value={form.vehicle_category}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_category: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-[#D32F2F]/40 focus:border-[#D32F2F]/50 outline-none appearance-none"
            >
              <option value="hatchback">Hatchback</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any special instructions..."
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D32F2F]/40 focus:border-[#D32F2F]/50 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/5 text-gray-300 rounded-xl border border-white/10 hover:bg-white/10 text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#D32F2F] to-[#af101a] text-white rounded-xl shadow-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus size={16} />
                  Book Wash
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
