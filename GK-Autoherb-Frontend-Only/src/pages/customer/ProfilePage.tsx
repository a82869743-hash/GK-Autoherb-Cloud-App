import { useState } from 'react';
import { Save } from 'lucide-react';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useUpdateProfile } from '../../api/hooks/useAuth';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const toast = useUIStore(s => s.toast);
  const updateProfileMut = useUpdateProfile();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    address: '',
    opt_out_promotional: user?.opt_out_promotional === 1
  });

  const handleSave = async () => {
    try {
      await updateProfileMut.mutateAsync({ 
        name: form.name, 
        email: form.email, 
        address: form.address,
        opt_out_promotional: form.opt_out_promotional ? 1 : 0
      });
      if (user) {
        updateUser({ 
          name: form.name, 
          email: form.email,
          opt_out_promotional: form.opt_out_promotional ? 1 : 0
        });
      }
      toast('success', 'Profile updated successfully');
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to update profile');
    }
  };

  return (
    <>
      <AdminTopBar title="My Profile" subtitle="Manage your account details" />
      
      <div className="max-w-3xl">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#af101a] via-[#D32F2F] to-[#FF5252]/60" />
          
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#f6f3f2] to-[#ebe7e7] flex items-center justify-center text-[#D32F2F] text-3xl font-black shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D32F2F]/0 to-[#D32F2F]/5 group-hover:from-[#D32F2F]/5 group-hover:to-[#D32F2F]/10 transition-all" />
              <span className="relative z-10">{form.name ? form.name.charAt(0).toUpperCase() : 'U'}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1c1b1b] mb-1 tracking-tight">{form.name || 'User Profile'}</h2>
              <p className="text-[#5f5e5e] font-medium">{form.mobile}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-200">Customer</span>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Input 
                label="Full Name" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
              />
              <Input 
                label="Mobile Number" 
                value={form.mobile} 
                onChange={e => setForm({...form, mobile: e.target.value})} 
                disabled
              />
              <Input 
                label="Email Address" 
                type="email"
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
              />
              <Input 
                label="Address" 
                value={form.address} 
                onChange={e => setForm({...form, address: e.target.value})} 
              />
            </div>

            <div className="mb-8 border-t border-gray-100 pt-6">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Notification Preferences</h3>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={form.opt_out_promotional} 
                  onChange={e => setForm({...form, opt_out_promotional: e.target.checked})}
                  className="rounded text-[#D32F2F] focus:ring-[#D32F2F] border-gray-300 w-4 h-4 cursor-pointer mt-0.5"
                />
                <span className="text-sm font-medium text-[#1c1b1b] group-hover:text-gray-900 select-none">
                  Opt out of promotional alerts, reminders, and marketing campaigns (essential booking and service updates will still be sent)
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="submit" icon={<Save size={18} />} size="lg" loading={updateProfileMut.isPending}>Save Changes</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
