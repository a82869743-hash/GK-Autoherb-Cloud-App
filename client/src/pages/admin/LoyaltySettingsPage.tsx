import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Settings, Award, TrendingUp, Users, ArrowDownRight, ArrowUpRight, RefreshCw, Search, ShieldCheck, Sparkles, DollarSign, Check, Gift, User, CheckCircle2, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { useUIStore } from '../../store/uiStore';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import type { LoyaltySettings, LoyaltyTransaction } from '../../types';
import { formatINR } from '../../utils/formatters';

export default function LoyaltySettingsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'grants' | 'settings'>('overview');

  const tabs = [
    { key: 'overview' as const, label: 'Customer Points Lookup', icon: Users },
    { key: 'grants' as const, label: 'Direct Benefit Grants', icon: Award },
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
        subtitle="Configure rewards conversion ratios, minimum spend, customer points, and direct grants"
        badge={settings?.enabled ? 'Program Active' : 'Program Paused'}
      >
        <Link
          to="/admin/customer-rewards"
          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 transition-all shadow-xs inline-flex items-center gap-1.5"
        >
          <Gift size={15} className="text-[#D32F2F]" />
          <span>Reward Vouchers</span>
        </Link>
      </AdminHeaderBar>

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
        {activeTab === 'grants' && <DirectGrantsTab />}
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

// ─── Direct Loyalty Grants Tab ────────────────
function DirectGrantsTab() {
  const toast = useUIStore((s) => s.toast);
  const [searchQ, setSearchQ] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [washes, setWashes] = useState(0);
  const [wax, setWax] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['loyalty-grants-search', searchQ],
    queryFn: async () => {
      const { data } = await api.get('/loyalty/search', { params: { q: searchQ } });
      return data.data || [];
    },
    enabled: searchQ.trim().length >= 2,
  });

  const handleAward = async () => {
    if (!selectedCustomer) return;
    if (!credits && !washes && !wax) {
      toast('error', 'Please enter at least one benefit to grant (credits, wash vouchers, or wax sessions)');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/loyalty/${selectedCustomer.id}`, {
        credits,
        free_washes: washes,
        wax_count: wax,
        note: note || 'Direct administrative grant from Loyalty Hub',
      });
      toast('success', `Benefits successfully awarded to ${selectedCustomer.name}`);
      setSelectedCustomer({
        ...selectedCustomer,
        credits: parseFloat(selectedCustomer.credits || 0) + credits,
        free_washes: (selectedCustomer.free_washes || 0) + washes,
        wax_count: (selectedCustomer.wax_count || 0) + wax,
      });
      setCredits(0);
      setWashes(0);
      setWax(0);
      setNote('');
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to grant benefits');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-xs p-2 flex items-center">
          <Search size={18} className="text-slate-400 ml-3 shrink-0" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search customer by name or phone to grant benefits..."
            className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none"
          />
          {searching && (
            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#D32F2F] rounded-full animate-spin mr-3 shrink-0" />
          )}
        </div>

        {/* Dropdown Results */}
        {searchQ.length >= 2 && searchResults?.length > 0 && !selectedCustomer && (
          <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map((c: any) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCustomer(c); setSearchQ(''); }}
                className="w-full px-5 py-3.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center font-bold text-xs">
                    {c.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">{c.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{c.mobile}</p>
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold text-[#b71c1c] bg-red-50 px-2.5 py-1 rounded-xl">
                  <span>₹{c.credits || 0} · {c.free_washes || 0}W · {c.wax_count || 0}X</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Customer Card & Grant Form */}
      {selectedCustomer ? (
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-bold shadow-inner">
                <User size={22} />
              </div>
              <div>
                <p className="font-extrabold text-base text-slate-900">{selectedCustomer.name}</p>
                <p className="text-xs font-mono text-slate-400">{selectedCustomer.mobile}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="h-8 px-3 text-xs font-bold text-[#D32F2F] hover:text-[#991b1b] bg-red-50 rounded-xl transition-all"
            >
              Change Client
            </button>
          </div>

          {/* Current Balances Grid */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Active Wallet Balances</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Credits</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{formatINR(selectedCustomer.credits || 0)}</p>
              </div>
              <div className="text-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complimentary Washes</p>
                <p className="text-base font-black text-[#D32F2F] mt-0.5">{selectedCustomer.free_washes || 0}</p>
              </div>
              <div className="text-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wax Treatments</p>
                <p className="text-base font-black text-amber-600 mt-0.5">{selectedCustomer.wax_count || 0}</p>
              </div>
            </div>
          </div>

          {/* Award Form */}
          <div className="space-y-4 pt-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Grant Quantum</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Add Cash Credits (₹)</label>
                <input
                  type="number"
                  value={credits || ''}
                  onChange={(e) => setCredits(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 500"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Free Washes</label>
                <input
                  type="number"
                  value={washes || ''}
                  onChange={(e) => setWashes(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 1"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Wax Treatments</label>
                <input
                  type="number"
                  value={wax || ''}
                  onChange={(e) => setWax(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 1"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Administrative Reason / Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Goodwill voucher, Anniversary reward, Service courtesy..."
                className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
              />
            </div>

            <button
              onClick={handleAward}
              disabled={submitting}
              className="w-full h-12 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-extrabold rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Grant Benefits to Client</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center mx-auto mb-3">
            <Award size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Search for a Customer Above</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Type a customer's name or mobile number to look up their current rewards balance and grant complimentary wash vouchers, wax sessions, or wallet credits.
          </p>
        </div>
      )}
    </div>
  );
}
