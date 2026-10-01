import { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle2, Clock, RefreshCw, User, Car, Phone, Navigation, Eye, Radio, ExternalLink } from 'lucide-react';
import api from '../../api/axiosInstance';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import { useToastStore } from '../../store/toastStore';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import { io } from 'socket.io-client';

interface Delivery {
  id: number;
  job_cart_id: number;
  vehicle_id: number;
  customer_id: number;
  staff_id: number;
  status: 'pending' | 'in_transit' | 'delivered';
  notes: string | null;
  address_from: string | null;
  address_to: string | null;
  last_lat: number | null;
  last_lng: number | null;
  location_updated_at: string | null;
  created_at: string;
  delivered_at: string | null;
  // Joined fields
  staff_name?: string;
  staff_mobile?: string;
  customer_name?: string;
  customer_mobile?: string;
  registration_no?: string;
  brand?: string;
  model?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending Dispatch', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: Clock },
  in_transit: { label: 'In Transit',       color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',         icon: Navigation },
  delivered:  { label: 'Delivered',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const { addToast } = useToastStore();
  const { token } = useAuthStore();

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/deliveries', { params });
      if (res.data?.success) {
        setDeliveries(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 15000);
    return () => clearInterval(interval);
  }, [filter]);

  // Handle Simulation Drive
  useEffect(() => {
    if (!isSimulating || !trackingId) return;

    let lat = liveLocation?.lat || 22.3072;
    let lng = liveLocation?.lng || 73.1812;

    const simInterval = setInterval(async () => {
      lat += (Math.random() * 0.0004 + 0.0002);
      lng += (Math.random() * 0.0004 + 0.0002);

      setLiveLocation({ lat, lng, timestamp: Date.now() });

      try {
        await api.patch(`/deliveries/${trackingId}/location`, { lat, lng });
      } catch (e) {
        console.error(e);
      }
    }, 3000);

    return () => clearInterval(simInterval);
  }, [isSimulating, trackingId, liveLocation?.lat, liveLocation?.lng]);

  // Handle Device Browser Geolocation
  useEffect(() => {
    if (!isBroadcastingGps || !trackingId) return;

    let watchId: number;
    if (navigator.geolocation) {
      addToast('success', 'Live Device GPS broadcasting enabled');
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLiveLocation({ lat, lng, timestamp: Date.now() });
          try {
            await api.patch(`/deliveries/${trackingId}/location`, { lat, lng });
          } catch (e) {
            console.error(e);
          }
        },
        (err) => {
          addToast('error', 'Device GPS error: ' + err.message);
          setIsBroadcastingGps(false);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      addToast('error', 'Browser does not support GPS Geolocation');
      setIsBroadcastingGps(false);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isBroadcastingGps, trackingId]);

  // Poll live location for tracked delivery and connect socket
  useEffect(() => {
    if (!trackingId) {
      setLiveLocation(null);
      setIsSimulating(false);
      setIsBroadcastingGps(false);
      return;
    }

    const fetchLocation = async () => {
      try {
        const res = await api.get(`/deliveries/${trackingId}/location`);
        if (res.data?.success && res.data.data) {
          const lat = parseFloat(res.data.data.last_lat) || 22.3072;
          const lng = parseFloat(res.data.data.last_lng) || 73.1812;
          setLiveLocation({
            lat,
            lng,
            timestamp: res.data.data.location_updated_at ? new Date(res.data.data.location_updated_at).getTime() : Date.now(),
          });
        }
      } catch (err) {
        console.error('Failed to fetch live location:', err);
      }
    };
    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);

    // Socket.io for real-time updates
    let socket: any = null;
    try {
      const socketUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
      socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });

      socket.on('connect', () => {
        socket.emit('join_delivery', { deliveryId: trackingId });
      });

      const handleLocationUpdate = (loc: any) => {
        if (!loc) return;
        const lat = parseFloat(loc.lat);
        const lng = parseFloat(loc.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          setLiveLocation({ lat, lng, timestamp: Date.now() });
        }
      };

      socket.on('location_update', handleLocationUpdate);
      socket.on('location', handleLocationUpdate);
    } catch (err) {
      console.error('Socket initialization failed:', err);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [trackingId, token]);

  const handleComplete = async (id: number) => {
    if (!confirm('Mark this vehicle delivery as completed?')) return;
    try {
      await api.patch(`/deliveries/${id}/complete`);
      addToast('success', 'Delivery marked as completed');
      fetchDeliveries();
    } catch {
      addToast('error', 'Failed to complete delivery');
    }
  };

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    in_transit: deliveries.filter(d => d.status === 'in_transit').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1400px] mx-auto">
      <AdminHeaderBar
        title="Deliveries & Dispatch"
        subtitle="Track live GPS telemetry and manage vehicle drop-off fulfillment"
        badge="Fleet Live"
        actions={
          <button
            onClick={fetchDeliveries}
            className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          title="Total Dispatches"
          value={stats.total}
          subtitle="All recorded drop-offs"
          icon={Truck}
          variant="red"
          trend="Overall volume"
        />
        <AdminMetricCard
          title="Pending Pickup"
          value={stats.pending}
          subtitle="Ready at workshop bay"
          icon={Clock}
          variant="amber"
          trend="Awaiting driver"
        />
        <AdminMetricCard
          title="In Transit"
          value={stats.in_transit}
          subtitle="Active on the road"
          icon={Navigation}
          variant="sky"
          trend={stats.in_transit > 0 ? "Live telemetry" : "No active runs"}
        />
        <AdminMetricCard
          title="Delivered"
          value={stats.delivered}
          subtitle="Safely handed over"
          icon={CheckCircle2}
          variant="emerald"
          trend="Completed successfully"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Shipments', count: stats.total },
          { key: 'pending', label: 'Pending Dispatch', count: stats.pending },
          { key: 'in_transit', label: 'In Transit', count: stats.in_transit },
          { key: 'delivered', label: 'Delivered', count: stats.delivered },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              filter === item.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{item.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              filter === item.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Live Map Drawer / Card */}
      {trackingId && (
        <div className="bg-white rounded-3xl border border-red-100 shadow-xl p-6 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center shadow-inner">
                <Radio size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Live Telemetry — Delivery #{trackingId}
                  </h3>
                  {isSimulating && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-200">
                      Simulation Mode
                    </span>
                  )}
                  {isBroadcastingGps && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider animate-pulse border border-emerald-200">
                      Device GPS Stream
                    </span>
                  )}
                </div>
                {liveLocation ? (
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Coordinates: {liveLocation.lat.toFixed(6)}, {liveLocation.lng.toFixed(6)}
                    {liveLocation.timestamp ? ` · Updated ${Math.max(0, Math.round((Date.now() - liveLocation.timestamp) / 1000))}s ago` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Acquiring GPS fix...</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setIsBroadcastingGps(!isBroadcastingGps);
                  if (!isBroadcastingGps) setIsSimulating(false);
                }}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  isBroadcastingGps 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Navigation size={13} />
                {isBroadcastingGps ? 'Stop GPS Broadcast' : 'Broadcast My GPS'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSimulating(!isSimulating);
                  if (!isSimulating) setIsBroadcastingGps(false);
                }}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  isSimulating 
                    ? 'bg-amber-600 text-white hover:bg-amber-700' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Truck size={13} />
                {isSimulating ? 'Halt Simulation' : 'Simulate Route Drive'}
              </button>

              <button
                type="button"
                onClick={() => setTrackingId(null)}
                className="h-9 px-3.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Close Telemetry
              </button>
            </div>
          </div>
          
          <div className="w-full h-80 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner">
            {liveLocation && !isNaN(liveLocation.lat) && !isNaN(liveLocation.lng) ? (
              <iframe 
                key={`${liveLocation.lat}-${liveLocation.lng}`}
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${liveLocation.lng - 0.005}%2C${liveLocation.lat - 0.005}%2C${liveLocation.lng + 0.005}%2C${liveLocation.lat + 0.005}&layer=mapnik&marker=${liveLocation.lat}%2C${liveLocation.lng}`} 
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400">
                <div className="text-center">
                  <Navigation size={28} className="mx-auto mb-2 opacity-50 animate-pulse text-[#D32F2F]" />
                  <p className="text-sm font-semibold text-slate-700">Connecting to telemetry network...</p>
                  <p className="text-xs text-slate-400 mt-0.5">Fetching realtime satellite triangulation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deliveries List Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-9 h-9 border-3 border-red-200 border-t-[#D32F2F] rounded-full animate-spin" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#D32F2F] mx-auto flex items-center justify-center mb-3">
            <Truck size={28} />
          </div>
          <p className="text-slate-900 text-base font-bold">No deliveries in this queue</p>
          <p className="text-slate-400 text-xs mt-1">Deliveries are automatically generated from active detailing job cards</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deliveries.map(del => {
            const config = STATUS_CONFIG[del.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;

            return (
              <div key={del.id} className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D32F2F] font-bold">
                        <Truck size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-900 font-extrabold text-sm">Delivery #{del.id}</span>
                        </div>
                        {del.job_cart_id && (
                          <span className="text-[11px] font-semibold text-[#D32F2F]">Job Card #{del.job_cart_id}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${config.bg} ${config.color} flex items-center gap-1`}>
                      <StatusIcon size={12} />
                      {config.label}
                    </span>
                  </div>

                  {/* Vehicle Details */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <VehicleBrandBadge brand={del.brand} model={del.model} />
                      {del.registration_no && (
                        <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          {del.registration_no}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  {del.customer_name && (
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span className="font-semibold text-slate-800">{del.customer_name}</span>
                      </div>
                      {del.customer_mobile && (
                        <a href={`tel:${del.customer_mobile}`} className="text-[#D32F2F] font-medium hover:underline flex items-center gap-1 text-[11px]">
                          <Phone size={11} /> {del.customer_mobile}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Staff Assignment */}
                  {del.staff_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 px-1">
                      <Car size={13} className="text-slate-400" />
                      <span>Driver: <strong className="text-slate-700">{del.staff_name}</strong></span>
                      {del.staff_mobile && <span className="text-slate-400">· {del.staff_mobile}</span>}
                    </div>
                  )}

                  {/* Address Section */}
                  {(del.address_from || del.address_to) && (
                    <div className="text-xs text-slate-600 mb-3 bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                      {del.address_from && (
                        <p className="line-clamp-1 text-[11px]">
                          <span className="font-bold text-slate-700">From:</span> {del.address_from}
                        </p>
                      )}
                      {del.address_to && (
                        <p className="line-clamp-1 text-[11px]">
                          <span className="font-bold text-slate-700">To:</span> {del.address_to}
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(del.address_to || del.address_from || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-[#D32F2F] hover:text-[#991b1b] inline-flex items-center gap-1 pt-1"
                      >
                        <ExternalLink size={11} /> Open in Google Maps
                      </a>
                    </div>
                  )}

                  {del.notes && (
                    <p className="text-xs text-slate-500 italic mb-3 line-clamp-2 px-1">
                      "{del.notes}"
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 mb-4 px-1">Created: {formatDate(del.created_at)}</p>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100">
                  {del.status === 'in_transit' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTrackingId(trackingId === del.id ? null : del.id)}
                        className={`flex-1 h-10 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
                          trackingId === del.id
                            ? 'bg-[#D32F2F] text-white shadow-md shadow-red-600/20'
                            : 'bg-red-50 text-[#b71c1c] hover:bg-red-100'
                        }`}
                      >
                        <Eye size={14} />
                        {trackingId === del.id ? 'Hide Map' : 'Track Live'}
                      </button>
                      <button
                        onClick={() => handleComplete(del.id)}
                        className="flex-1 h-10 bg-emerald-600 text-white text-xs font-bold rounded-2xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        Delivered
                      </button>
                    </div>
                  )}

                  {del.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTrackingId(trackingId === del.id ? null : del.id)}
                        className="flex-1 h-10 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Eye size={14} />
                        Inspect
                      </button>
                      <button
                        onClick={() => handleComplete(del.id)}
                        className="flex-1 h-10 bg-[#D32F2F] text-white text-xs font-bold rounded-2xl hover:bg-[#b71c1c] shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        Mark Done
                      </button>
                    </div>
                  )}

                  {del.status === 'delivered' && (
                    <div className="h-10 px-3 bg-emerald-50 rounded-2xl flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-bold border border-emerald-200">
                      <CheckCircle2 size={14} />
                      Delivered {del.delivered_at ? formatDate(del.delivered_at) : 'Successfully'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
