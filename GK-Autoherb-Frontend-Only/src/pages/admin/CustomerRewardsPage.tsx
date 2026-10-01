import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, CheckCircle, Clock, Plus, Search, Star, Sparkles, Award, ShieldCheck, Ticket } from 'lucide-react';
import { useCustomerRewards, useAwardWelcomeReward, useRedeemReward } from '../../api/hooks/useCustomerRewards';
import api from '../../api/axiosInstance';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { AnimatedModal, RippleButton } from '../../components/ui/Animations';

export default function CustomerRewardsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (showAwardModal) {
      setLoadingCustomers(true);
      api.get('/customers')
        .then(res => {
          if (res.data.success) {
            setCustomers(res.data.data);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingCustomers(false));
    }
  }, [showAwardModal]);

  const { data: rewardsData, isLoading } = useCustomerRewards(statusFilter ? { redeemed: statusFilter === 'redeemed' } : undefined);

  const awardWelcome = useAwardWelcomeReward();
  const redeemReward = useRedeemReward();

  const handleAward = () => {
    if (!selectedCustomerId) return;
    awardWelcome.mutate({ customer_id: selectedCustomerId }, {
      onSuccess: () => {
        setShowAwardModal(false);
        setSelectedCustomerId('');
      }
    });
  };

  const handleRedeem = (id: number) => {
    if (window.confirm('Mark this reward voucher as redeemed?')) {
      redeemReward.mutate(id);
    }
  };

  const rewards = rewardsData?.data || [];
  
  const filteredRewards = rewards.filter((r: any) => {
    if (!search) return true;
    return r.customer_name?.toLowerCase().includes(search.toLowerCase()) || 
           r.customer_mobile?.includes(search);
  });

  const activeCount = rewards.filter((r: any) => !r.redeemed).length;
  const redeemedCount = rewards.filter((r: any) => r.redeemed).length;
  const totalPoints = rewards.reduce((acc: number, r: any) => acc + (r.points_awarded || 0), 0);

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Customer Rewards & Loyalty Club"
        subtitle="Manage welcome perks, bonus detailing points, and member voucher redemptions"
        actions={
          <button
            onClick={() => setShowAwardModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs shadow-md shadow-red-200 transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Award Welcome Reward</span>
          </button>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Total Rewards Granted"
          value={rewards.length}
          trend={{ text: 'Loyalty Vouchers', positive: true }}
          icon={<Gift size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Active Available"
          value={activeCount}
          trend={{ text: 'Ready for redemption', positive: true }}
          icon={<Sparkles size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Redeemed Vouchers"
          value={redeemedCount}
          trend={{ text: 'Claimed at checkout', positive: true }}
          icon={<CheckCircle size={20} />}
          accentColor="purple"
        />
        <AdminMetricCard
          label="Total Reward Points"
          value={totalPoints}
          trend={{ text: 'AutoHerb Club Points', positive: true }}
          icon={<Award size={20} />}
          accentColor="amber"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search rewards by customer name or mobile number..." 
            className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200/90 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50/60 focus:bg-white transition-all font-medium placeholder:text-slate-400" 
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)} 
          className="w-full sm:w-auto text-xs sm:text-sm border border-slate-200/90 rounded-2xl px-4 py-2.5 bg-slate-50/60 focus:bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-red-500/20"
        >
          <option value="">All Statuses</option>
          <option value="active">Active (Unredeemed)</option>
          <option value="redeemed">Redeemed Vouchers</option>
        </select>
      </div>

      {/* Rewards Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Reward Type</th>
                <th className="py-4 px-6">Entitlements & Benefits</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Expiry</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-5 px-6"><div className="h-5 bg-slate-100 rounded-xl animate-pulse" /></td></tr>
                ))
              ) : filteredRewards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Gift size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 font-medium text-xs">No loyalty rewards found matching current filters.</p>
                  </td>
                </tr>
              ) : (
                filteredRewards.map((r: any, i: number) => {
                  const isExpired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
                  return (
                    <tr 
                      key={r.id || i}
                      className="hover:bg-red-50/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{r.customer_name || `Customer #${r.customer_id}`}</div>
                        <div className="text-xs text-slate-400 font-medium">{r.customer_mobile || '—'}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[11px] font-bold px-2.5 py-1 bg-red-50 text-[#b71c1c] border border-red-100 rounded-xl uppercase tracking-wider">
                          {r.reward_type}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {r.points_awarded > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                              <Star size={12} className="fill-amber-500 text-amber-500" /> {r.points_awarded} pts
                            </span>
                          )}
                          {r.discount_pct > 0 && (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                              {r.discount_pct}% Discount
                            </span>
                          )}
                        </div>
                        {r.description && <div className="text-[11px] text-slate-500 mt-1 font-medium">{r.description}</div>}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {r.redeemed ? (
                          <span className="text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold uppercase tracking-wider">
                            Redeemed
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold uppercase tracking-wider">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-1 bg-red-100 text-[#991b1b] rounded-full font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center text-slate-600 text-xs font-medium">
                        {r.expires_at ? new Date(r.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Lifetime'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!r.redeemed && !isExpired && (
                          <button 
                            onClick={() => handleRedeem(r.id)}
                            className="text-xs font-bold text-[#D32F2F] hover:text-white hover:bg-[#D32F2F] bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95"
                          >
                            Mark Redeemed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Award Modal */}
      <AnimatedModal isOpen={showAwardModal} onClose={() => setShowAwardModal(false)}>
        <div className="p-6 font-sans">
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Gift size={20} className="text-[#D32F2F]" /> Award Welcome Reward Voucher
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Select Customer Profile *</label>
              <select 
                value={selectedCustomerId} 
                onChange={e => setSelectedCustomerId(e.target.value)} 
                className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
              >
                <option value="">-- Select Registered Client --</option>
                {loadingCustomers ? (
                  <option disabled>Loading directory...</option>
                ) : (
                  customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="bg-red-50/70 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
              <Star className="text-[#D32F2F] shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-[#7f1d1d] uppercase tracking-wide">AutoHerb Welcome Entitlement</h4>
                <p className="text-xs text-[#b71c1c] mt-1 font-medium leading-relaxed">
                  The client will receive 500 AutoHerb Loyalty Points and a 10% discount on their detailing service. Valid for 30 days from allocation.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAwardModal(false)}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAward}
                disabled={!selectedCustomerId || awardWelcome.isPending}
                className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-2xl shadow-sm transition-all disabled:opacity-50"
              >
                {awardWelcome.isPending ? 'Granting...' : 'Grant Reward Voucher'}
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
