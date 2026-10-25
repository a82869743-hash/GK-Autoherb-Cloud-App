import { useEffect, useState } from 'react';
import { Navigation, MapPin, CheckCircle, Package, Truck, Phone } from 'lucide-react';
import { useDeliveries, useCompleteDelivery } from '../../api/hooks/useDeliveries';
import { useAuthStore } from '../../store/authStore';
import { OpsPageTitle, EmptyBlock, Skeleton } from '../../components/ops/ui';
import { useUIStore } from '../../store/uiStore';
import { createSocket } from '../../lib/socket';
import { watchDeviceLocation } from '../../utils/locationService';
import api from '../../api/axiosInstance';

export default function DeliveryPage() {
  const { token } = useAuthStore();
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useDeliveries({ status: 'in_transit' });
  const completeMut = useCompleteDelivery();
  
  const [socket, setSocket] = useState<any>(null);
  const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [gpsInfo, setGpsInfo] = useState<{ accuracy: number | null; sentAt: number | null; error?: string }>({ accuracy: null, sentAt: null });

  const activeDeliveries = data?.data || [];

  useEffect(() => {
    // Setup socket connection
    const newSocket = createSocket(token, { autoConnect: false });
    
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Broadcast this phone's GPS while the car is out for delivery
  useEffect(() => {
    if (!isBroadcasting || !activeDeliveryId || !socket) {
      if (socket?.connected) socket.disconnect();
      return;
    }
    if (!socket.connected) socket.connect();
    const join = () => socket.emit('join_delivery', { deliveryId: activeDeliveryId });
    join();
    socket.on('connect', join);

    // Keep the screen (and GPS) awake while delivering, where supported
    let wakeLock: any = null;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => (wakeLock = l)).catch(() => {});

    let lastRest = 0;
    const stop = watchDeviceLocation(
      async (fix) => {
        // Ignore very coarse network-based fixes; they jump around the map
        if ((fix.accuracy ?? 0) > 150) {
          setGpsInfo((g) => ({ ...g, accuracy: fix.accuracy ?? null, error: 'Weak GPS — move to open sky' }));
          return;
        }
        socket.emit('location_update', { deliveryId: activeDeliveryId, lat: fix.lat, lng: fix.lng });
        setGpsInfo({ accuracy: fix.accuracy ?? null, sentAt: Date.now() });
        // Persist every ~5s so customers who open the tracker later still see the latest point
        if (Date.now() - lastRest > 5000) {
          lastRest = Date.now();
          try {
            await api.patch(`/deliveries/${activeDeliveryId}/location`, { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, heading: fix.heading, speed: fix.speed });
          } catch (e) {
            console.error(e);
          }
        }
      },
      (message) => {
        setGpsInfo((g) => ({ ...g, error: message }));
        toast('error', `GPS: ${message}`);
      }
    );
    toast('success', 'Live GPS sharing started');

    return () => {
      stop();
      socket.off('connect', join);
      wakeLock?.release?.().catch(() => {});
    };
  }, [isBroadcasting, activeDeliveryId, socket]);

  const handleComplete = async (id: number) => {
    if (confirm('Are you sure you want to complete this delivery?')) {
      try {
        await completeMut.mutateAsync(id);
        toast('success', 'Delivery completed successfully');
        if (activeDeliveryId === id) {
          setIsBroadcasting(false);
          setActiveDeliveryId(null);
        }
      } catch {
        toast('error', 'Failed to complete delivery');
      }
    }
  };

  const toggleBroadcast = (id: number) => {
    if (activeDeliveryId === id && isBroadcasting) {
      setIsBroadcasting(false);
      setActiveDeliveryId(null);
    } else {
      setActiveDeliveryId(id);
      setIsBroadcasting(true);
    }
  };

  return (
    <div className="space-y-5">
      <OpsPageTitle kicker="On the road" title="Deliveries" subtitle={`${activeDeliveries.length} car${activeDeliveries.length === 1 ? '' : 's'} out for delivery`} />

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : !activeDeliveries.length ? (
        <EmptyBlock icon={<Package size={26} />} title="No active deliveries" text="You don't have any vehicles out for delivery right now." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {activeDeliveries.map((del: any) => {
            const live = isBroadcasting && activeDeliveryId === del.id;
            return (
              <div key={del.id} className={`app-card overflow-hidden ${live ? 'ring-2 ring-[#D32F2F]/40' : ''}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="h-11 w-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><Truck size={21} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-extrabold text-[17px] text-slate-900 truncate">{del.registration_no}</h3>
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">In transit</span>
                      </div>
                      <p className="text-[13px] text-slate-500 truncate">{del.brand} {del.model}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-[14px] text-slate-900 truncate">{del.customer_name}</p>
                      <p className="text-[12.5px] text-slate-500">{del.customer_mobile}</p>
                    </div>
                    {del.customer_mobile && (
                      <a href={`tel:${del.customer_mobile}`} className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center" aria-label="Call customer">
                        <Phone size={17} />
                      </a>
                    )}
                  </div>

                  {live && (
                    <p className="mt-3 text-[12.5px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${gpsInfo.sentAt && Date.now() - gpsInfo.sentAt < 30000 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                      {gpsInfo.error ? gpsInfo.error : gpsInfo.sentAt ? `Sharing live · accuracy ±${Math.round(gpsInfo.accuracy || 0)} m` : 'Getting GPS fix…'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
                  <button
                    onClick={() => toggleBroadcast(del.id)}
                    className={`app-btn h-11 ${live ? 'bg-red-50 text-[#D32F2F] border border-red-200' : 'bg-[#111] text-white'}`}
                  >
                    {live ? <MapPin size={16} className="animate-pulse" /> : <Navigation size={16} />}
                    {live ? 'Stop GPS' : 'Start GPS'}
                  </button>
                  <button onClick={() => handleComplete(del.id)} disabled={completeMut.isPending} className="app-btn h-11 bg-emerald-600 text-white">
                    <CheckCircle size={16} /> Delivered
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
