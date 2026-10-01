import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Building2, Receipt, Truck, CalendarCheck, Gift, Check, ShieldCheck } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../../api/hooks/useSettings';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useUIStore } from '../../store/uiStore';

export default function SettingsPage() {
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useSettings();
  const updateMut = useUpdateSettings();

  const [form, setForm] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<'all' | 'studio' | 'billing' | 'concierge' | 'booking' | 'rewards'>('all');

  useEffect(() => {
    if (data?.data) {
      setForm(data.data);
    }
  }, [data]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync(form);
      toast('success', 'Studio configuration updated successfully');
    } catch {
      toast('error', 'Failed to update studio configuration');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto p-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const sections = [
    { id: 'all', label: 'All Settings', icon: Settings },
    { id: 'studio', label: 'Studio Profile', icon: Building2 },
    { id: 'billing', label: 'Billing Defaults', icon: Receipt },
    { id: 'concierge', label: 'Concierge Rates', icon: Truck },
    { id: 'booking', label: 'Booking Policies', icon: CalendarCheck },
    { id: 'rewards', label: 'Loyalty & Referrals', icon: Gift },
  ];

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1200px] mx-auto">
      <AdminHeaderBar
        title="Studio & System Settings"
        subtitle="Global operational parameters, legal profile, booking policies, and customer incentives"
        badge="Core Configuration"
        actions={
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="h-10 px-5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save size={15} />
            {updateMut.isPending ? 'Saving...' : 'Save Configuration'}
          </button>
        }
      />

      {/* Navigation Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {sections.map(sec => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`h-10 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Notice Callout */}
      <div className="bg-red-50/70 border border-red-100 p-4 sm:p-5 rounded-3xl flex items-start gap-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-2xl bg-[#D32F2F] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-600/20">
          <ShieldCheck size={18} />
        </div>
        <div>
          <h4 className="font-extrabold text-slate-900 text-sm">Enterprise Synchronization</h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Updates to studio contact info, tax registration, and automated fee calculators immediately sync across customer mobile apps, generated invoices, and dispatch receipts.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Studio Info Section */}
        {(activeSection === 'all' || activeSection === 'studio') && (
          <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-bold">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Studio & Legal Identity</h3>
                <p className="text-xs text-slate-400">Official business name, contact info, and GST credentials</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Brand Name</label>
                <input
                  type="text"
                  value={form.studio_name || ''}
                  onChange={e => handleChange('studio_name', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. GK AutoHerb Studio"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">GST Identification (GSTIN)</label>
                <input
                  type="text"
                  value={form.studio_gst || ''}
                  onChange={e => handleChange('studio_gst', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all font-mono uppercase"
                  placeholder="e.g. 24AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Studio Phone</label>
                <input
                  type="text"
                  value={form.studio_mobile || ''}
                  onChange={e => handleChange('studio_mobile', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Support Email</label>
                <input
                  type="email"
                  value={form.studio_email || ''}
                  onChange={e => handleChange('studio_email', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. support@gkautoherb.com"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Physical Address</label>
                <input
                  type="text"
                  value={form.studio_address || ''}
                  onChange={e => handleChange('studio_address', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="Complete studio street address, City, State, PIN"
                />
              </div>
            </div>
          </section>
        )}

        {/* Operational Defaults Section */}
        {(activeSection === 'all' || activeSection === 'billing') && (
          <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-bold">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Billing & Operational Defaults</h3>
                <p className="text-xs text-slate-400">Invoice numbering schemas and stock reorder safeguards</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Invoice Prefix</label>
                <input
                  type="text"
                  value={form.invoice_prefix || ''}
                  onChange={e => handleChange('invoice_prefix', e.target.value)}
                  placeholder="e.g. GKA"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Next Invoice Counter</label>
                <input
                  type="number"
                  value={form.invoice_counter || ''}
                  onChange={e => handleChange('invoice_counter', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Advance Booking Window (Days Allowed)</label>
                <input
                  type="number"
                  value={form.booking_advance_days || ''}
                  onChange={e => handleChange('booking_advance_days', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. 30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Low Stock Threshold (Units)</label>
                <input
                  type="number"
                  value={form.low_stock_threshold || ''}
                  onChange={e => handleChange('low_stock_threshold', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. 5"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Admin WhatsApp (Automated System Alerts)</label>
                <input
                  type="text"
                  value={form.admin_whatsapp || ''}
                  onChange={e => handleChange('admin_whatsapp', e.target.value)}
                  placeholder="Include country code, e.g. 919876543210"
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all font-mono"
                />
              </div>
            </div>
          </section>
        )}

        {/* Pickup & Drop Settings Section */}
        {(activeSection === 'all' || activeSection === 'concierge') && (
          <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-bold">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Concierge Pickup & Drop Pricing</h3>
                <p className="text-xs text-slate-400">Automated conveyance surcharges for door-to-door vehicle intake</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Intake Pickup Charge (₹)</label>
                <input
                  type="number"
                  value={form.pickup_charge || ''}
                  onChange={e => handleChange('pickup_charge', e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Vehicle Return Drop Charge (₹)</label>
                <input
                  type="number"
                  value={form.drop_charge || ''}
                  onChange={e => handleChange('drop_charge', e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Roundtrip Combined (₹)</label>
                <input
                  type="number"
                  value={form.pickup_drop_charge || ''}
                  onChange={e => handleChange('pickup_drop_charge', e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>
            </div>
          </section>
        )}

        {/* Booking & Advance Payment Settings */}
        {(activeSection === 'all' || activeSection === 'booking') && (
          <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-bold">
                <CalendarCheck size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Studio Booking Policies & Deposit</h3>
                <p className="text-xs text-slate-400">Bay reservation restrictions and slot security deposits</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Emergency Pause Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Emergency Booking Pause</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Immediately freeze customer bookings across mobile apps and web portal.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('bookings_paused', form.bookings_paused === '1' ? '0' : '1')}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-200 flex items-center p-1 ${
                    form.bookings_paused === '1' ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 flex items-center justify-center text-[10px] font-bold ${
                      form.bookings_paused === '1' ? 'translate-x-6 text-rose-600' : 'translate-x-0 text-slate-400'
                    }`}
                  >
                    {form.bookings_paused === '1' ? '✕' : ''}
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Booking Advance Deposit Type</label>
                  <select 
                    value={form.advance_type || 'none'} 
                    onChange={e => handleChange('advance_type', e.target.value)}
                    className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
                  >
                    <option value="none">Disabled (No Advance Mandatory)</option>
                    <option value="fixed">Fixed Deposit (₹)</option>
                    <option value="percentage">Percentage of Service Cost (%)</option>
                  </select>
                </div>

                {form.advance_type && form.advance_type !== 'none' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {form.advance_type === 'fixed' ? 'Mandatory Advance Value (₹)' : 'Advance Proportion (%)'}
                    </label>
                    <input 
                      type="number" 
                      value={form.advance_value || ''} 
                      onChange={e => handleChange('advance_value', e.target.value)} 
                      placeholder={form.advance_type === 'fixed' ? 'e.g. 500' : 'e.g. 20'} 
                      className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Referrals & Welcome Rewards Section */}
        {(activeSection === 'all' || activeSection === 'rewards') && (
          <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-bold">
                <Gift size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Referrals & Onboarding Rewards</h3>
                <p className="text-xs text-slate-400">Automated points grants and discount vouchers for viral acquisition</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Referrer Bonus Points</label>
                <input 
                  type="number" 
                  value={form.referral_referrer_points || ''} 
                  onChange={e => handleChange('referral_referrer_points', e.target.value)} 
                  placeholder="Points awarded to referrer (e.g. 100)" 
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Invited Customer Welcome Discount (₹)</label>
                <input 
                  type="number" 
                  value={form.referral_new_customer_discount || ''} 
                  onChange={e => handleChange('referral_new_customer_discount', e.target.value)} 
                  placeholder="Welcome discount on first bill (e.g. 50)" 
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Customer Onboarding Incentive Type</label>
                <select 
                  value={form.welcome_reward_type || 'points'} 
                  onChange={e => handleChange('welcome_reward_type', e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
                >
                  <option value="points">Reward Points</option>
                  <option value="discount">Instant Bill Discount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Onboarding Reward Quantum</label>
                <input 
                  type="number" 
                  value={form.welcome_reward_value || ''} 
                  onChange={e => handleChange('welcome_reward_value', e.target.value)} 
                  placeholder="e.g. 500 points or ₹100 discount" 
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>
            </div>
          </section>
        )}

        {/* Desktop Save Action Footer */}
        <div className="hidden sm:flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="h-12 px-7 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save size={16} />
            {updateMut.isPending ? 'Saving All Settings...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Mobile Sticky Save Floating Dock */}
      <div className="sm:hidden fixed bottom-20 inset-x-3 z-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settings Manager</p>
          <p className="text-xs font-bold text-white">Save pending changes?</p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMut.isPending}
          className="h-9 px-4 bg-[#D32F2F] text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/30 flex items-center gap-1.5"
        >
          <Save size={14} />
          {updateMut.isPending ? 'Saving...' : 'Save All'}
        </button>
      </div>
    </div>
  );
}
