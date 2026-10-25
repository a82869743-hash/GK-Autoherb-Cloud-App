import { useState } from 'react';
import { Send, UserPlus, Loader2 } from 'lucide-react';
import { useCreateInquiry } from '../../api/hooks/useInquiries';
import { useUIStore } from '../../store/uiStore';
import { OpsPageTitle } from '../../components/ops/ui';

const QUICK_SERVICES = ['Foam wash', 'Ceramic coating', 'PPF', 'Interior detailing', 'Rubbing & polish', 'Package'];

export default function StaffInquiryPage() {
  const toast = useUIStore((s) => s.toast);
  const createMut = useCreateInquiry();

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    vehicle_brand: '',
    vehicle_model: '',
    services_interested: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile) {
      toast('error', 'Name and Mobile number are required');
      return;
    }

    try {
      await createMut.mutateAsync({ ...form, source: 'staff' });
      toast('success', 'Walk-in inquiry recorded successfully');
      setForm({ name: '', mobile: '', email: '', vehicle_brand: '', vehicle_model: '', services_interested: '' });
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to submit inquiry');
    }
  };

  const addService = (s: string) => {
    const cur = form.services_interested.trim();
    if (cur.toLowerCase().includes(s.toLowerCase())) return;
    setForm({ ...form, services_interested: cur ? `${cur}, ${s}` : s });
  };

  return (
    <div className="space-y-5">
      <OpsPageTitle kicker="Walk-in lead" title="New inquiry" subtitle="Save visitors and callers so the team can follow up." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="app-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center"><UserPlus size={21} /></span>
            <p className="font-display font-extrabold text-slate-900">Customer</p>
          </div>
          <div>
            <label className="app-label">Name *</label>
            <input className="app-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div>
            <label className="app-label">Mobile number *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-slate-500">+91</span>
              <input
                className="app-input pl-14"
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10 digit number"
              />
            </div>
          </div>
          <div>
            <label className="app-label">Email (optional)</label>
            <input className="app-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>

        <div className="app-card p-4 space-y-4">
          <p className="font-display font-extrabold text-slate-900">Vehicle & interest</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="app-label">Brand</label>
              <input className="app-input" value={form.vehicle_brand} onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })} placeholder="Hyundai" />
            </div>
            <div>
              <label className="app-label">Model</label>
              <input className="app-input" value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} placeholder="i20" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_SERVICES.map((s) => (
              <button type="button" key={s} onClick={() => addService(s)} className="app-chip app-chip-off h-8 text-[12px]">+ {s}</button>
            ))}
          </div>
          <div>
            <label className="app-label">Services / notes</label>
            <textarea
              className="app-input h-24 py-3 resize-none"
              value={form.services_interested}
              onChange={(e) => setForm({ ...form, services_interested: e.target.value })}
              placeholder="E.g. wants a quotation for ceramic coating next week"
            />
          </div>
        </div>

        <button type="submit" disabled={createMut.isPending} className="app-btn-primary w-full">
          {createMut.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />} Save lead
        </button>
      </form>
    </div>
  );
}
