import { useState, useEffect } from 'react';
import { 
  Settings, Save, AlertCircle, Building2, Receipt, Truck, 
  CalendarCheck, Gift, Check, ShieldCheck, MapPin, Navigation, 
  ExternalLink, Crosshair, RefreshCw, Sparkles, Bell, Send, Users 
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '../../api/hooks/useSettings';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useUIStore } from '../../store/uiStore';
import { getDeviceLiveLocation } from '../../utils/locationService';
import api from '../../api/axiosInstance';
import Modal from '../../components/ui/Modal';

export default function SettingsPage() {
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useSettings();
  const updateMut = useUpdateSettings();

  const [form, setForm] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<'all' | 'studio' | 'billing' | 'concierge' | 'booking' | 'rewards' | 'automation'>('all');
  const [detectingGps, setDetectingGps] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ open: boolean; loading: boolean; candidates: any[] }>({ open: false, loading: false, candidates: [] });
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setForm({
        studio_name: 'GK AutoHerb Detailing Studio',
        studio_address: 'Gotri - Vasna - Bhayli Main Road, Vadodara, Gujarat 391410',
        studio_area: 'Gotri - Vasna - Bhayli Road, Vadodara',
        studio_mobile: '9408424541',
        studio_email: 'gaurav.itm2006@gmail.com',
        studio_gst: '24AKUPK0446L1ZT',
        invoice_prefix: 'GKA',
        admin_whatsapp: '919408424541',
        studio_lat: '22.3134',
        studio_lng: '73.1342',
        ...data.data,
      });
    }
  }, [data]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleDetectStudioGps = async () => {
    try {
      setDetectingGps(true);
      const coords = await getDeviceLiveLocation();
      setForm(prev => ({
        ...prev,
        studio_lat: coords.lat.toFixed(6),
        studio_lng: coords.lng.toFixed(6),
      }));
      toast('success', `Studio GPS coordinates captured: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } catch (err: any) {
      toast('error', err.message || 'Failed to capture GPS coordinates');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync(form);
      toast('success', 'Studio configuration updated successfully');
    } catch {
      toast('error', 'Failed to update studio configuration');
    }
  };

  const handlePreviewReminders = async () => {
    setPreviewModal({ open: true, loading: true, candidates: [] });
    try {
      const res = await api.get('/settings/reminders/preview');
      setPreviewModal({ open: true, loading: false, candidates: res.data.candidates || [] });
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to preview reminder candidates');
      setPreviewModal({ open: false, loading: false, candidates: [] });
    }
  };

  const handleSendRemindersNow = async () => {
    if (!window.confirm('Trigger service reminders now to all eligible customers via WhatsApp?')) return;
    setSendingReminders(true);
    try {
      const res = await api.post('/settings/reminders/send-now');
      toast('success', `Sent ${res.data.sentCount || 0} service reminders!`);
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to trigger service reminders');
    } finally {
      setSendingReminders(false);
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
    { id: 'automation', label: 'Automation & Reminders', icon: Sparkles },
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
                  placeholder="e.g. GK AutoHerb Detailing Studio"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">GST Identification (GSTIN)</label>
                <input
                  type="text"
                  value={form.studio_gst || ''}
                  onChange={e => handleChange('studio_gst', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all font-mono uppercase"
                  placeholder="e.g. 24AKUPK0446L1ZT"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Studio Phone</label>
                <input
                  type="text"
                  value={form.studio_mobile || ''}
                  onChange={e => handleChange('studio_mobile', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. 9408424541"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Support Email</label>
                <input
                  type="email"
                  value={form.studio_email || ''}
                  onChange={e => handleChange('studio_email', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. gaurav.itm2006@gmail.com"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Physical Address</label>
                <input
                  type="text"
                  value={form.studio_address || ''}
                  onChange={e => handleChange('studio_address', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="Gotri - Vasna - Bhayli Main Road, Vadodara, Gujarat 391410"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Corridor / Area Name</label>
                <input
                  type="text"
                  value={form.studio_area || ''}
                  onChange={e => handleChange('studio_area', e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  placeholder="e.g. Gotri - Vasna - Bhayli Road, Vadodara"
                />
              </div>

              {/* Live Geo Coordinates */}
              <div className="col-span-full bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#D32F2F]" />
                      Studio Live GPS Coordinates (Distance & Concierge Origin)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Used by customer dashboard and booking engine to dynamically calculate live driving distance and concierge pickup fees.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDetectStudioGps}
                      disabled={detectingGps}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Crosshair size={13} className={detectingGps ? 'animate-spin text-[#D32F2F]' : 'text-slate-500'} />
                      <span>{detectingGps ? 'Detecting...' : 'Detect Device GPS'}</span>
                    </button>
                    {form.studio_lat && form.studio_lng && (
                      <a
                        href={`https://www.google.com/maps?q=${form.studio_lat},${form.studio_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#D32F2F] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>Maps Pin</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={form.studio_lat || ''}
                      onChange={e => handleChange('studio_lat', e.target.value)}
                      placeholder="22.3134"
                      className="w-full h-10 px-3.5 text-xs font-mono font-medium border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={form.studio_lng || ''}
                      onChange={e => handleChange('studio_lng', e.target.value)}
                      placeholder="73.1342"
                      className="w-full h-10 px-3.5 text-xs font-mono font-medium border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                    />
                  </div>
                </div>
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

        {/* Automation & Service Reminders Section */}
        {(activeSection === 'all' || activeSection === 'automation') && (
          <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm transition-all space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Service Reminders & Studio Automation</h3>
                  <p className="text-xs text-slate-400">Automated WhatsApp retention alerts, Google Review funnel, and daily executive digests</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewReminders}
                  className="px-3.5 py-2 rounded-2xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Users size={13} />
                  <span>Preview Candidates</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendRemindersNow}
                  disabled={sendingReminders}
                  className="px-3.5 py-2 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold transition-all shadow-md shadow-red-600/20 flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{sendingReminders ? 'Sending...' : 'Send Reminders Now'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Automated Reminders Enabled</label>
                <select
                  value={form.service_reminders_enabled ?? '1'}
                  onChange={e => handleChange('service_reminders_enabled', e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
                >
                  <option value="1">Enabled (Daily Cron via WhatsApp)</option>
                  <option value="0">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Detailing Reminder Interval (Days)</label>
                <input
                  type="number"
                  value={form.service_reminder_interval_days || '90'}
                  onChange={e => handleChange('service_reminder_interval_days', e.target.value)}
                  placeholder="e.g. 90"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Wash Reminder Interval (Days)</label>
                <input
                  type="number"
                  value={form.service_reminder_wash_days || '30'}
                  onChange={e => handleChange('service_reminder_wash_days', e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin WhatsApp Alert Mobile</label>
                <input
                  type="text"
                  value={form.admin_whatsapp_number || '9408424541'}
                  onChange={e => handleChange('admin_whatsapp_number', e.target.value)}
                  placeholder="e.g. 9408424541"
                  className="w-full h-11 px-4 text-xs font-bold font-mono border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin 8:00 PM Daily Digest</label>
                <select
                  value={form.admin_daily_digest_enabled ?? '1'}
                  onChange={e => handleChange('admin_daily_digest_enabled', e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
                >
                  <option value="1">Enabled (Daily WhatsApp Summary)</option>
                  <option value="0">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Google Review Min Rating Threshold</label>
                <select
                  value={form.feedback_google_threshold || '4'}
                  onChange={e => handleChange('feedback_google_threshold', e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white"
                >
                  <option value="4">4 Stars and above (4★ & 5★)</option>
                  <option value="5">5 Stars only (5★)</option>
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Public Google Review Redirect URL</label>
                <input
                  type="url"
                  value={form.google_review_url || 'https://search.google.com/local/writereview?placeid=ChIJn8N3wS1wXzkR8W6_m4gq5uU'}
                  onChange={e => handleChange('google_review_url', e.target.value)}
                  placeholder="https://search.google.com/local/writereview?placeid=..."
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

      {/* Reminder Candidates Preview Modal */}
      <Modal
        open={previewModal.open}
        onClose={() => setPreviewModal(prev => ({ ...prev, open: false }))}
        title="Eligible Service Reminder Candidates"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Customers whose last job cart or booking exceeded their service interval ({form.service_reminder_interval_days || 90} days for detailing, {form.service_reminder_wash_days || 30} days for wash), and who haven't received a reminder in the last 14 days.
          </p>

          {previewModal.loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              Scanning customer database for reminder candidates...
            </div>
          ) : previewModal.candidates.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100">
              No customers currently due for service reminders (all recent visits are up to date or already reminded within 14 days).
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {previewModal.candidates.map((c: any, idx: number) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/70">
                  <div>
                    <p className="font-extrabold text-slate-900">{c.customer_name || 'Customer'}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {c.phone || c.customer_mobile} • {c.vehicle_model || c.vehicle_info || 'Vehicle'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                      {c.days_since_service} days since service
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Last: {c.last_service_date ? new Date(c.last_service_date).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              Total candidates: {previewModal.candidates.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              {previewModal.candidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewModal(prev => ({ ...prev, open: false }));
                    handleSendRemindersNow();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#D32F2F] hover:bg-[#b71c1c] rounded-xl shadow-xs"
                >
                  Trigger Reminders Now
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
