import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, CheckCircle2, Truck, Navigation, Clock, MapPin } from 'lucide-react';
import { useDelivery, useDeliveryLocation } from '../../api/hooks/useDeliveries';
import { useCustomerProfile } from '../../api/hooks/useCustomerApp';
import { usePublicSettings } from '../../api/hooks/useSettings';
import { useAuthStore } from '../../store/authStore';
import { createSocket } from '../../lib/socket';
import LiveMap from '../../components/customer/LiveMap';
import { AppPageHeader } from '../../components/customer/ui';
import { calculateHaversineDistance, estimateDriveMinutes, resolveStudioLocation } from '../../utils/locationService';

type Fix = { lat: number; lng: number; at: number };

function agoLabel(ts: number | null) {
  if (!ts) return 'waiting for GPS';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return 'live';
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
}

export default function TrackingPage() {
  const { id } = useParams();
  const token = useAuthStore((s) => s.token);
  const { data: delivery, isLoading, error, refetch } = useDelivery(Number(id));
  const { data: polled } = useDeliveryLocation(Number(id));
  const { data: profile } = useCustomerProfile();
  const { data: settingsRes } = usePublicSettings();
  const [fix, setFix] = useState<Fix | null>(null);
  const [trail, setTrail] = useState<Fix[]>([]);
  const [, tick] = useState(0);

  const pushFix = (lat: number, lng: number, at = Date.now()) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setFix((prev) => (prev && prev.at > at ? prev : { lat, lng, at }));
    setTrail((t) => (t.length && t[t.length - 1].lat === lat && t[t.length - 1].lng === lng ? t : [...t.slice(-200), { lat, lng, at }]));
  };

  // Polling fallback (every 5s) — also gives the last known point on open
  useEffect(() => {
    if (polled?.last_lat && polled?.last_lng) {
      pushFix(parseFloat(polled.last_lat), parseFloat(polled.last_lng), polled.location_updated_at ? new Date(polled.location_updated_at).getTime() : Date.now());
    }
  }, [polled?.last_lat, polled?.last_lng, polled?.location_updated_at]);

  // Real-time updates over socket.io
  useEffect(() => {
    if (!id || !token) return;
    const socket = createSocket(token);
    socket.on('connect', () => socket.emit('join_delivery', { deliveryId: Number(id) }));
    const onLoc = (loc: any) => loc && pushFix(parseFloat(loc.lat), parseFloat(loc.lng));
    socket.on('location_update', onLoc);
    socket.on('location', onLoc);
    socket.on('delivery_completed', () => refetch());
    return () => {
      socket.disconnect();
    };
  }, [id, token]);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const studio = useMemo(() => resolveStudioLocation(settingsRes?.data), [settingsRes]);
  const home = profile?.addresses?.find((a) => a.is_default) || profile?.addresses?.[0];
  const destination = home?.latitude && home?.longitude ? { lat: Number(home.latitude), lng: Number(home.longitude) } : null;
  const kmLeft = fix && destination ? calculateHaversineDistance(fix.lat, fix.lng, destination.lat, destination.lng) : null;

  if (isLoading) {
    return <div className="py-24 flex justify-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-[#D32F2F] animate-spin" /></div>;
  }
  if (error || !delivery) {
    return (
      <div>
        <AppPageHeader title="Track delivery" />
        <div className="app-card p-8 text-center mt-4">
          <Truck className="mx-auto text-slate-300" size={40} />
          <p className="font-display font-bold mt-3">Delivery not found</p>
          <p className="text-sm text-slate-500">This delivery may have finished or isn't linked to your account.</p>
        </div>
      </div>
    );
  }

  const delivered = delivery.status === 'delivered';

  return (
    <div className="-mx-4 min-h-[100dvh] flex flex-col">
      <div className="px-4">
        <AppPageHeader title={delivered ? 'Delivered' : 'Live delivery'} subtitle={`${delivery.brand} ${delivery.model} · ${delivery.registration_no}`} />
      </div>

      <div className="relative flex-1 min-h-[52dvh]">
        {delivered ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-50">
            <CheckCircle2 size={56} className="text-emerald-600" />
            <p className="font-display text-xl font-extrabold mt-3">Your car has been delivered</p>
            {delivery.delivered_at && <p className="text-sm text-slate-500 mt-1">{new Date(delivery.delivered_at).toLocaleString('en-IN')}</p>}
          </div>
        ) : (
          <>
            <LiveMap car={fix} destination={destination} studio={{ lat: studio.lat, lng: studio.lng }} trail={trail} className="absolute inset-0" />
            {!fix && (
              <div className="absolute inset-x-4 top-4 z-[500] app-card px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-[#D32F2F] animate-spin" />
                Waiting for the driver's GPS signal…
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-[600] -mt-6 rounded-t-3xl bg-white px-4 pt-5 pb-8 shadow-sheet">
        <div className="flex items-center gap-3">
          <span className={`h-12 w-12 rounded-2xl flex items-center justify-center ${delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-[#D32F2F] text-white'}`}>
            {delivered ? <CheckCircle2 size={24} /> : <Truck size={24} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg font-extrabold text-slate-900">{delivered ? 'Delivered' : 'On the way to you'}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${fix && Date.now() - fix.at < 60000 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              Location {agoLabel(fix?.at ?? null)}
            </p>
          </div>
        </div>

        {!delivered && kmLeft !== null && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500 flex items-center gap-1"><Navigation size={12} /> Distance</p>
              <p className="font-display text-lg font-extrabold">{kmLeft} km</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500 flex items-center gap-1"><Clock size={12} /> Arriving in</p>
              <p className="font-display text-lg font-extrabold">~{estimateDriveMinutes(kmLeft)} min</p>
            </div>
          </div>
        )}
        {!delivered && !destination && (
          <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5"><MapPin size={13} /> Pin your address (Profile → Saved addresses → use current location) to see distance & ETA.</p>
        )}

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
          <div className="h-10 w-10 rounded-full bg-slate-900 text-white font-display font-bold flex items-center justify-center">
            {(delivery.staff_name || 'D').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-slate-900 truncate">{delivery.staff_name}</p>
            <p className="text-xs text-slate-500">Your GK AutoHerb driver</p>
          </div>
          {delivery.staff_mobile && (
            <a href={`tel:${delivery.staff_mobile}`} className="h-11 w-11 rounded-full bg-emerald-500 text-white flex items-center justify-center" aria-label="Call driver">
              <Phone size={19} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
