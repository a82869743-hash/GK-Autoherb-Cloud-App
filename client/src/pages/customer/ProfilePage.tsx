import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PushCard } from '../../components/shared/NotificationsInbox';
import {
  ChevronRight, CalendarDays, Car, Headphones, Share2, MapPin, ShieldCheck, ClipboardList, ShoppingBag,
  Package, Bell, LogOut, Gift, Cake, Heart, Pencil,
} from 'lucide-react';
import { useCustomerProfile, useMyWarranties, useUpdateCustomerProfile } from '../../api/hooks/useCustomerApp';
import { useLoyalty } from '../../api/hooks/useLoyalty';
import { usePublicSettings } from '../../api/hooks/useSettings';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/customer/Avatar';
import ProfileEditSheet from '../../components/customer/ProfileEditSheet';
import AddressSheet, { addressTitle, addressLine } from '../../components/customer/AddressSheet';
import { VehicleSheet } from '../../components/customer/VehicleSheet';
import { AppPageHeader, BottomSheet, Skeleton } from '../../components/customer/ui';

function fmtDay(d?: string | null) {
  if (!d) return null;
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data: profile, isLoading } = useCustomerProfile();
  const { data: loyalty } = useLoyalty('mine');
  const { data: warranties = [] } = useMyWarranties();
  const { data: settingsRes } = usePublicSettings();
  const updateProfile = useUpdateCustomerProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [vehOpen, setVehOpen] = useState(false);
  const [warrantyOpen, setWarrantyOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const studioPhone = String(settingsRes?.data?.studio_mobile || '9408424541').replace(/\D/g, '');
  const defaultAddress = profile?.addresses?.find((a) => a.is_default) || profile?.addresses?.[0];
  const activeWarranties = warranties.filter((w: any) => w.status === 'active');

  const rows = [
    { icon: MapPin, label: 'Saved addresses', sub: defaultAddress ? `${addressTitle(defaultAddress)} · ${addressLine(defaultAddress)}` : 'Add an address', onClick: () => setAddrOpen(true) },
    { icon: ShieldCheck, label: 'My warranties', sub: activeWarranties.length ? `${activeWarranties.length} active` : 'Coating & PPF warranties appear here', onClick: () => setWarrantyOpen(true) },
    { icon: ClipboardList, label: 'Service history & invoices', to: '/customer/job-carts' },
    { icon: ShoppingBag, label: 'Store orders', to: '/customer/products?tab=orders' },
    { icon: Package, label: 'Membership packages', to: '/customer/buy-packages' },
    { icon: Bell, label: 'Notifications', sub: 'WhatsApp updates & offers', onClick: () => setPrefsOpen(true) },
  ];

  return (
    <div>
      <AppPageHeader title="Profile" back={false} />

      {isLoading || !profile ? (
        <Skeleton className="h-44 mt-2" />
      ) : (
        <div className="app-card overflow-hidden mt-2">
          <div className="p-4 flex items-center gap-4 bg-gradient-to-br from-red-50/70 to-white">
            <Avatar name={profile.name} photo={profile.profile_photo_url} editable />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-extrabold text-slate-900 truncate">{profile.name}</p>
              <p className="text-sm text-slate-500">+91 {profile.mobile}</p>
              <button onClick={() => setEditOpen(true)} className="mt-1 text-[13px] font-bold text-[#D32F2F] flex items-center gap-1">
                <Pencil size={13} /> Edit profile
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 text-[12px]">
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-4 py-2.5 text-left">
              <Cake size={15} className="text-[#D32F2F]" />
              <span className="text-slate-600 truncate">{fmtDay(profile.date_of_birth) || 'Add birthday'}</span>
            </button>
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-4 py-2.5 text-left">
              <Heart size={15} className="text-[#D32F2F]" />
              <span className="text-slate-600 truncate">{fmtDay(profile.anniversary_date) || 'Add anniversary'}</span>
            </button>
          </div>
          <Link to="/customer/loyalty" className="flex items-center gap-3 bg-[#111] px-4 py-3 text-white">
            <Gift size={20} className="text-[#ff8a80]" />
            <span className="flex-1">
              <span className="block font-display font-extrabold">GK Rewards · {Math.floor(Number(loyalty?.points || 0))} pts</span>
              <span className="block text-xs text-white/60">10% back on every service</span>
            </span>
            <ChevronRight size={18} className="text-white/60" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5 mt-3">
        {[
          { icon: CalendarDays, label: 'My\nBookings', onClick: () => navigate('/customer/bookings') },
          { icon: Car, label: 'My\nVehicles', onClick: () => setVehOpen(true) },
          { icon: Headphones, label: 'Help &\nSupport', onClick: () => window.open(`https://wa.me/91${studioPhone.slice(-10)}`, '_blank') },
        ].map(({ icon: Icon, label, onClick }) => (
          <button key={label} onClick={onClick} className="app-card py-4 flex flex-col items-center gap-1.5">
            <Icon size={22} className="text-slate-800" />
            <span className="font-display text-[13px] font-bold text-slate-900 whitespace-pre-line leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>

      <Link to="/customer/loyalty?tab=refer" className="app-card mt-3 flex items-center gap-3 px-4 py-3.5">
        <Share2 size={20} className="text-slate-700" />
        <span className="flex-1">
          <span className="block font-display font-bold text-slate-900">Refer & Earn</span>
          <span className="block text-xs text-slate-500">Invite friends, both of you get points</span>
        </span>
        <ChevronRight size={18} className="text-slate-400" />
      </Link>

      <div className="app-card mt-3 divide-y divide-slate-100">
        {rows.map(({ icon: Icon, label, sub, to, onClick }) => {
          const inner = (
            <>
              <Icon size={19} className="text-slate-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-slate-900">{label}</span>
                {sub && <span className="block text-xs text-slate-500 truncate">{sub}</span>}
              </span>
              <ChevronRight size={18} className="text-slate-400" />
            </>
          );
          return to ? (
            <Link key={label} to={to} className="flex items-center gap-3 px-4 py-3.5">{inner}</Link>
          ) : (
            <button key={label} onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">{inner}</button>
          );
        })}
      </div>

      <button onClick={() => logout()} className="app-card mt-3 w-full flex items-center justify-center gap-2 py-3.5 font-display font-bold text-red-600">
        <LogOut size={18} /> Log out
      </button>
      <p className="text-center text-[11px] text-slate-400 mt-4">GK AutoHerb · Detailing Studio</p>

      <ProfileEditSheet open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
      <AddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} />
      <VehicleSheet open={vehOpen} onClose={() => setVehOpen(false)} />

      <BottomSheet open={warrantyOpen} onClose={() => setWarrantyOpen(false)} title="My warranties">
        {warranties.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No warranties yet. Ceramic coating, PPF and other protection services come with a warranty card here.</p>
        ) : (
          <div className="space-y-3">
            {warranties.map((w: any) => (
              <div key={w.id} className={`rounded-2xl border p-4 ${w.status === 'active' ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 opacity-70'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-bold text-slate-900">{w.service_name}</p>
                  <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${w.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{w.status}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{[w.brand, w.model, w.registration_no].filter(Boolean).join(' · ')}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-700">{w.warranty_code}</span>
                  <span className="text-slate-600">Valid till {new Date(`${w.end_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} title="Notifications">
        <div className="mb-3"><PushCard /></div>
        {profile && (
          <div className="space-y-2 pb-2">
            {[
              { key: 'whatsapp_opt_in', label: 'Booking & service updates on WhatsApp', sub: 'Confirmations, reminders, live status', value: profile.whatsapp_opt_in !== 0 },
              { key: 'opt_out_promotional', label: 'Offers, birthday gifts & reminders', sub: 'Occasional deals from the studio', value: profile.opt_out_promotional !== 1, invert: true },
            ].map((p) => (
              <label key={p.key} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{p.label}</span>
                  <span className="block text-xs text-slate-500">{p.sub}</span>
                </span>
                <input
                  type="checkbox"
                  checked={p.value}
                  onChange={(e) => updateProfile.mutate({ [p.key]: p.invert ? (e.target.checked ? 0 : 1) : e.target.checked ? 1 : 0 } as any)}
                  className="h-5 w-5 rounded text-[#D32F2F] focus:ring-[#D32F2F]"
                />
              </label>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
