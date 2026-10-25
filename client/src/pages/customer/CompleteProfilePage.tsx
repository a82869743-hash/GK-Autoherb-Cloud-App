import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Cake, Heart, CheckCircle2 } from 'lucide-react';
import { useCustomerProfile, useUpdateCustomerProfile } from '../../api/hooks/useCustomerApp';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import Avatar from '../../components/customer/Avatar';
import AddressForm from '../../components/customer/AddressForm';
import { GENDERS } from '../../components/customer/ProfileEditSheet';

const today = new Date().toISOString().slice(0, 10);

/** First-run setup: gender + one address are required; photo, birthday & anniversary are optional. */
export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { data: profile, isLoading, refetch } = useCustomerProfile();
  const save = useUpdateCustomerProfile();
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ name: '', gender: '', date_of_birth: '', anniversary_date: '' });

  useEffect(() => {
    if (profile) {
      setF({
        name: profile.name?.startsWith('Customer ') ? '' : profile.name || '',
        gender: profile.gender || '',
        date_of_birth: profile.date_of_birth || '',
        anniversary_date: profile.anniversary_date || '',
      });
      if (profile.gender && !profile.missing_fields.includes('gender')) setStep(2);
    }
  }, [profile?.id]);

  if (!isLoading && profile?.profile_complete) return <Navigate to="/customer" replace />;

  const saveStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('error', 'Please enter your name');
    if (!f.gender) return toast('error', 'Please select your gender');
    try {
      await save.mutateAsync({
        name: f.name.trim(),
        gender: f.gender as any,
        date_of_birth: f.date_of_birth || null,
        anniversary_date: f.anniversary_date || null,
      });
      updateUser({ name: f.name.trim() });
      if (profile?.addresses?.length) navigate('/customer', { replace: true });
      else setStep(2);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not save');
    }
  };

  return (
    <div className="pt-safe pb-6">
      <div className="pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          {[1, 2].map((s) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-[#D32F2F]' : 'bg-slate-200'}`} />
          ))}
        </div>
        <p className="text-[12px] font-bold uppercase tracking-wider text-[#D32F2F]">Step {step} of 2</p>
        <h1 className="font-display text-[26px] font-extrabold text-slate-900 leading-tight mt-1">
          {step === 1 ? 'Tell us about you' : 'Where should we find your car?'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {step === 1 ? 'Helps us personalise your service and send you birthday treats.' : 'We use this for pickup & drop and to show your distance from the studio.'}
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : step === 1 ? (
        <form onSubmit={saveStep1} className="app-card p-5 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={f.name || profile?.name} photo={profile?.profile_photo_url} editable size={72} />
            <p className="text-xs text-slate-500">Add a profile photo <span className="text-slate-400">(optional)</span></p>
          </div>
          <div>
            <label className="app-label">Your name *</label>
            <input className="app-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" required />
          </div>
          <div>
            <label className="app-label">Gender *</label>
            <div className="flex gap-2">
              {GENDERS.map((g) => (
                <button key={g.value} type="button" onClick={() => setF({ ...f, gender: g.value })} className={`app-chip flex-1 justify-center h-11 ${f.gender === g.value ? 'app-chip-on' : 'app-chip-off'}`}>
                  {f.gender === g.value && <CheckCircle2 size={15} />} {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="app-label flex items-center gap-1.5"><Cake size={14} className="text-[#D32F2F]" /> Birthday</label>
              <input type="date" max={today} className="app-input px-3" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} />
            </div>
            <div>
              <label className="app-label flex items-center gap-1.5"><Heart size={14} className="text-[#D32F2F]" /> Anniversary</label>
              <input type="date" max={today} className="app-input px-3" value={f.anniversary_date} onChange={(e) => setF({ ...f, anniversary_date: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-500 -mt-2">Birthday & anniversary are optional — you can add them later from your profile.</p>
          <button type="submit" disabled={save.isPending} className="app-btn-primary w-full">
            {save.isPending && <Loader2 size={16} className="animate-spin" />} Continue
          </button>
        </form>
      ) : (
        <div className="app-card p-5">
          <AddressForm
            makeDefault
            submitLabel="Save & continue"
            onSaved={async () => {
              await refetch();
              navigate('/customer', { replace: true });
            }}
          />
          <button onClick={() => setStep(1)} className="w-full mt-3 text-sm font-semibold text-slate-500">Back</button>
        </div>
      )}
    </div>
  );
}
