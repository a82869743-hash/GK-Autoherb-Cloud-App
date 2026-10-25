import { useState } from 'react';
import { Home, Briefcase, MapPin, Crosshair, Loader2 } from 'lucide-react';
import { CustomerAddress, useSaveAddress } from '../../api/hooks/useCustomerApp';
import { getDeviceLiveLocation, reverseGeocodeCoords } from '../../utils/locationService';
import { useUIStore } from '../../store/uiStore';

const LABELS = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin },
] as const;

/** Blinkit-style address form with "use my current location". */
export default function AddressForm({
  initial,
  onSaved,
  submitLabel = 'Save address',
  makeDefault = false,
}: {
  initial?: Partial<CustomerAddress>;
  onSaved?: (addr: CustomerAddress) => void;
  submitLabel?: string;
  makeDefault?: boolean;
}) {
  const toast = useUIStore((s) => s.toast);
  const save = useSaveAddress();
  const [f, setF] = useState({
    label: (initial?.label || 'home') as 'home' | 'work' | 'other',
    label_name: initial?.label_name || '',
    house_no: initial?.house_no || '',
    area: initial?.area || (initial?.house_no ? '' : initial?.address || ''),
    landmark: initial?.landmark || '',
    city: initial?.city || '',
    state: initial?.state || 'Gujarat',
    pincode: initial?.pincode || '',
    latitude: initial?.latitude ?? '',
    longitude: initial?.longitude ?? '',
  });
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const pos = await getDeviceLiveLocation();
      setAccuracy(pos.accuracy ? Math.round(pos.accuracy) : null);
      const geo = await reverseGeocodeCoords(pos.lat, pos.lng);
      setF((p) => ({
        ...p,
        latitude: String(pos.lat),
        longitude: String(pos.lng),
        area: [geo.street, geo.area].filter(Boolean).join(', ') || p.area,
        landmark: geo.landmark || p.landmark,
        city: geo.city || p.city,
        state: geo.state || p.state,
        pincode: geo.pincode || p.pincode,
      }));
      toast('success', 'Location found — please add your flat / house number');
    } catch (err: any) {
      toast('error', err.message || 'Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await save.mutateAsync({
        id: initial?.id,
        ...f,
        address: [f.house_no, f.area].filter(Boolean).join(', '),
        latitude: f.latitude === '' ? undefined : f.latitude,
        longitude: f.longitude === '' ? undefined : f.longitude,
        ...(makeDefault ? { is_default: 1 } : {}),
      } as any);
      toast('success', 'Address saved');
      onSaved?.(res.data);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not save the address');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        className="w-full flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 text-left"
      >
        <span className="h-10 w-10 rounded-xl bg-white text-[#D32F2F] flex items-center justify-center shadow-app">
          {locating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
        </span>
        <span className="flex-1">
          <span className="block font-display font-bold text-[#C62828] text-sm">{locating ? 'Finding you…' : 'Use my current location'}</span>
          <span className="block text-xs text-slate-500">
            {f.latitude ? `Pinned${accuracy ? ` · accurate to ~${accuracy} m` : ''}` : 'Uses your phone GPS'}
          </span>
        </span>
      </button>

      <div>
        <span className="app-label">Save as</span>
        <div className="flex gap-2">
          {LABELS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('label', value)}
              className={`app-chip ${f.label === value ? 'app-chip-on' : 'app-chip-off'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {f.label === 'other' && (
          <input className="app-input mt-2" placeholder="Name this place (e.g. Mom's house)" value={f.label_name} onChange={(e) => set('label_name', e.target.value)} />
        )}
      </div>

      <div>
        <label className="app-label">Flat / House no. / Building *</label>
        <input className="app-input" required value={f.house_no} onChange={(e) => set('house_no', e.target.value)} placeholder="e.g. 402, Labh Icon" />
      </div>
      <div>
        <label className="app-label">Area / Street *</label>
        <input className="app-input" required value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Gotri Road" />
      </div>
      <div>
        <label className="app-label">Landmark</label>
        <input className="app-input" value={f.landmark} onChange={(e) => set('landmark', e.target.value)} placeholder="Near…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="app-label">City *</label>
          <input className="app-input" required value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Vadodara" />
        </div>
        <div>
          <label className="app-label">Pincode *</label>
          <input
            className="app-input"
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={f.pincode}
            onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
            placeholder="390021"
          />
        </div>
      </div>
      <button type="submit" disabled={save.isPending} className="app-btn-primary w-full">
        {save.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
        {submitLabel}
      </button>
    </form>
  );
}
