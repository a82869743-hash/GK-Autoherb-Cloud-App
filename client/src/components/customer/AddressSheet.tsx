import { useState } from 'react';
import { Home, Briefcase, MapPin, Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { BottomSheet } from './ui';
import AddressForm from './AddressForm';
import { CustomerAddress, useCustomerProfile, useDeleteAddress, useSetDefaultAddress } from '../../api/hooks/useCustomerApp';
import { useUIStore } from '../../store/uiStore';

export function addressTitle(a?: Partial<CustomerAddress> | null) {
  if (!a) return 'Add address';
  if (a.label === 'other') return a.label_name || 'Other';
  return a.label === 'work' ? 'Work' : 'Home';
}

export function addressLine(a?: Partial<CustomerAddress> | null) {
  if (!a) return 'Tap to add where we should pick up your car';
  return [a.address || [a.house_no, a.area].filter(Boolean).join(', '), a.city].filter(Boolean).join(', ');
}

export const AddressIcon = ({ label, size = 18 }: { label?: string; size?: number }) =>
  label === 'work' ? <Briefcase size={size} /> : label === 'other' ? <MapPin size={size} /> : <Home size={size} />;

/** Pick / add / edit saved addresses (Blinkit style). */
export default function AddressSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useUIStore((s) => s.toast);
  const { data: profile } = useCustomerProfile(open);
  const setDefault = useSetDefaultAddress();
  const del = useDeleteAddress();
  const [editing, setEditing] = useState<Partial<CustomerAddress> | null>(null);
  const addresses = profile?.addresses || [];

  const close = () => {
    setEditing(null);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title={editing ? (editing.id ? 'Edit address' : 'Add new address') : 'Select address'}>
      {editing ? (
        <AddressForm initial={editing} onSaved={() => setEditing(null)} makeDefault={!editing.id && addresses.length === 0} />
      ) : (
        <div className="space-y-3">
          <button onClick={() => setEditing({})} className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-3.5 text-left">
            <span className="h-9 w-9 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center"><Plus size={18} /></span>
            <span className="font-display font-bold text-[#C62828]">Add new address</span>
          </button>

          {addresses.length > 0 && <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-1">Saved addresses</p>}
          {addresses.map((a) => (
            <div key={a.id} className={`rounded-2xl border px-4 py-3.5 flex gap-3 ${a.is_default ? 'border-[#111] bg-slate-50' : 'border-slate-200'}`}>
              <button
                className="flex-1 flex gap-3 text-left"
                onClick={async () => {
                  if (!a.is_default) {
                    await setDefault.mutateAsync(a.id);
                    toast('success', `Using ${addressTitle(a)} address`);
                  }
                  close();
                }}
              >
                <span className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <AddressIcon label={a.label} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-display font-bold text-slate-900">
                    {addressTitle(a)}
                    {!!a.is_default && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5"><Check size={11} /> Selected</span>}
                  </span>
                  <span className="block text-[13px] text-slate-500 leading-snug mt-0.5">{addressLine(a)}{a.pincode ? ` - ${a.pincode}` : ''}</span>
                </span>
              </button>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(a)} className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center" aria-label="Edit address"><Pencil size={15} /></button>
                {addresses.length > 1 && (
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this address?')) return;
                      try { await del.mutateAsync(a.id); } catch (err: any) { toast('error', err?.response?.data?.error || 'Could not delete'); }
                    }}
                    className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center"
                    aria-label="Delete address"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
