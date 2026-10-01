import { useState, useEffect } from 'react';
import { Star, Settings, Award, TrendingUp, Users, ArrowDownRight, ArrowUpRight, RefreshCw, Search, ShieldCheck, Sparkles, DollarSign, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { useUIStore } from '../../store/uiStore';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import type { LoyaltySettings, LoyaltyTransaction } from '../../types';
import { formatINR } from '../../utils/formatters';

export default function LoyaltySettingsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  const tabs = [
    { key: 'overview' as const, label: 'Customer Lookup', icon: Users },
    { key: 'settings' as const, label: 'Program Settings', icon: Settings },
  ];

  const { data: settings } = useQuery<LoyaltySettings>({
    queryKey: ['loyalty-settings'],
    queryFn: async () => {
      const { data } = await api.get('/loyalty/settings');
      return data.data;
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title="Customer Loyalty & Rewards"
        subtitle="Configure rewards conversion ratios, minimum spend, and search customer points"
        badge={settings?.enabled ? 'Program Active' : 'Program Paused'}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Earn Ratio"
            value={`₹${settings?.points_ratio || 100}`}
            subtitle="Per 1 Loyalty Point"
            icon={<Star className="w-5 h-5 text-amber-500" />}
            variant="amber"
            trend={{ text: '1 Pt per ratio', positive: true }}
          />
          <AdminMetricCard
            title="Point Value"
            value={`₹${settings?.point_value || 1}`}
            subtitle="Redemption worth in invoice"
            icon={<Award className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: 'Direct credit', positive: true }}
          />
          <AdminMetricCard
            title="Min Redemption"
            value={`${settings?.min_redeem || 50} pts`}
            subtitle="Minimum threshold to burn"
            icon={<DollarSign className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: 'Redemption limit', positive: true }}
          />
          <AdminMetricCard
            title="Loyalty Engine"
            value={settings?.enabled ? 'Enabled' : 'Paused'}
            subtitle="Automatic billing rewards"
            icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
            variant={settings?.enabled ? "emerald" : "rose"}
            trend={{ text: settings?.enabled ? 'Active' : 'Inactive', positive: !!settings?.enabled }}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-3xl p-1.5 border border-slate-100 shadow-sm inline-flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-[#D32F2F] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <CustomerLoyaltyLookup />}
        {activeTab === 'settings' && <LoyaltySettingsTab />}
      </div>
    </div>
  );
}

// ─── Customer Loyalty Lookup ────────────────
function CustomerLoyaltyLookup() {
  const [query, setQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const toast = useUIStore((s) => s.toast);

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['loyalty-search', query],
    queryFn: async () => {
      const { data } = await api.get('/loyalty/search', { params: { q: query } });
      return data.data;
    },
  });

  const { data: transactions = [] } = useQuery<LoyaltyTransaction[]>({
    queryKey: ['loyalty-history', selectedCustomerId],
    queryFn: async () => {
      const { data } = await api.get(`/loyalty/${selectedCustomerId}/history`);
      return data.data;
    },
    enabled: !!selectedCustomerId,
  });

  const queryClient = useQueryClient();
  const earnMutation = useMutation({
    mutationFn: async (payload: { customer_id: number; amount: number }) => {
      const { data } = await api.post('/loyalty/earn', payload);
      return data;
    },
    onSuccess: (data) => {
      toast('success', data.message || 'Points awarded successfully');
      queryClient.invalidateQueries({ queryKey: ['loyalty-search'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-history'] });
    },
    onError: () => toast('error', 'Failed to award points'),
  });

  const [earnAmount, setEarnAmount] = useState('');

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer by name or mobile..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none shadow-sm transition-all"
        />
        {searching && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#D32F2F] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((c: { id: number; name: string; mobile: string; credits: number; free_washes: number; points: number }) => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomerId(c.id)}
              className={`p-5 rounded-3xl border text-left transition-all ${
                selectedCustomerId === c.id
                  ? 'bg-red-50/60 border-[#D32F2F] shadow-sm ring-2 ring-red-500/20'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
              }`}
            >
              <p className="text-slate-900 font-bold text-sm leading-tight">{c.name}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{c.mobile}</p>

              <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Points</p>
                  <p className="text-base font-black text-amber-600 mt-0.5">{c.points || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Credits</p>
                  <p className="text-base font-black text-emerald-600 mt-0.5">₹{c.credits || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Free Washes</p>
                  <p className="text-base font-black text-[#D32F2F] mt-0.5">{c.free_washes || 0}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Customer Actions */}
      {selectedCustomerId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Award */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2 mb-4">
              <Award size={18} className="text-[#D32F2F]" />
              Award Manual Loyalty Points
            </h3>
            <div className="flex gap-3">
              <input
                type="number"
                value={earnAmount}
                onChange={(e) => setEarnAmount(e.target.value)}
                placeholder="Invoice billing amount (₹)"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
              />
              <button
                onClick={() => {
                  if (!earnAmount || parseFloat(earnAmount) <= 0) {
                    toast('error', 'Enter a valid amount');
                    return;
                  }
                  earnMutation.mutate({ customer_id: selectedCustomerId, amount: parseFloat(earnAmount) });
                  setEarnAmount('');
                }}
                disabled={earnMutation.isPending}
                className="px-5 py-2.5 bg-[#D32F2F] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 hover:bg-[#b71c1c] disabled:opacity-50 whitespace-nowrap active:scale-95 transition-all"
              >
                {earnMutation.isPending ? 'Awarding...' : 'Award Points'}
              </button>
            </div>
            {earnMutation.data && (
              <p className="text-emerald-600 text-xs font-bold mt-2">
                +{earnMutation.data.data?.points_earned} points awarded (New Balance: {earnMutation.data.data?.new_balance})
              </p>
            )}
          </div>

          {/* Transaction History */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[#D32F2F]" />
              Recent Points Transactions
            </h3>
            {transactions.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-8">No transactions recorded yet</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {transactions.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${tx.points >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                        {tx.points >= 0 ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{tx.description || tx.type}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black tabular-nums ${tx.points >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {tx.points >= 0 ? '+' : ''}{tx.points} pts
                      </p>
                      <p className="text-[10px] text-slate-400 tabular-nums font-mono">Bal: {tx.balance_after}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loyalty Settings Tab ───────────────────
function LoyaltySettingsTab() {
  const toast = useUIStore((s) => s.toast);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<LoyaltySettings>({
    queryKey: ['loyalty-settings'],
    queryFn: async () => {
      const { data } = await api.get('/loyalty/settings');
      return data.data;
    },
  });

  const [form, setForm] = useState<Partial<LoyaltySettings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<LoyaltySettings>) => {
      const { data } = await api.patch('/loyalty/settings', payload);
      return data;
    },
    onSuccess: (data) => {
      toast('success', data.message || 'Loyalty settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] });
    },
    onError: () => toast('error', 'Failed to update settings'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#D32F2F] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
        <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2">
          <Settings size={18} className="text-[#D32F2F]" />
          Loyalty Rules & Ratios
        </h3>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Points Ratio (₹ per 1 point)</label>
          <input
            type="number"
            value={form.points_ratio || ''}
            onChange={(e) => setForm((f) => ({ ...f, points_ratio: parseFloat(e.target.value) }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
          />
          <p className="text-[11px] text-slate-400 mt-1">Customer earns 1 point for every ₹{form.points_ratio || 100} spent on services</p>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Point Value (₹ per point)</label>
          <input
            type="number"
            value={form.point_value || ''}
            onChange={(e) => setForm((f) => ({ ...f, point_value: parseFloat(e.target.value) }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
          />
          <p className="text-[11px] text-slate-400 mt-1">1 point = ₹{form.point_value || 1} direct discount during checkout</p>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Minimum Redeem Points Threshold</label>
          <input
            type="number"
            value={form.min_redeem || ''}
            onChange={(e) => setForm((f) => ({ ...f, min_redeem: parseFloat(e.target.value) }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-900 font-bold">Enable Automatic Loyalty Rewards</p>
            <p className="text-[11px] text-slate-400">Points will be calculated automatically on invoice generation</p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
            className={`w-12 h-6 rounded-full transition-all relative ${
              form.enabled ? 'bg-[#D32F2F]' : 'bg-slate-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
              form.enabled ? 'left-[26px]' : 'left-0.5'
            }`} />
          </button>
        </div>

        <button
          onClick={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
          className="w-full py-2.5 bg-[#D32F2F] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#b71c1c] active:scale-95 transition-all"
        >
          {updateMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <RefreshCw size={14} />
              Save Loyalty Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
