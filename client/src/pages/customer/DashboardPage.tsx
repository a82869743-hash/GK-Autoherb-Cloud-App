import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, Clock, Car, Sparkles, Gift, ArrowRight, ChevronRight,
  Shield, CalendarCheck, Wrench, Plus, Package, ChevronLeft,
  CheckCircle2, Award, Zap, Truck, Navigation, Bot, ArrowUpDown
} from 'lucide-react';
import { useCustomerDashboard } from '../../api/hooks/useDashboard';
import { useAuthStore } from '../../store/authStore';
import ErrorState from '../../components/shared/ErrorState';
import { formatDate, formatTime, formatINR } from '../../utils/formatters';
import AddCarModal from '../../components/shared/AddCarModal';
import { useCarImage, getSafeCarImage, getStudioFallback, markCarImageFailed } from '../../utils/carImageService';
import { getCategoryForModel } from '../../utils/carData';
import { OWNER_STUDIO_LOCATION } from '../../utils/locationService';

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
  const activePackages = data?.active_packages || (activePackage ? [activePackage] : []);

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
      {/* ── Sub-header / Studio Status Bar ───────────── */}
      <div className="flex items-center justify-between text-xs px-1">
        <a 
          href={`https://www.google.com/maps?q=${OWNER_STUDIO_LOCATION.lat},${OWNER_STUDIO_LOCATION.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity group"
          title="Open Studio Location in Google Maps"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-slate-600 font-semibold tracking-wide flex items-center gap-1">
            Studio Live • <span className="font-bold text-slate-800">Gotri - Vasna - Bhayli Road</span>
            <span className="text-[10px] text-red-600 font-bold bg-red-50 group-hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors">Vadodara 📍</span>
          </span>
        </a>
        <Link 
          to="/customer/vehicles" 
          className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-bold text-[11px] transition-colors"
        >
          <span>Your Garage ({vehicles.length})</span>
          <ChevronRight size={12} className="text-red-500" />
        </Link>
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

      {/* ── GK AI Workshop Concierge Interactive Banner ─────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#121212] via-[#1a1818] to-[#221f1f] p-5 sm:p-6 text-white border border-white/10 shadow-xl">
        <div className="absolute top-0 right-0 w-60 h-60 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D32F2F] to-[#af101a] text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Ask GK Studio AI Concierge</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Assistant
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
                Need instant pricing for your car, package comparisons, live car tracking, or genuine accessories? Click any question below to chat live.
              </p>
            </div>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('gk-open-chatbot'))}
            className="px-4 py-2.5 bg-gradient-to-r from-[#D32F2F] to-[#b71c1c] hover:from-[#b71c1c] hover:to-[#8b0000] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Sparkles size={15} />
            <span>Open AI Chat</span>
          </button>
        </div>

        {/* Quick Question Trigger Chips */}
        <div className="relative z-10 mt-4 pt-3.5 border-t border-white/10 flex flex-wrap gap-2">
          {[
            { label: '🏎️ Track My Car Progress', prompt: 'Where is my car and what is the job status?' },
            { label: '💎 Which Package Saves Most?', prompt: 'What are the membership packages and savings?' },
            { label: '🛡️ Ceramic vs PPF Difference', prompt: 'What is the difference between ceramic coating and PPF?' },
            { label: '🛍️ Check Store Accessories', prompt: 'What genuine car accessories do you have in stock?' },
            { label: '📞 Studio Helpline & Valet', prompt: 'Please give me the studio phone number, location, and doorstep pickup details' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => window.dispatchEvent(new CustomEvent('gk-open-chatbot', { detail: { prompt: item.prompt } }))}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-red-500/40 text-slate-200 hover:text-white rounded-xl text-[11px] font-medium transition-all active:scale-95 text-left"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Vehicle Hero Showcase Carousel (Clean Light Studio Mode) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group">
        {/* Top Car Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Active Vehicle</span>
              {currentCar?.car_year && (
                <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">
                  {currentCar.car_year}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {currentCar?.model || 'Studio Vehicle'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold tracking-wide mt-0.5">
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

      {/* ── GK Club Pass & Loyalty Bento Card ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group">
        {/* Pass Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" />
                GK Club Pass
              </span>
              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 text-[9px] font-black uppercase tracking-wider rounded-md">
                Gold Tier
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
              Rewards & Member Privileges
            </h3>
          </div>
          <Link
            to="/customer/loyalty"
            className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition-all"
          >
            <span>Redeem Pass</span>
            <ChevronRight size={14} className="text-red-500" />
          </Link>
        </div>

        {/* 4 Bento Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 relative z-10">
          {/* Reward Points */}
          <div className="bg-gradient-to-br from-amber-500/[0.04] via-transparent to-transparent rounded-2xl p-4 border border-amber-200/60 hover:border-amber-300 shadow-2xs transition-all flex flex-col justify-between group/metric">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Points Balance</span>
                <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shadow-2xs">
                  <Award size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {loyalty.credits || 0}
                </span>
                <span className="text-xs text-amber-700 font-extrabold uppercase">Pts</span>
              </div>
            </div>
            
            <div className="mt-3">
              <div className="w-full bg-amber-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(8, ((loyalty.credits || 0) % 500) / 5))}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1.5 flex items-center justify-between">
                <span>Instant Cash Off</span>
                <span className="text-amber-700 font-bold">1 Pt = ₹1</span>
              </p>
            </div>
          </div>

          {/* Free Washes */}
          <div className="bg-gradient-to-br from-sky-500/[0.04] via-transparent to-transparent rounded-2xl p-4 border border-sky-200/60 hover:border-sky-300 shadow-2xs transition-all flex flex-col justify-between group/metric">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800">Free Washes</span>
                <div className="w-7 h-7 rounded-xl bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center shadow-2xs">
                  <Zap size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {loyalty.free_washes || 0}
                </span>
                <span className="text-xs text-sky-700 font-extrabold uppercase">Available</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full bg-sky-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(loyalty.free_washes || 0) > 0 ? 100 : 0}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1.5 flex items-center justify-between">
                <span>100% Free Detailing</span>
                {(loyalty.free_washes || 0) > 0 && <span className="text-emerald-600 font-black">Ready!</span>}
              </p>
            </div>
          </div>

          {/* Wax Treatments */}
          <div className="bg-gradient-to-br from-purple-500/[0.04] via-transparent to-transparent rounded-2xl p-4 border border-purple-200/60 hover:border-purple-300 shadow-2xs transition-all flex flex-col justify-between group/metric">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">Wax Treatments</span>
                <div className="w-7 h-7 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shadow-2xs">
                  <Sparkles size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {loyalty.wax_count || 0}
                </span>
                <span className="text-xs text-purple-700 font-extrabold uppercase">Passes Left</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full bg-purple-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(loyalty.wax_count || 0) > 0 ? 100 : 0}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1.5">
                <span>Carnauba Mirror Shine</span>
              </p>
            </div>
          </div>

          {/* Total Visits */}
          <div className="bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent rounded-2xl p-4 border border-emerald-200/60 hover:border-emerald-300 shadow-2xs transition-all flex flex-col justify-between group/metric">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Studio Visits</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {totalVisits}
                </span>
                <span className="text-xs text-emerald-700 font-extrabold uppercase">Completed</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full bg-emerald-100/70 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(10, totalVisits * 20))}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1.5 flex items-center justify-between">
                <span>VIP Priority Bay</span>
                <span className="text-emerald-700 font-bold">Active</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Membership Package & Expiry Tracker ────────── */}
      {activePackages.length > 0 && (
        <div className="space-y-3">
          {activePackages.map((pkg: any, idx: number) => {
            const daysLeft = pkg.end_date ? Math.ceil((new Date(pkg.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const isExpired = daysLeft !== null && daysLeft <= 0;
            const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;

            return (
              <div key={pkg.id || idx} className="bg-gradient-to-br from-purple-50/70 via-white to-white rounded-3xl p-5 sm:p-6 border border-purple-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden">
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
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">{pkg.package_name}</h3>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/customer/bookings/new?from_package=1&vehicle_id=${pkg.vehicle_id || ''}`)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all self-start sm:self-auto"
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
              </div>
            );
          })}
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


