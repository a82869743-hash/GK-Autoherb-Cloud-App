import { useState } from 'react';
import { Search, Award, User, Sparkles, Gift, CheckCircle2 } from 'lucide-react';
import { useLoyaltySearch, useUpdateLoyalty } from '../../api/hooks/useLoyalty';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import { useUIStore } from '../../store/uiStore';
import { formatINR } from '../../utils/formatters';

export default function LoyaltyAwardPage() {
  const toast = useUIStore((s) => s.toast);
  const [searchQ, setSearchQ] = useState('');
  const { data: customers } = useLoyaltySearch(searchQ);
  const updateMut = useUpdateLoyalty();

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [washes, setWashes] = useState(0);
  const [wax, setWax] = useState(0);
  const [note, setNote] = useState('');

  const handleAward = async () => {
    if (!selectedCustomer) return;
    if (!credits && !washes && !wax) { 
      toast('error', 'Please enter at least one benefit to grant'); 
      return; 
    }
    try {
      await updateMut.mutateAsync({
        customerId: selectedCustomer.id,
        credits, free_washes: washes, wax_count: wax, note,
      });
      toast('success', `Benefits successfully awarded to ${selectedCustomer.name}`);
      setCredits(0); setWashes(0); setWax(0); setNote('');
      // Update local display
      setSelectedCustomer({
        ...selectedCustomer,
        credits: parseFloat(selectedCustomer.credits || 0) + credits,
        free_washes: (selectedCustomer.free_washes || 0) + washes,
        wax_count: (selectedCustomer.wax_count || 0) + wax,
      });
    } catch (err: any) { 
      toast('error', err?.response?.data?.error || 'Failed to grant benefits'); 
    }
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[800px] mx-auto">
      <AdminHeaderBar
        title="Direct Loyalty Grants"
        subtitle="Immediately grant credits, complimentary wash vouchers, or wax sessions to client accounts"
        badge="Loyalty Engine"
      />

      <div className="space-y-6">
        {/* Search Customer Input */}
        <div className="relative">
          <div className="relative bg-white rounded-3xl border border-slate-100 shadow-sm p-2 flex items-center">
            <Search size={18} className="text-slate-400 ml-3 shrink-0" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search customer by name or phone number..."
              className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none"
            />
          </div>

          {/* Dropdown Results */}
          {searchQ.length >= 2 && customers?.length > 0 && !selectedCustomer && (
            <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-100">
              {customers.map((c: any) => (
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
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 space-y-6">
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
                    onChange={e => setCredits(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 500"
                    className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Free Washes</label>
                  <input
                    type="number"
                    value={washes || ''}
                    onChange={e => setWashes(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 1"
                    className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Wax Treatments</label>
                  <input
                    type="number"
                    value={wax || ''}
                    onChange={e => setWax(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 1"
                    className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Internal Audit Note (Optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Reason for granting rewards (e.g. Goodwill gesture, VIP bonus)..."
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <button
                onClick={handleAward}
                disabled={updateMut.isPending}
                className="w-full h-12 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Sparkles size={16} />
                {updateMut.isPending ? 'Granting Benefits...' : 'Grant Loyalty Benefits'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-red-50 text-[#D32F2F] flex items-center justify-center mx-auto mb-3">
              <Gift size={28} />
            </div>
            <p className="text-slate-900 font-extrabold text-base">Select a Customer to Award</p>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              Type the customer's name or mobile number in the search bar above to look up their current rewards balance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
