import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Search, CheckCircle, Clock, BarChart3, Eye, AlertTriangle, RefreshCw, Car, User, Sparkles
} from 'lucide-react';
import { useAllUserPackages, useRenewPackage } from '../../api/hooks/useUserPackages';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import Modal from '../../components/ui/Modal';
import { useUIStore } from '../../store/uiStore';

export default function PackageTrackingPage() {
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch all user packages
  const { data: allPackages, isLoading, refetch } = useAllUserPackages({
    status: statusFilter,
    search: searchQuery,
  });

  // Renewal Mutation
  const renewMut = useRenewPackage();
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [renewAmount, setRenewAmount] = useState<string>('');
  const [renewMode, setRenewMode] = useState<string>('cash');

  const handleOpenRenew = (pkg: any) => {
    setSelectedPkg(pkg);
    setRenewAmount(String(pkg.price_paid || 0));
    setRenewMode('cash');
    setRenewModalOpen(true);
  };

  const handleConfirmRenew = async () => {
    if (!selectedPkg) return;
    try {
      await renewMut.mutateAsync({
        user_package_id: selectedPkg.id,
        payment_amount: parseFloat(renewAmount) || 0,
        payment_mode: renewMode,
      });
      toast('success', 'Package subscription renewed successfully');
      setRenewModalOpen(false);
      setSelectedPkg(null);
      refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to renew subscription');
    }
  };

  // Compute stat totals from all records (unfiltered)
  const unfilteredPackages = allPackages || [];
  
  const totalSubscribed = unfilteredPackages.length;
  const totalActive = unfilteredPackages.filter((p: any) => p.package_status === 'active').length;
  const totalExpired = unfilteredPackages.filter((p: any) => p.package_status === 'expired').length;
  const totalExpiringSoon = unfilteredPackages.filter(
    (p: any) => p.package_status === 'active' && p.days_remaining !== null && p.days_remaining <= 30
  ).length;

  const totalRevenue = unfilteredPackages
    .filter((p: any) => p.payment_status === 'paid' || p.payment_status === 'completed')
    .reduce((sum: number, p: any) => sum + (parseFloat(p.price_paid) || 0), 0);

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1400px] mx-auto">
      <AdminHeaderBar
        title="Package Subscriptions"
        subtitle="Track recurring customer packages, service usage quotas, and upcoming renewals"
        badge="Subscriptions CRM"
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

      {/* Stats Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          title="Total Subscriptions"
          value={totalSubscribed}
          subtitle="All recorded memberships"
          icon={Layers}
          variant="red"
          trend="Client enrollments"
        />
        <AdminMetricCard
          title="Active Plans"
          value={totalActive}
          subtitle="Currently valid packages"
          icon={CheckCircle}
          variant="emerald"
          trend="Service quota open"
        />
        <AdminMetricCard
          title="Expiring Soon (≤30d)"
          value={totalExpiringSoon}
          subtitle="Renewal outreach targets"
          icon={Clock}
          variant="amber"
          trend="Follow-up due"
        />
        <AdminMetricCard
          title="Subscription Inflow"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          subtitle="Total package sales realized"
          icon={BarChart3}
          variant="purple"
          trend="Cumulative value"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, mobile, vehicle plate, or package..."
            className="w-full h-11 pl-10 pr-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-52">
          <select
            className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500/20 bg-slate-50 focus:bg-white text-slate-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active Packages</option>
            <option value="expired">Expired Plans</option>
            <option value="renewed">Renewed Cycles</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="animate-spin text-[#D32F2F] w-8 h-8" />
            <p className="text-xs text-slate-400 font-medium">Loading subscription quotas...</p>
          </div>
        ) : unfilteredPackages.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center mb-2">
              <Layers size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Subscriptions Found</h3>
            <p className="text-xs text-slate-400">There are no package memberships matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Subscriber</th>
                  <th className="p-4">Assigned Vehicle</th>
                  <th className="p-4">Package Tier</th>
                  <th className="p-4">Validity Horizon</th>
                  <th className="p-4 text-center">Remaining</th>
                  <th className="p-4">Quota Utilization</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {allPackages.map((pkg: any) => {
                  let daysLeftColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  let daysLeftText = `${pkg.days_remaining} Days`;

                  if (pkg.package_status === 'expired') {
                    daysLeftColor = 'text-rose-700 bg-rose-50 border-rose-200';
                    daysLeftText = 'Expired';
                  } else if (pkg.package_status === 'renewed') {
                    daysLeftColor = 'text-slate-600 bg-slate-50 border-slate-200';
                    daysLeftText = 'Renewed';
                  } else if (pkg.days_remaining === null) {
                    daysLeftColor = 'text-slate-600 bg-slate-50 border-slate-200';
                    daysLeftText = 'Unlimited';
                  } else if (pkg.days_remaining === 0) {
                    daysLeftColor = 'text-rose-700 bg-rose-50 border-rose-200';
                    daysLeftText = 'Expires Today';
                  } else if (pkg.days_remaining <= 30) {
                    daysLeftColor = 'text-amber-700 bg-amber-50 border-amber-200';
                  }

                  return (
                    <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Customer Info */}
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900">{pkg.customer_name}</span>
                          <span className="text-[11px] font-mono text-slate-400">{pkg.customer_mobile}</span>
                        </div>
                      </td>

                      {/* Vehicle Info */}
                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          {pkg.vehicle_reg_no ? (
                            <div className="flex items-center gap-1.5">
                              <VehicleBrandBadge brand={pkg.vehicle_brand} model={pkg.vehicle_model} />
                              <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {pkg.vehicle_reg_no}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unlinked vehicle</span>
                          )}
                          <span className="inline-block w-fit text-[10px] font-extrabold uppercase tracking-wider text-[#b71c1c] bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            {pkg.vehicle_segment || 'Studio General'}
                          </span>
                        </div>
                      </td>

                      {/* Package Info */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900">{pkg.package_name}</span>
                          <span className="text-[11px] font-bold text-slate-600">
                            Paid: ₹{parseFloat(pkg.price_paid || 0).toLocaleString('en-IN')}
                          </span>
                          <span className={`inline-block w-fit mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            pkg.package_status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            pkg.package_status === 'expired' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {pkg.package_status}
                          </span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="p-4 text-[11px] text-slate-600">
                        <div className="flex flex-col space-y-1 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Start:</span>
                            <span className="font-bold text-slate-700">
                              {new Date(pkg.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">End:</span>
                            <span className="font-bold text-slate-700">
                              {pkg.end_date ? new Date(pkg.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Perpetual'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Days Left */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${daysLeftColor}`}>
                          {daysLeftText}
                        </span>
                      </td>

                      {/* Quota Usage */}
                      <td className="p-4">
                        <div className="space-y-1.5 min-w-[170px] max-w-[220px]">
                          {(pkg.usage || []).map((u: any, idx: number) => {
                            const pct = Math.min(100, Math.round((u.used_count / u.total_count) * 100));
                            return (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex justify-between text-[10px] font-semibold">
                                  <span className="text-slate-700 truncate max-w-[130px]">{u.service_name}</span>
                                  <span className="text-[#b71c1c] font-extrabold">{u.used_count}/{u.total_count}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-[#D32F2F] h-full rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center"
                            title="View Customer Profile"
                            onClick={() => navigate(`/admin/customers/${pkg.user_id}`)}
                          >
                            <Eye size={14} />
                          </button>
                          {(pkg.package_status === 'expired' || (pkg.package_status === 'active' && pkg.days_remaining !== null && pkg.days_remaining <= 30)) && (
                            <button
                              className="h-8 px-3 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-xl text-[11px] font-bold shadow-sm shadow-red-600/20 transition-all flex items-center gap-1"
                              onClick={() => handleOpenRenew(pkg)}
                            >
                              <RefreshCw size={11} />
                              Renew
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renewal Dialog Modal */}
      {renewModalOpen && selectedPkg && (
        <Modal
          open={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          title={`Renew Subscription: ${selectedPkg.package_name}`}
        >
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-2.5">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-bold">Subscription Cycle Reset</p>
                <p>This action resets all detailing wash and coating allowances for {selectedPkg.customer_name} to their full quota and begins a new subscription period.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Original Base Price</label>
              <input
                type="text"
                disabled
                value={`₹${parseFloat(selectedPkg.price_paid || 0).toLocaleString('en-IN')}`}
                className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold bg-slate-100 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Renewal Payment Collected (₹) *</label>
              <input
                type="number"
                placeholder="Enter collected amount"
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
                className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method *</label>
              <select
                className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500/20 bg-slate-50 focus:bg-white text-slate-700"
                value={renewMode}
                onChange={(e) => setRenewMode(e.target.value)}
              >
                <option value="cash">Studio Cash</option>
                <option value="upi">UPI / QR Transfer</option>
                <option value="card">Point of Sale POS Card</option>
                <option value="razorpay">Razorpay Digital Gateway</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setRenewModalOpen(false)}
                className="h-10 px-4 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRenew}
                disabled={renewMut.isPending}
                className="h-10 px-5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {renewMut.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Confirm Renewal
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
