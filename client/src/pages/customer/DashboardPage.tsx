import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, Clock, Car, Sparkles, Gift, ArrowRight, ChevronRight,
  Shield, CalendarCheck, Wrench, Plus, Package, ChevronLeft,
  CheckCircle2, Award, Zap, Truck, Navigation, Bot, ArrowUpDown,
  Droplets, Layers, MapPin, RotateCw, ExternalLink, Crosshair
} from 'lucide-react';
import { useCustomerDashboard } from '../../api/hooks/useDashboard';
import { useServices } from '../../api/hooks/useServices';
import { usePublicSettings } from '../../api/hooks/useSettings';
import { matchesServiceCategory } from './ServicesPage';
import { useAuthStore } from '../../store/authStore';
import ErrorState from '../../components/shared/ErrorState';
import { formatDate, formatTime, formatINR } from '../../utils/formatters';
import AddCarModal from '../../components/shared/AddCarModal';
import { useCarImage, getSafeCarImage, getStudioFallback, markCarImageFailed } from '../../utils/carImageService';
import { getCategoryForModel } from '../../utils/carData';
import { 
  getDeviceLiveLocation, 
  reverseGeocodeCoords, 
  calculateHaversineDistance, 
  estimateDriveMinutes, 
  getRouteUrlToStudio, 
  resolveStudioLocation, 
  LocationCoordinates 
} from '../../utils/locationService';

function computeJobTimeline(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'delivered' || s === 'completed' || s === 'complete') {
    return [
      { label: 'Check-In', done: true },
      { label: 'Wash & Prep', done: true },
      { label: 'Detailing', done: true },
      { label: 'Delivered', done: true },
    ];
  }
  if (s === 'ready' || s === 'qc') {
    return [
      { label: 'Check-In', done: true },
      { label: 'Wash & Prep', done: true },
      { label: 'Detailing', done: true },
      { label: 'Ready / QC', active: true },
    ];
  }
  if (s === 'in_progress' || s === 'washing' || s === 'repairing') {
    return [
      { label: 'Check-In', done: true },
      { label: 'Wash & Prep', done: true },
      { label: 'Detailing Bay', active: true },
      { label: 'Quality Check', done: false },
    ];
  }
  return [
    { label: 'Check-In', done: true },
    { label: 'Wash Bay Intake', active: true },
    { label: 'Detailing Bay', done: false },
    { label: 'Quality Check', done: false },
  ];
}

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data, isLoading, isError, refetch } = useCustomerDashboard();
  
  const [showAddCar, setShowAddCar] = useState(false);
  const [selectedCarIndex, setSelectedCarIndex] = useState(0);

  const firstName = user?.name?.split(' ')[0] || 'Member';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const loyalty = data?.loyalty || { credits: 0, free_washes: 0, wax_count: 0 };
  const vehicles = data?.vehicles || [];
  const upcomingBookings = data?.upcoming_bookings || [];
  const recentJobs = data?.recent_jobs || [];
  const totalVisits = data?.total_visits || 0;
  const activePackage = data?.active_package || null;
  const rawActivePackages = data?.active_packages || (activePackage ? [activePackage] : []);

  const { data: servicesRes } = useServices({ active_only: true });
  const servicesList: any[] = servicesRes?.data || [];

  const allCount = servicesList.length;
  const washCount = servicesList.filter((s: any) => matchesServiceCategory(s, 'washing')).length;
  const ppfCount = servicesList.filter((s: any) => matchesServiceCategory(s, 'coating_ppf')).length;
  const generalCount = servicesList.filter((s: any) => matchesServiceCategory(s, 'general')).length;
  
  // Deduplicate active packages so identical memberships are never shown multiple times
  const activePackages = useMemo(() => {
    const seen = new Set();
    const result: any[] = [];
    for (const p of rawActivePackages) {
      const key = `${p.package_id || p.id}_${p.package_name || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(p);
      }
    }
    return result;
  }, [rawActivePackages]);

  const [selectedActivePkgIndex, setSelectedActivePkgIndex] = useState(0);
  const currentActivePkg = activePackages[selectedActivePkgIndex] || activePackages[0] || null;

  // Dynamic Studio Location from settings (not hardcoded)
  const { data: publicSettingsRes } = usePublicSettings();
  const studioInfo = useMemo(() => resolveStudioLocation(publicSettingsRes?.data), [publicSettingsRes]);

  // Dynamic Live GPS Detection for Customer
  const [customerCoords, setCustomerCoords] = useState<LocationCoordinates | null>(null);
  const [customerArea, setCustomerArea] = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'denied'>('idle');

  const fetchLiveGps = async () => {
    setGpsLoading(true);
    setGpsStatus('locating');
    try {
      const coords = await getDeviceLiveLocation();
      setCustomerCoords(coords);
      setGpsStatus('success');
      try {
        const geo = await reverseGeocodeCoords(coords.lat, coords.lng);
        setCustomerArea(geo.area || geo.street || geo.city || 'Vadodara Area');
      } catch {
        setCustomerArea('Live GPS Location');
      }
    } catch (err: any) {
      console.warn('Live location error:', err);
      setGpsStatus(err?.message?.includes('denied') ? 'denied' : 'idle');
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveGps();
  }, []);

  const liveDistanceKm = useMemo(() => {
    if (!customerCoords) return null;
    return calculateHaversineDistance(
      customerCoords.lat,
      customerCoords.lng,
      studioInfo.lat,
      studioInfo.lng
    );
  }, [customerCoords, studioInfo]);

  const liveDriveMinutes = useMemo(() => {
    if (liveDistanceKm === null) return null;
    return estimateDriveMinutes(liveDistanceKm);
  }, [liveDistanceKm]);

  // Showcase vehicles (user's vehicles or curated studio cars)
  const displayCars = vehicles.length > 0 ? vehicles : [
    {
      id: 'demo-1',
      brand: 'BMW',
      model: '7-Series',
      registration_no: 'GJ 06 BK 7777',
      car_year: 2025,
      is_demo: true,
    },
    {
      id: 'demo-2',
      brand: 'Porsche',
      model: '911 Carrera GT3',
      registration_no: 'DL 01 AB 9911',
      car_year: 2024,
      is_demo: true,
    },
    {
      id: 'demo-3',
      brand: 'Range Rover',
      model: 'Autobiography',
      registration_no: 'MH 04 RR 0007',
      car_year: 2025,
      is_demo: true,
    }
  ];

  const currentCar = displayCars[selectedCarIndex % displayCars.length];
  const { imageUrl: realCarPhoto } = useCarImage(currentCar?.brand, currentCar?.model);

  if (isError) {
    return (
      <div className="pt-4">
        <ErrorState
          message="Failed to load dashboard. Please check your connection and try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pt-2 space-y-5">
        <div className="skeleton h-56 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-44 rounded-3xl" />
      </div>
    );
  }

  // Helper to pick verified real car photo or guaranteed studio fallback
  const getCarImage = (car: any) => {
    return getSafeCarImage(car?.brand, car?.model);
  };

  const handlePrevCar = () => {
    setSelectedCarIndex(prev => (prev === 0 ? displayCars.length - 1 : prev - 1));
  };

  const handleNextCar = () => {
    setSelectedCarIndex(prev => (prev + 1) % displayCars.length);
  };

  // Find active job in progress
  const activeJob = recentJobs.find((j: any) => j.status === 'open' || j.status === 'in_progress' || j.status === 'draft');
  const nextBooking = upcomingBookings[0];

  return (
    <div className="space-y-6 pt-1 text-slate-900">
      {/* ── Sub-header / Dynamic Live Location & Studio Status Deck ───────────── */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        
        {/* Left: Dynamic Live Location Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Pulse Indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${gpsStatus === 'success' ? 'bg-emerald-500 animate-pulse' : gpsLoading ? 'bg-amber-400 animate-ping' : 'bg-slate-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {gpsStatus === 'success' ? 'Live GPS Active' : gpsLoading ? 'Locating...' : 'Location'}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-200 hidden sm:block" />

          {/* User Location / Distance or Studio Info */}
          {customerCoords && liveDistanceKm !== null ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <MapPin size={12} className="text-[#D32F2F]" />
                <span>{customerArea || 'Your Location'}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#D32F2F] font-bold text-[11px] border border-red-100 flex items-center gap-1">
                <span>{liveDistanceKm} km from Studio</span>
                {liveDriveMinutes ? <span className="text-slate-500 font-medium">({liveDriveMinutes}m drive)</span> : null}
              </span>
              <a
                href={getRouteUrlToStudio(customerCoords.lat, customerCoords.lng, studioInfo.lat, studioInfo.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 ml-1"
                title="Get driving directions in Google Maps"
              >
                <span>Directions</span>
                <Navigation size={10} />
              </a>
            </div>
          ) : gpsLoading ? (
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <RotateCw size={11} className="animate-spin text-[#D32F2F]" />
              Detecting device live GPS...
            </span>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-600 font-medium">
                Studio: <span className="font-bold text-slate-800">{studioInfo.area || 'Gotri - Vasna - Bhayli Road'}</span>
              </span>
              <button
                type="button"
                onClick={fetchLiveGps}
                className="text-[11px] font-bold text-[#D32F2F] hover:text-[#b71c1c] bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Crosshair size={11} />
                <span>Fetch Live Location</span>
              </button>
            </div>
          )}

          {/* Refresh GPS Button */}
          {customerCoords && (
            <button
              type="button"
              onClick={fetchLiveGps}
              disabled={gpsLoading}
              title="Refresh live device coordinates"
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
            >
              <RotateCw size={11} className={gpsLoading ? 'animate-spin text-[#D32F2F]' : ''} />
            </button>
          )}
        </div>

        {/* Right: Studio Pin & Garage Link */}
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <a
            href={`https://www.google.com/maps?q=${studioInfo.lat},${studioInfo.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
            title="Open Studio Location in Google Maps"
          >
            <span>GK Studio ({studioInfo.city})</span>
            <ExternalLink size={10} className="text-slate-400" />
          </a>

          <div className="h-3 w-px bg-slate-200" />

          <Link 
            to="/customer/vehicles" 
            className="text-slate-600 hover:text-slate-900 flex items-center gap-1 font-bold text-[11px] transition-colors"
          >
            <span>Garage ({vehicles.length})</span>
            <ChevronRight size={12} className="text-red-500" />
          </Link>
        </div>
      </div>

      {/* ── 50% OFF First Wash Promo Ribbon ─────────── */}
      {data?.first_wash_eligible && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 p-4 sm:p-5 text-white shadow-[0_10px_25px_rgba(211,47,47,0.25)] group">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-200 shrink-0 shadow-inner">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-400 text-red-950 text-[9px] font-black uppercase tracking-wider rounded-md">
                    Special Welcome Offer
                  </span>
                  <span className="text-[10px] text-red-100 font-bold uppercase tracking-wider">Limited Period</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-tight">
                  Get 50% OFF Your First Detailing Wash! 🎉
                </h3>
              </div>
            </div>
            <Link
              to="/customer/bookings/new"
              className="px-4 py-2.5 bg-white hover:bg-amber-50 text-red-700 font-black text-xs rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-1.5 shrink-0 self-end sm:self-center"
            >
              <span>Claim 50% OFF</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          {/* Subtle decoration */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        </div>
      )}

      {/* ── Active Delivery Live Tracking Banner ─────────────── */}
      {data?.active_delivery && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-5 text-white shadow-xl border border-red-500/30 group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
                <Truck size={24} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-black uppercase tracking-wider rounded-md inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    Out For Delivery
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold">
                    {data.active_delivery.registration_no}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-tight">
                  Your vehicle is on the way!
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Driver: <strong className="text-white">{data.active_delivery.driver_name}</strong>
                  {data.active_delivery.driver_mobile && ` (${data.active_delivery.driver_mobile})`}
                  {data.active_delivery.destination_address && ` • To: ${data.active_delivery.destination_address}`}
                </p>
              </div>
            </div>

            <Link
              to={`/customer/delivery/${data.active_delivery.id}`}
              className="px-4 py-2.5 bg-gradient-to-r from-[#D32F2F] to-[#b71c1c] hover:from-[#b71c1c] hover:to-[#8b0000] text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-105 flex items-center gap-2 shrink-0 self-stretch sm:self-center justify-center"
            >
              <Navigation size={14} />
              <span>Track Live Delivery</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Live Active Status Tracker ── */}
      {activeJob ? (
        <div className="bg-white rounded-3xl p-5 border border-red-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-red-600">Live Service Status</span>
                <h4 className="text-sm font-extrabold text-slate-900 leading-none mt-0.5">
                  Detailing In Progress ({activeJob.brand} {activeJob.model})
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[9px] font-black uppercase tracking-wider rounded-lg">
              Visit #{activeJob.visit_number || '1'}
            </span>
          </div>

          {/* Service Stage Timeline */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            {computeJobTimeline(activeJob.status).map((step, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`w-full h-1.5 rounded-full mb-1.5 ${
                  step.done ? 'bg-emerald-500' : step.active ? 'bg-amber-500 animate-pulse' : 'bg-slate-200'
                }`} />
                <span className={`text-[9px] font-bold tracking-tight ${
                  step.done ? 'text-emerald-600' : step.active ? 'text-amber-700 font-black' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Plate: <strong className="text-slate-800">{activeJob.registration_no || 'In Bay'}</strong>
            </span>
            <Link
              to="/customer/job-carts"
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 uppercase tracking-wider"
            >
              <span>View Job Sheet</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      ) : nextBooking ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CalendarCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Next Scheduled Visit</span>
                <span className="text-[10px] text-slate-400">• {nextBooking.status}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {nextBooking.service_name || 'Vehicle Detailing'} — {formatDate(nextBooking.slot_date)}
              </p>
            </div>
          </div>
          <Link
            to="/customer/bookings"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0"
          >
            <span>Details</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      ) : null}

      {/* ── GK Studio AI Concierge Compact Quick-Launcher ── */}
      <div className="bg-gradient-to-r from-red-50/70 via-white to-white rounded-2xl p-3.5 sm:p-4 border border-red-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-500/20">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">GK Studio AI Concierge</h4>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                24/7 Live AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Ask about rates, vehicle bay tracking, ceramic coating, or packages
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('gk-open-chatbot'))}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#D32F2F] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer shrink-0"
        >
          <Sparkles size={13} className="text-amber-400" />
          <span>Ask AI Concierge</span>
        </button>
      </div>

      {/* ── Vehicle Hero Showcase Carousel (Clean Light Studio Mode) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group">
        {/* Top Car Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600">Active Vehicle</span>
              {currentCar?.car_year && (
                <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-600">
                  {currentCar.car_year}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight mt-0.5">
              {currentCar?.model || 'Studio Vehicle'}
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-normal mt-0.5">
              {currentCar?.brand || 'Luxury Automotive'} {currentCar?.registration_no ? `• ${currentCar.registration_no}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Car Button */}
            <button
              onClick={() => setShowAddCar(true)}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5"
              title="Add New Vehicle"
            >
              <Plus size={16} className="text-red-600" />
              <span className="text-xs font-bold hidden sm:inline">Add Car</span>
            </button>
          </div>
        </div>

        {/* Big Car Cutout Display with Studio Lighting & Reflection */}
        <div className="relative mt-2 sm:mt-4 flex items-center justify-center min-h-[190px] sm:min-h-[260px]">
          {/* Soft ambient ground shadow for clean light studio */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-100/80 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />
          
          <img
            key={currentCar?.id || `${currentCar?.brand}-${currentCar?.model}-${selectedCarIndex}`}
            src={realCarPhoto || getCarImage(currentCar)}
            alt={`${currentCar?.brand || ''} ${currentCar?.model || 'Vehicle'}`}
            onError={(e) => {
              // Guaranteed graceful switch to local studio category photo without retry loop
              const target = e.target as HTMLImageElement;
              markCarImageFailed(target.src);
              target.src = getStudioFallback(currentCar?.brand, currentCar?.model);
            }}
            className="relative z-10 w-full max-w-lg max-h-[220px] sm:max-h-[270px] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.12)] animate-scale-in select-none pointer-events-none rounded-2xl transition-all duration-300"
          />

          {/* Carousel Prev/Next Glass Controls */}
          {displayCars.length > 1 && (
            <>
              <button
                onClick={handlePrevCar}
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center transition-transform active:scale-90"
                aria-label="Previous Car"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextCar}
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center transition-transform active:scale-90"
                aria-label="Next Car"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Carousel Pagination Dots & Quick Actions Bar */}
        <div className="relative z-10 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {displayCars.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedCarIndex(idx)}
                className={`transition-all rounded-full ${
                  idx === selectedCarIndex % displayCars.length
                    ? 'w-6 h-1.5 bg-[#D32F2F] shadow-sm'
                    : 'w-2 h-1.5 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/customer/bookings/new?vehicle_id=${currentCar?.id || ''}`)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <CalendarCheck size={13} />
              <span>Book For This Car</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── GK Detailing Services Bento Cards (All Services, Wash Services, PPF & Coating, General Services) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group">
        {/* Services Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D32F2F] flex items-center gap-1">
                <Sparkles size={11} className="text-[#D32F2F]" />
                GK Detailing Menu
              </span>
              <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-900 text-[9px] font-black uppercase tracking-wider rounded-md">
                Certified Quality
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
              Studio Detailing Services
            </h3>
          </div>
          <Link
            to="/customer/services?category=all"
            className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition-all"
          >
            <span>All Services</span>
            <ChevronRight size={14} className="text-red-500" />
          </Link>
        </div>

        {/* 4 Bento Service Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 relative z-10">
          {/* Card 1: All Services */}
          <Link
            to="/customer/services?category=all"
            className="bg-gradient-to-br from-red-500/[0.04] via-transparent to-transparent rounded-xl p-3.5 sm:p-4 border border-red-200/60 hover:border-red-400 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all flex flex-col justify-between group/metric cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-red-800">All Services</span>
                <div className="w-7 h-7 rounded-lg bg-red-100 border border-red-200 text-[#D32F2F] flex items-center justify-center shadow-2xs group-hover/metric:scale-105 transition-transform">
                  <Layers size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-[22px] font-semibold text-slate-900 tracking-tight tabular-nums">
                  {allCount || 18}
                </span>
                <span className="text-[11px] text-red-700 font-medium uppercase">Available</span>
              </div>
            </div>
            
            <div className="mt-2.5">
              <div className="w-full bg-red-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#af101a] to-[#D32F2F] rounded-full transition-all duration-500" 
                  style={{ width: '100%' }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center justify-between">
                <span>Complete Catalog</span>
                <span className="text-[#D32F2F] font-semibold group-hover/metric:translate-x-0.5 transition-transform flex items-center">
                  Explore <ChevronRight size={10} className="inline ml-0.5" />
                </span>
              </p>
            </div>
          </Link>

          {/* Card 2: Washing Services */}
          <Link
            to="/customer/services?category=washing"
            className="bg-gradient-to-br from-sky-500/[0.04] via-transparent to-transparent rounded-xl p-3.5 sm:p-4 border border-sky-200/60 hover:border-sky-400 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all flex flex-col justify-between group/metric cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">Wash Services</span>
                <div className="w-7 h-7 rounded-lg bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center shadow-2xs group-hover/metric:scale-105 transition-transform">
                  <Droplets size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-[22px] font-semibold text-slate-900 tracking-tight tabular-nums">
                  {washCount || 6}
                </span>
                <span className="text-[11px] text-sky-700 font-medium uppercase">Washes</span>
              </div>
            </div>

            <div className="mt-2.5">
              <div className="w-full bg-sky-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                  style={{ width: '100%' }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center justify-between">
                <span>Foam & Underbody</span>
                <span className="text-sky-700 font-semibold group-hover/metric:translate-x-0.5 transition-transform flex items-center">
                  Book Wash <ChevronRight size={10} className="inline ml-0.5" />
                </span>
              </p>
            </div>
          </Link>

          {/* Card 3: Coating & PPF Services */}
          <Link
            to="/customer/services?category=coating_ppf"
            className="bg-gradient-to-br from-purple-500/[0.04] via-transparent to-transparent rounded-xl p-3.5 sm:p-4 border border-purple-200/60 hover:border-purple-400 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all flex flex-col justify-between group/metric cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-800">PPF & Coating</span>
                <div className="w-7 h-7 rounded-lg bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shadow-2xs group-hover/metric:scale-105 transition-transform">
                  <Shield size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-[22px] font-semibold text-slate-900 tracking-tight tabular-nums">
                  {ppfCount || 4}
                </span>
                <span className="text-[11px] text-purple-700 font-medium uppercase">Shields</span>
              </div>
            </div>

            <div className="mt-2.5">
              <div className="w-full bg-purple-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                  style={{ width: '100%' }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center justify-between">
                <span>9H & Self-Healing</span>
                <span className="text-purple-700 font-semibold group-hover/metric:translate-x-0.5 transition-transform flex items-center">
                  Explore <ChevronRight size={10} className="inline ml-0.5" />
                </span>
              </p>
            </div>
          </Link>

          {/* Card 4: General Services */}
          <Link
            to="/customer/services?category=general"
            className="bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent rounded-xl p-3.5 sm:p-4 border border-emerald-200/60 hover:border-emerald-400 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all flex flex-col justify-between group/metric cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">General Services</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs group-hover/metric:scale-105 transition-transform">
                  <Wrench size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-[22px] font-semibold text-slate-900 tracking-tight tabular-nums">
                  {generalCount || 8}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium uppercase">Treatments</span>
              </div>
            </div>

            <div className="mt-2.5">
              <div className="w-full bg-emerald-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: '100%' }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center justify-between">
                <span>Interior Spa & Care</span>
                <span className="text-emerald-700 font-semibold group-hover/metric:translate-x-0.5 transition-transform flex items-center">
                  Book Care <ChevronRight size={10} className="inline ml-0.5" />
                </span>
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Active Membership Package & Expiry Tracker (Rendered Strictly Once) ────────── */}
      {currentActivePkg && (
        <div className="bg-gradient-to-br from-purple-50/70 via-white to-white rounded-3xl p-5 sm:p-6 border border-purple-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden">
          {(() => {
            const pkg = currentActivePkg;
            const daysLeft = pkg.end_date ? Math.ceil((new Date(pkg.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const isExpired = daysLeft !== null && daysLeft <= 0;
            const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 shadow-sm">
                      <Package size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Active Membership</span>
                        {isExpired ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded-md">Expired</span>
                        ) : isExpiringSoon ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-md animate-pulse">
                            Expires in {daysLeft}d
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-md">Active</span>
                        )}
                        {activePackages.length > 1 && (
                          <span className="text-[10px] text-purple-600 font-bold bg-purple-100/60 px-1.5 py-0.5 rounded">
                            {selectedActivePkgIndex + 1} of {activePackages.length}
                          </span>
                        )}
                      </div>

                      {/* Package Name or Selector if multiple packages */}
                      {activePackages.length > 1 ? (
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={selectedActivePkgIndex}
                            onChange={(e) => setSelectedActivePkgIndex(Number(e.target.value))}
                            className="text-base font-extrabold text-slate-900 bg-transparent border-b border-purple-300 focus:outline-none cursor-pointer pr-4"
                          >
                            {activePackages.map((p: any, i: number) => (
                              <option key={i} value={i}>
                                {p.package_name} {p.vehicle_reg_no ? `(${p.vehicle_reg_no})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">{pkg.package_name}</h3>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/customer/bookings/new?from_package=1&vehicle_id=${pkg.vehicle_id || ''}`)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all self-start sm:self-auto cursor-pointer"
                  >
                    Book from Package
                  </button>
                </div>

                {/* Included Services Meters */}
                {pkg.usage && pkg.usage.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {pkg.usage.map((u: any, uIdx: number) => (
                      <div key={uIdx} className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className={u.remaining > 0 ? 'text-emerald-600' : 'text-slate-400'} />
                          <span className="text-xs font-bold text-slate-800">{u.service_name}</span>
                        </div>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                          u.remaining > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.remaining} left
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Upcoming Appointments & History Two-Column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shadow-2xs">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-600 block leading-none">Visits</span>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight mt-0.5">Appointments</h3>
                </div>
              </div>
              <Link 
                to="/customer/bookings" 
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 transition-all"
              >
                <span>View All</span>
                <ChevronRight size={12} />
              </Link>
            </div>

            {upcomingBookings.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingBookings.slice(0, 3).map((b: any) => (
                  <div key={b.id} className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/70 rounded-2xl p-3.5 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        {/* Ticket Date Box */}
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-black uppercase text-red-600 leading-none">
                            {new Date(b.slot_date).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-sm font-black text-slate-900 leading-none mt-0.5">
                            {new Date(b.slot_date).getDate()}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{b.service_name || 'Detailing Service'}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                            {b.start_time && (
                              <span className="flex items-center gap-1 font-semibold text-slate-600">
                                <Clock size={11} className="text-slate-400" />
                                {formatTime(b.start_time)}
                              </span>
                            )}
                            {b.vehicle_reg_no && (
                              <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-700 text-[10px] font-bold rounded">
                                {b.vehicle_reg_no}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-black uppercase rounded-md shrink-0">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <Calendar size={22} />
                </div>
                <p className="text-xs text-slate-600 font-bold">No upcoming visits booked</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Reserve a bay slot in 60 seconds</p>
                <button
                  onClick={() => navigate('/customer/bookings/new')}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black rounded-xl shadow-sm transition-all hover:scale-105 inline-flex items-center gap-1.5"
                >
                  <CalendarCheck size={14} />
                  <span>Book A Slot</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Service History */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs">
                  <Shield size={16} className="text-red-600" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block leading-none">Studio Logs</span>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight mt-0.5">Service History</h3>
                </div>
              </div>
              <Link 
                to="/customer/job-carts" 
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 transition-all"
              >
                <span>All Jobs</span>
                <ChevronRight size={12} />
              </Link>
            </div>

            {recentJobs.length > 0 ? (
              <div className="space-y-2.5">
                {recentJobs.slice(0, 3).map((job: any) => (
                  <div key={job.id} className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/70 rounded-2xl p-3.5 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        V{job.visit_number || '1'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {job.registration_no || `${job.brand} ${job.model}`}
                          </p>
                          {job.invoice_number && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              #{job.invoice_number}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {job.services_done || `${job.brand} ${job.model}`} • {formatDate(job.visit_date)}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-black uppercase rounded-lg">
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Wrench size={22} />
                </div>
                <p className="text-xs text-slate-600 font-bold">No previous studio records</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Your invoices and job sheets will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Car Modal ────────────────────────────── */}
      <AddCarModal isOpen={showAddCar} onClose={() => setShowAddCar(false)} />

    </div>
  );
}


