import { useEffect, useState } from 'react';
import { Loader2, Cake, Heart } from 'lucide-react';
import { BottomSheet } from './ui';
import { CustomerProfile, useUpdateCustomerProfile } from '../../api/hooks/useCustomerApp';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

const today = new Date().toISOString().slice(0, 10);

export default function ProfileEditSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile?: CustomerProfile }) {
  const toast = useUIStore((s) => s.toast);
  const updateUser = useAuthStore((s) => s.updateUser);
  const save = useUpdateCustomerProfile();
  const [f, setF] = useState({ name: '', email: '', gender: '', date_of_birth: '', anniversary_date: '' });

  useEffect(() => {
    if (open && profile) {
      setF({
        name: profile.name || '',
        email: profile.email || '',
        gender: profile.gender || '',
        date_of_birth: profile.date_of_birth || '',
        anniversary_date: profile.anniversary_date || '',
      });
    }
  }, [open, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.gender) return toast('error', 'Please select your gender');
    try {
      await save.mutateAsync({
        name: f.name,
        email: f.email || null,
        gender: f.gender as any,
        date_of_birth: f.date_of_birth || null,
        anniversary_date: f.anniversary_date || null,
      });
      updateUser({ name: f.name });
      toast('success', 'Profile updated');
      onClose();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not save');
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="app-label">Full name *</label>
          <input className="app-input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="app-label">Gender *</label>
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button key={g.value} type="button" onClick={() => setF({ ...f, gender: g.value })} className={`app-chip flex-1 justify-center ${f.gender === g.value ? 'app-chip-on' : 'app-chip-off'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="app-label">Email</label>
          <input className="app-input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="app-label flex items-center gap-1.5"><Cake size={14} className="text-[#D32F2F]" /> Birthday</label>
            <input className="app-input px-3" type="date" max={today} value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} />
          </div>
          <div>
            <label className="app-label flex items-center gap-1.5"><Heart size={14} className="text-[#D32F2F]" /> Anniversary</label>
            <input className="app-input px-3" type="date" max={today} value={f.anniversary_date} onChange={(e) => setF({ ...f, anniversary_date: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-slate-500 -mt-1">Optional — add them and we'll send you a special gift offer on your day.</p>
        <button type="submit" disabled={save.isPending} className="app-btn-primary w-full">
          {save.isPending && <Loader2 size={16} className="animate-spin" />} Save changes
        </button>
      </form>
    </BottomSheet>
  );
}
