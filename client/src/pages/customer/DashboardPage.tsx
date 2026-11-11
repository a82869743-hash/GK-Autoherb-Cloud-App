import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, ChevronRight, Truck, Gift, Clock, CalendarClock, ShieldCheck, Sparkles, Package, CheckCircle2, Navigation, Bell, ArrowUpRight, Droplets } from 'lucide-react';
import { useUnreadNotifications } from '../../api/hooks/useAppNotifications';
import { PushCard } from '../../components/shared/NotificationsInbox';
import { useCustomerDashboard } from '../../api/hooks/useDashboard';
import { useServices } from '../../api/hooks/useServices';
import { usePublicSettings } from '../../api/hooks/useSettings';
import { useActiveVehicle, useCustomerProfile, useConfirmAttendance } from '../../api/hooks/useCustomerApp';
import { VehicleChip } from '../../components/customer/VehicleSheet';
import AddressSheet, { addressTitle, addressLine } from '../../components/customer/AddressSheet';
import { CancelBookingSheet, RescheduleSheet } from '../../components/customer/BookingActionSheets';
import { SectionTitle, Skeleton, StatusPill } from '../../components/customer/ui';
import ServiceImage from '../../components/customer/ServiceImage';
import { BrandCard } from '../../components/customer/ServiceMediaShowcase';
import { useProductBrands } from '../../api/hooks/useServiceExtras';
import { SEGMENT_LABEL, priceForSegment, offerPriceForSegment, offerBadge, formatPrice } from '../../utils/pricing';
import { roadDistanceKm, estimateDriveMinutes, resolveStudioLocation } from '../../utils/locationService';
import { formatTime } from '../../utils/formatters';
import { useUIStore } from '../../store/uiStore';

const STAGES = ['received', 'inspection', 'washing', 'detailing', 'curing', 'quality_check', 'ready', 'delivered'];
const STAGE_LABEL: Record<string, string> = {
  received: 'Vehicle received', inspection: 'Inspection', washing: 'Washing', detailing: 'Detailing',
  curing: 'Coating & curing', quality_check: 'Quality check', ready: 'Ready for pickup', delivered: 'Delivered',
};

// Home category tiles → services page filters (category names from Admin → Services)
const BIG_TILES = [
  { title: 'Washing & Detailing', to: '/customer/services?cat=Washing', img: '/services/gk/foam_wash.jpg' },
  { title: 'Coating & PPF', to: '/customer/services?cat=Coating', img: '/services/gk/ceramic_coating.jpg' },
  { title: 'Car Accessories', to: '/customer/products', img: '/products/white/car_vacuum.jpg', white: true },
];
const SMALL_TILES = [
  { title: 'Interior Care', to: '/customer/services?cat=Interior', img: '/services/gk/interior_detailing.jpg' },
  { title: 'Paint & Polish', to: '/customer/services?cat=Detailing', img: '/services/gk/rubbing_compounding.jpg' },
  { title: 'Bike Care', to: '/customer/services?type=bike', img: '/services/gk/two_wheeler_wash.jpg' },
  { title: 'Packages', to: '/customer/buy-packages', img: '/services/gk/premium_spa_wash.jpg' },
];

function slotDateLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useCustomerDashboard();
  const { data: profile } = useCustomerProfile();
  const { active, segment } = useActiveVehicle();
  const { data: servicesRes } = useServices({ active_only: true });
  const { data: settingsRes } = usePublicSettings();
  const confirmAttendance = useConfirmAttendance();
  const { data: coatingBrands = [] } = useProductBrands();
  const [addressOpen, setAddressOpen] = useState(false);
  const [cancelFor, setCancelFor] = useState<any>(null);
  const [rescheduleFor, setRescheduleFor] = useState<any>(null);
  const [slide, setSlide] = useState(0);

  const d = data?.data || data || {};
  const loyalty = d.loyalty || {};
  const upcoming: any[] = d.upcoming_bookings || [];
  const activeJob = (d.recent_jobs || []).find((j: any) => j.status === 'open' || j.status === 'draft');
  const defaultAddress = profile?.addresses?.find((a) => a.is_default) || profile?.addresses?.[0];
  const { data: unread = 0 } = useUnreadNotifications();
  const studio = useMemo(() => resolveStudioLocation(settingsRes?.data), [settingsRes]);

  const distanceKm = useMemo(() => {
    const lat = Number(defaultAddress?.latitude);
    const lng = Number(defaultAddress?.longitude);
    if (!lat || !lng) return null;
    return roadDistanceKm(lat, lng, studio.lat, studio.lng);
  }, [defaultAddress, studio]);

  const services: any[] = (servicesRes?.data || []).filter((s: any) => s.vehicle_type !== 'bike');
  const popular = services.slice(0, 8);

  const slides = useMemo(() => {
    const list = [
      {
        img: '/services/gk/foam_wash_premium.jpg',
        kicker: 'GK AutoHerb Studio',
        title: 'Showroom shine,\nat your time',
        cta: 'Book a wash',
        to: '/customer/services?cat=Washing',
      },
      {
        img: '/services/gk/ceramic_coating.jpg',
        kicker: 'Up to 3-year warranty',
        title: 'Ceramic coating\n& PPF protection',
        cta: 'Explore coatings',
        to: '/customer/services?cat=Coating',
      },
      {
        img: '/services/gk/premium_spa_wash.jpg',
        kicker: 'GK Rewards',
        title: `Get 10% back\nas GK points`,
        cta: 'See rewards',
        to: '/customer/loyalty',
      },
    ];
    if (d.first_wash_eligible) {
      list.unshift({
        img: '/services/gk/exterior_body_wash.jpg',
        kicker: 'Welcome offer',
        title: '50% OFF\nyour first wash',
        cta: 'Claim now',
        to: '/customer/services?cat=Washing',
      });
    }
    return list;
  }, [d.first_wash_eligible]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[slide % slides.length];

  const deliveryCard = (
    <>
        {/* Live delivery */}
        {d.active_delivery && (
          <Link to={`/customer/delivery/${d.active_delivery.id}`} className="app-card flex items-center gap-3 p-4 border border-red-100">
            <span className="h-11 w-11 rounded-xl bg-[#D32F2F] text-white flex items-center justify-center"><Truck size={22} /></span>
            <span className="flex-1 min-w-0">
              <span className="block font-display font-extrabold text-slate-900">Your car is on the way</span>
              <span className="block text-xs text-slate-500 truncate">{d.active_delivery.driver_name} · {d.active_delivery.registration_no}</span>
            </span>
            <span className="text-xs font-bold text-[#D32F2F] flex items-center gap-1">Track live <ChevronRight size={14} /></span>
          </Link>
        )}
    </>
  );
  const jobCard = (
    <>
        {/* Live job tracker */}
        {activeJob && (
          <div className="app-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#D32F2F] flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-[#D32F2F]" /></span>
                  Live in studio
                </p>
                <p className="font-display font-extrabold text-slate-900 mt-0.5">{STAGE_LABEL[activeJob.stage || 'received']}</p>
                <p className="text-xs text-slate-500">{activeJob.brand} {activeJob.model} · {activeJob.registration_no}</p>
              </div>
              {activeJob.tracking_url && (
                <Link to={activeJob.tracking_url} className="app-btn h-9 px-3 bg-[#111] text-white text-xs">Track</Link>
              )}
            </div>
            <div className="mt-3 flex gap-1">
              {STAGES.slice(0, 7).map((s, i) => (
                <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= STAGES.indexOf(activeJob.stage || 'received') ? 'bg-[#D32F2F]' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        )}
    </>
  );
  const liveCards = (
    <>
        {deliveryCard}
        {jobCard}
        {/* Next booking with cancel / reschedule */}
        {upcoming[0] && (
          <div className="app-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upcoming visit</p>
                <p className="font-display font-extrabold text-slate-900 mt-0.5 truncate">{upcoming[0].service_name || upcoming[0].package_name || 'Car care service'}</p>
                <p className="text-[13px] text-slate-600 flex items-center gap-1.5 mt-1">
                  <CalendarClock size={14} className="text-[#D32F2F]" />
                  {slotDateLabel(upcoming[0].slot_date)} · {formatTime(upcoming[0].start_time)}
                </p>
              </div>
              <StatusPill status={upcoming[0].status} />
            </div>
            {upcoming[0].customer_confirmation === 'pending' && (
              <button
                onClick={async () => {
                  await confirmAttendance.mutateAsync(upcoming[0].id);
                  toast('success', "Thanks! We'll be ready for you.");
                }}
                className="mt-3 w-full rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm h-10 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} /> Yes, I'll be there
              </button>
            )}
            {upcoming[0].customer_confirmation === 'confirmed' && (
              <p className="mt-3 text-xs font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14} /> You confirmed this visit</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setRescheduleFor(upcoming[0])} className="app-btn h-10 bg-slate-100 text-slate-800">Reschedule</button>
              <button onClick={() => setCancelFor(upcoming[0])} className="app-btn h-10 bg-white border border-slate-200 text-red-600">Cancel</button>
            </div>
          </div>
        )}
    </>
  );

  // Admin → Settings → Customer home style. Missing / unknown value = Classic.
  const homeStyle = String(settingsRes?.data?.customer_home_style || 'classic');
  const firstName = String((profile as any)?.name || '').trim().split(' ')[0];
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
  const vehicleName = active ? [(active as any).brand, (active as any).model].filter(Boolean).join(' ') || 'My car' : 'Add your car';
  const sheets = (
    <>
      <AddressSheet open={addressOpen} onClose={() => setAddressOpen(false)} />
      <CancelBookingSheet booking={cancelFor} onClose={() => setCancelFor(null)} />
      <RescheduleSheet booking={rescheduleFor} onClose={() => setRescheduleFor(null)} />
    </>
  );
  const priceTag = (s: any) => formatPrice(offerPriceForSegment(s, segment));

  // Shared data for the two premium home styles (all real values, nothing invented).
  const DISPLAY = { fontFamily: "'Archivo', 'Plus Jakarta Sans', system-ui, sans-serif" };
  const BODY = { fontFamily: "'Manrope', 'Inter', system-ui, sans-serif" };
  const points = Math.floor(Number(loyalty.points || 0));
  const freeWashes = Number(loyalty.free_washes || 0);
  const visits = Number(d.total_visits || 0);
  const pkgLeft: number | null = Array.isArray(d.active_package?.usage)
    ? d.active_package.usage.reduce((n: number, u: any) => n + Math.max(0, Number(u.remaining) || 0), 0)
    : null;
  const next = upcoming[0];
  const nextDate = next ? new Date(`${next.slot_date}T00:00:00`) : null;
  const carModel = active ? String((active as any).model || (active as any).brand || 'car') : 'car';
  const TRACK = [
    { label: 'Received', keys: ['received', 'inspection'] },
    { label: 'Wash', keys: ['washing'] },
    { label: 'Detail', keys: ['detailing', 'curing'] },
    { label: 'Check', keys: ['quality_check'] },
    { label: 'Ready', keys: ['ready', 'delivered'] },
  ];
  const trackAt = activeJob ? Math.max(0, TRACK.findIndex((t) => t.keys.includes(activeJob.stage || 'received'))) : 0;
  const hasOffer = (s: any) => !!offerBadge(s) && offerPriceForSegment(s, segment) < priceForSegment(s, segment);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${studio.lat},${studio.lng}`;
  const confirmVisit = async () => {
    await confirmAttendance.mutateAsync(next.id);
    toast('success', "Thanks! We'll be ready for you.");
  };
  const unreadDot = unread > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[10px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>
  );

  // ── Style B: Noir Garage (dark, cinematic) ──
  if (homeStyle === 'bold') {
    return (
      <div className="-mx-4 -mb-28 pb-28 min-h-screen bg-[#07070A] text-white" style={BODY}>
        {/* Hero */}
        <div className="relative overflow-hidden">
          <img src="/cars/luxury_sedan_studio.jpg" alt="" className="absolute inset-0 h-full w-full object-cover scale-110" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_80%_10%,rgba(229,57,53,0.35),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-[#07070A]" />
          <div className="relative px-4 pt-safe pb-5">
            <div className="flex items-center gap-2.5 pt-3">
              <span className="h-11 w-11 shrink-0 rounded-2xl bg-white/95 shadow-lg shadow-black/40 p-1.5 flex items-center justify-center">
                <img src="/assets/logo.png" alt="GK AutoHerb" className="h-full w-full object-contain" />
              </span>
              <button onClick={() => setAddressOpen(true)} className="min-w-0 flex-1 h-11 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 px-3 flex items-center gap-1.5 text-left">
                <MapPin size={15} className="shrink-0 text-[#FF6B6B]" />
                <span className="truncate text-[13px] font-bold">{defaultAddress ? addressTitle(defaultAddress) : 'Set location'}</span>
                <ChevronDown size={14} className="shrink-0 text-white/60" />
              </button>
              <Link to="/customer/notifications" className="relative h-11 w-11 shrink-0 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 flex items-center justify-center" aria-label="Notifications">
                <Bell size={18} />
                {unreadDot}
              </Link>
            </div>

            <div className="mt-16">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF6B6B]">{greeting}{firstName ? `, ${firstName}` : ''}</p>
              <h1 style={DISPLAY} className="mt-2 text-[36px] leading-[1.0] font-black tracking-[-0.02em]">
                Your {carModel},<br /><span className="font-light text-white/75">sculpted in</span> light.
              </h1>
            </div>

            <div className="mt-6 rounded-[22px] bg-white/[0.07] backdrop-blur-xl ring-1 ring-white/10 p-3.5 flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">In your garage</span>
                <span style={DISPLAY} className="block mt-0.5 text-[18px] font-extrabold truncate">{vehicleName}</span>
                <span className="mt-1.5 flex items-center gap-2 text-[11px]">
                  {active?.registration_no && <span className="rounded-md bg-white px-1.5 py-0.5 font-extrabold tracking-wider text-black">{active.registration_no}</span>}
                  <span className="text-white/55 truncate">{active ? SEGMENT_LABEL[segment] : 'Add your car for exact prices'}</span>
                </span>
              </span>
              <VehicleChip dark />
            </div>

            <div className="mt-3 grid grid-cols-[1.55fr_1fr] gap-2.5">
              <button onClick={() => navigate('/customer/services')} style={DISPLAY} className="h-14 rounded-[18px] bg-gradient-to-r from-[#FF4D4D] via-[#E53935] to-[#9E1010] text-[16px] font-extrabold flex items-center justify-center gap-1.5 shadow-[0_14px_34px_-10px_rgba(229,57,53,0.8)] active:scale-[0.98] transition-transform">
                Book a slot <ArrowUpRight size={18} />
              </button>
              <button onClick={() => navigate('/customer/services?cat=Washing')} className="h-14 rounded-[18px] bg-white/10 backdrop-blur-md ring-1 ring-white/15 text-[14px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
                <Droplets size={16} className="text-[#FF6B6B]" /> Quick wash
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-7">
          {/* Stats strip */}
          <div className="grid grid-cols-3 divide-x divide-white/10 rounded-[20px] bg-white/[0.04] ring-1 ring-white/10 py-3.5">
            <Link to="/customer/loyalty" className="px-3 text-center">
              <p style={DISPLAY} className="text-[20px] font-black">{points.toLocaleString('en-IN')}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">GK points</p>
            </Link>
            <Link to="/customer/buy-packages" className="px-3 text-center">
              <p style={DISPLAY} className="text-[20px] font-black">{pkgLeft !== null ? pkgLeft : visits}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{pkgLeft !== null ? 'Services left' : 'Visits'}</p>
            </Link>
            <Link to="/customer/bookings" className="px-3 text-center min-w-0">
              <p style={DISPLAY} className="text-[20px] font-black truncate">{next ? slotDateLabel(next.slot_date) : '—'}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Next visit</p>
            </Link>
          </div>

          <PushCard compact />

          {/* Live delivery */}
          {d.active_delivery && (
            <Link to={`/customer/delivery/${d.active_delivery.id}`} className="flex items-center gap-3 rounded-[22px] bg-gradient-to-r from-[#2a0909] to-[#120707] ring-1 ring-[#E53935]/30 p-4">
              <span className="h-11 w-11 rounded-2xl bg-[#E53935] flex items-center justify-center"><Truck size={21} /></span>
              <span className="min-w-0 flex-1">
                <span style={DISPLAY} className="block font-extrabold">Your car is on the way</span>
                <span className="block text-xs text-white/55 truncate">{d.active_delivery.driver_name} · {d.active_delivery.registration_no}</span>
              </span>
              <span className="text-xs font-bold text-[#FF6B6B] flex items-center gap-0.5">Track <ChevronRight size={14} /></span>
            </Link>
          )}

          {/* Live tracker */}
          {activeJob && (
            <div className="rounded-[24px] bg-white/[0.05] ring-1 ring-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6B6B] flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-[#E53935]" /></span>
                    Live in studio
                  </p>
                  <p style={DISPLAY} className="mt-1 text-[19px] font-extrabold">{STAGE_LABEL[activeJob.stage || 'received']}</p>
                  <p className="text-xs text-white/50 truncate">{activeJob.brand} {activeJob.model} · {activeJob.registration_no}</p>
                </div>
                {activeJob.tracking_url && (
                  <Link to={activeJob.tracking_url} className="shrink-0 h-9 px-3.5 rounded-xl bg-white text-black text-xs font-extrabold flex items-center">Track</Link>
                )}
              </div>
              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {TRACK.map((t, i) => (
                  <div key={t.label}>
                    <span className={`block h-1.5 rounded-full ${i < trackAt ? 'bg-[#E53935]' : i === trackAt ? 'bg-gradient-to-r from-[#E53935] to-[#FF8A80] animate-pulse' : 'bg-white/10'}`} />
                    <span className={`mt-1.5 block text-[10px] font-bold ${i <= trackAt ? 'text-white/80' : 'text-white/30'}`}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next appointment */}
          {next && (
            <div className="rounded-[24px] bg-white/[0.05] ring-1 ring-white/10 p-4">
              <div className="flex items-center gap-3.5">
                <span className="h-16 w-14 shrink-0 rounded-2xl bg-gradient-to-b from-[#E53935] to-[#8E0E0E] flex flex-col items-center justify-center">
                  <span style={DISPLAY} className="text-[22px] font-black leading-none">{nextDate?.getDate()}</span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">{nextDate?.toLocaleDateString('en-IN', { month: 'short' })}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Next appointment</span>
                  <span style={DISPLAY} className="block mt-0.5 text-[16px] font-extrabold truncate">{next.service_name || next.package_name || 'Car care service'}</span>
                  <span className="block text-[12px] text-white/55">{slotDateLabel(next.slot_date)} · {formatTime(next.start_time)}</span>
                </span>
              </div>
              {next.customer_confirmation === 'pending' && (
                <button onClick={confirmVisit} className="mt-3.5 w-full h-10 rounded-xl bg-emerald-500/15 text-emerald-300 text-sm font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} /> Yes, I'll be there
                </button>
              )}
              {next.customer_confirmation === 'confirmed' && (
                <p className="mt-3 text-xs font-semibold text-emerald-300 flex items-center gap-1"><CheckCircle2 size={14} /> You confirmed this visit</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => setRescheduleFor(next)} className="h-10 rounded-xl bg-white/10 text-sm font-bold">Reschedule</button>
                <button onClick={() => setCancelFor(next)} className="h-10 rounded-xl ring-1 ring-white/15 text-sm font-bold text-[#FF8A80]">Cancel</button>
              </div>
            </div>
          )}

          {/* Signature services */}
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF6B6B]">{active ? `Curated for your ${SEGMENT_LABEL[segment]}` : 'Curated by GK'}</p>
                <h2 style={DISPLAY} className="mt-1 text-[24px] font-black tracking-[-0.01em]">Signature services</h2>
              </div>
              <Link to="/customer/services" className="shrink-0 text-[12px] font-bold text-white/60 flex items-center">View all <ChevronRight size={14} /></Link>
            </div>
            {isLoading && !servicesRes ? (
              <div className="mt-4 flex gap-3"><Skeleton className="h-[300px] w-[232px] rounded-[26px]" /><Skeleton className="h-[300px] w-[232px] rounded-[26px]" /></div>
            ) : (
              <div className="mt-4 -mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
                {popular.map((s, i) => (
                  <button key={s.id} onClick={() => navigate(`/customer/services?service=${s.id}`)} className="relative h-[300px] w-[232px] shrink-0 snap-start overflow-hidden rounded-[26px] text-left ring-1 ring-white/10">
                    <ServiceImage service={s} className="absolute inset-0 h-full w-full" />
                    <span className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/90" />
                    <span style={DISPLAY} className="absolute left-4 top-3.5 text-[13px] font-black tracking-[0.18em] text-white/85">{String(i + 1).padStart(2, '0')}</span>
                    {hasOffer(s) && <span className="absolute right-3 top-3 rounded-full bg-[#E53935] px-2.5 py-1 text-[10px] font-extrabold">{offerBadge(s)}</span>}
                    <span className="absolute inset-x-0 bottom-0 p-4">
                      <span style={DISPLAY} className="block text-[18px] font-extrabold leading-tight line-clamp-2">{s.name}</span>
                      <span className="mt-1 block text-[11px] text-white/55 truncate">{s.category_name || s.category || 'GK detailing'}</span>
                      <span className="mt-3 flex items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-extrabold text-black">{priceTag(s)}</span>
                        {hasOffer(s) && <span className="text-[11px] text-white/45 line-through">{formatPrice(priceForSegment(s, segment))}</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category rail */}
          <div className="-mx-4 px-4 flex gap-4 overflow-x-auto no-scrollbar">
            {[...BIG_TILES, ...SMALL_TILES].map((t) => (
              <Link key={t.title} to={t.to} className="w-[74px] shrink-0 text-center">
                <span className="mx-auto block h-[70px] w-[70px] rounded-full bg-gradient-to-br from-[#FF5252] via-[#B71C1C] to-[#3a0a0a] p-[2px]">
                  <span className="block h-full w-full overflow-hidden rounded-full border-[3px] border-[#07070A] bg-white">
                    <img src={t.img} alt="" loading="lazy" className={`h-full w-full ${('white' in t && t.white) ? 'object-contain p-1.5' : 'object-cover'}`} />
                  </span>
                </span>
                <span className="mt-1.5 block text-[11px] font-semibold leading-tight text-white/75">{t.title}</span>
              </Link>
            ))}
          </div>

          {/* GK Privé member card */}
          <Link to="/customer/loyalty" className="relative block overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2d2617] via-[#15120c] to-[#0a0a0a] p-5 ring-1 ring-[#C9A86A]/35">
            <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#E3C88F]/15 blur-3xl" />
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.07)_50%,transparent_65%)]" />
            <span className="relative flex items-start justify-between">
              <span style={DISPLAY} className="text-[13px] font-black tracking-[0.38em] text-[#E3C88F]">GK PRIVÉ</span>
              <img src="/assets/logo.png" alt="" className="h-8 w-8 object-contain opacity-80" />
            </span>
            <span className="relative mt-6 block text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Reward balance</span>
            <span style={DISPLAY} className="relative block text-[38px] font-black leading-none text-white">{points.toLocaleString('en-IN')}<span className="ml-1.5 text-[14px] font-bold text-[#E3C88F]">pts</span></span>
            <span className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-3.5 text-[11px]">
              <span><span className="block font-extrabold text-white text-[14px]">{visits}</span><span className="text-white/45">Visits</span></span>
              <span><span className="block font-extrabold text-white text-[14px]">{freeWashes}</span><span className="text-white/45">Free washes</span></span>
              <span className="min-w-0"><span className="block font-extrabold text-white text-[14px] truncate">{d.active_package ? 'Active' : '—'}</span><span className="text-white/45 truncate block">{d.active_package?.package_name || 'Package'}</span></span>
            </span>
            <span className="relative mt-3 block text-[11px] text-[#E3C88F]/80">Earn 10% back on every service</span>
          </Link>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2">
            {[{ icon: ShieldCheck, label: 'Warranty on coatings' }, { icon: Clock, label: 'On-time delivery' }, { icon: Sparkles, label: 'Trained detailers' }].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] ring-1 ring-white/10 px-3 py-2 text-[11px] font-semibold text-white/70">
                <Icon size={14} className="text-[#FF6B6B]" /> {label}
              </span>
            ))}
          </div>
        </div>
        {sheets}
      </div>
    );
  }

  // ── Style C: Atelier (ivory editorial) ──
  if (homeStyle === 'minimal') {
    const BENTO = [
      { title: 'Coatings', sub: 'Ceramic · Graphene', to: '/customer/services?cat=Coating', img: '/services/gk/ceramic_coating.jpg', cls: 'row-span-2 h-[262px]' },
      { title: 'Washing', sub: 'Foam · Spa', to: '/customer/services?cat=Washing', img: '/services/gk/foam_wash_premium.jpg', cls: 'h-[125px]' },
      { title: 'Interior', sub: 'Deep clean', to: '/customer/services?cat=Interior', img: '/services/gk/interior_detailing.jpg', cls: 'h-[125px]' },
      { title: 'Paint protection film', sub: 'PPF · Self-healing', to: '/customer/services?cat=Coating', img: '/services/gk/ppf.jpg', cls: 'col-span-2 h-[118px]' },
    ];
    return (
      <div className="-mx-4 -mb-28 pb-28 min-h-screen bg-[#F5F1EA] text-[#141414]" style={BODY}>
        <div className="px-5 pt-safe">
          <div className="flex items-center gap-3 pt-3">
            <span className="h-11 w-11 shrink-0 rounded-full bg-[#141414] p-2 flex items-center justify-center">
              <img src="/assets/logo.png" alt="GK AutoHerb" className="h-full w-full object-contain" />
            </span>
            <button onClick={() => setAddressOpen(true)} className="min-w-0 flex-1 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">Detailing at</span>
              <span className="flex items-center gap-1 text-[14px] font-extrabold truncate">{defaultAddress ? addressTitle(defaultAddress) : 'Set location'} <ChevronDown size={14} className="shrink-0" /></span>
            </button>
            <Link to="/customer/notifications" className="relative h-11 w-11 shrink-0 rounded-full bg-white ring-1 ring-black/[0.06] flex items-center justify-center" aria-label="Notifications">
              <Bell size={18} />
              {unreadDot}
            </Link>
            <Link to="/customer/profile" style={DISPLAY} className="h-11 w-11 shrink-0 rounded-full bg-[#C8102E] text-white text-[16px] font-black flex items-center justify-center" aria-label="Profile">
              {(firstName || 'G').charAt(0).toUpperCase()}
            </Link>
          </div>

          <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.26em] text-black/40">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 style={DISPLAY} className="mt-2 text-[42px] leading-[0.96] tracking-[-0.035em]">
            <span className="font-light">{greeting},</span><br />
            <span className="font-black">{firstName || 'there'}<span className="text-[#C8102E]">.</span></span>
          </h1>

          {/* Garage card */}
          <div className="relative mt-7 min-h-[180px] overflow-hidden rounded-[30px] bg-white p-5 shadow-[0_24px_60px_-34px_rgba(20,20,20,0.45)]">
            <img
              src="/cars/black_suv.jpg"
              alt=""
              className="absolute right-0 top-0 h-full w-[64%] object-cover"
              style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, #000 48%)', maskImage: 'linear-gradient(to right, transparent, #000 48%)' }}
            />
            <div className="relative max-w-[58%]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">Your garage</p>
              <p style={DISPLAY} className="mt-1 text-[22px] font-black leading-tight tracking-[-0.01em] line-clamp-2">{vehicleName}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {active?.registration_no && <span className="rounded-full bg-[#F5F1EA] px-2.5 py-1 text-[10px] font-extrabold tracking-wider">{active.registration_no}</span>}
                {active && <span className="rounded-full bg-[#F5F1EA] px-2.5 py-1 text-[10px] font-bold text-black/60">{SEGMENT_LABEL[segment]}</span>}
              </div>
              <div className="mt-4 flex items-center gap-2.5">
                <span className="relative h-12 w-12">
                  <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#F0E9DD" strokeWidth="4" />
                    {visits > 0 && <circle cx="24" cy="24" r="20" fill="none" stroke="#C8102E" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.min(1, visits / 10) * 125.7} 125.7`} />}
                  </svg>
                  <span style={DISPLAY} className="absolute inset-0 flex items-center justify-center text-[15px] font-black">{visits}</span>
                </span>
                <span className="text-[11px] leading-tight text-black/55">Visits with<br /><b className="text-black">GK AutoHerb</b></span>
              </div>
            </div>
            <div className="relative mt-4"><VehicleChip /></div>
          </div>

          <button onClick={() => navigate('/customer/services')} className="mt-4 h-[62px] w-full rounded-full bg-[#141414] pl-6 pr-2 text-white flex items-center justify-between active:scale-[0.99] transition-transform">
            <span style={DISPLAY} className="text-[16px] font-extrabold">Reserve your detailing</span>
            <span className="h-[46px] w-[46px] rounded-full bg-[#C8102E] flex items-center justify-center"><ArrowUpRight size={20} /></span>
          </button>
        </div>

        <div className="px-5 pt-7 pb-8 space-y-8">
          <PushCard compact />
          {deliveryCard}
          {jobCard}

          {/* Next appointment */}
          {next && (
            <div className="rounded-[28px] bg-[#141414] p-4 text-white">
              <div className="flex items-center gap-4">
                <span className="h-[72px] w-[64px] shrink-0 rounded-[20px] bg-[#C8102E] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">{nextDate?.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span style={DISPLAY} className="text-[26px] font-black leading-none">{nextDate?.getDate()}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">{nextDate?.toLocaleDateString('en-IN', { month: 'short' })}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Next appointment</span>
                  <span style={DISPLAY} className="mt-0.5 block text-[17px] font-extrabold leading-tight line-clamp-2">{next.service_name || next.package_name || 'Car care service'}</span>
                  <span className="mt-0.5 block text-[12px] text-white/55">{slotDateLabel(next.slot_date)} · {formatTime(next.start_time)}</span>
                </span>
              </div>
              {next.customer_confirmation === 'pending' && (
                <button onClick={confirmVisit} className="mt-4 w-full h-10 rounded-full bg-white text-[#141414] text-sm font-extrabold flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Yes, I'll be there
                </button>
              )}
              {next.customer_confirmation === 'confirmed' && (
                <p className="mt-3 text-xs font-semibold text-emerald-300 flex items-center gap-1"><CheckCircle2 size={14} /> You confirmed this visit</p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button onClick={() => setRescheduleFor(next)} className="h-10 rounded-full bg-white/10 text-[12px] font-bold">Reschedule</button>
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="h-10 rounded-full bg-white/10 text-[12px] font-bold flex items-center justify-center gap-1"><Navigation size={13} /> Directions</a>
                <button onClick={() => setCancelFor(next)} className="h-10 rounded-full ring-1 ring-white/15 text-[12px] font-bold text-[#FF8A80]">Cancel</button>
              </div>
            </div>
          )}

          {/* Bento collections */}
          <div>
            <div className="flex items-baseline justify-between">
              <h2 style={DISPLAY} className="text-[26px] tracking-[-0.02em]"><span className="font-light">The </span><span className="font-black">collections</span></h2>
              <Link to="/customer/services" className="text-[12px] font-bold text-black/50 flex items-center">All <ChevronRight size={14} /></Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {BENTO.map((t, i) => (
                <Link key={t.title} to={t.to} className={`relative overflow-hidden rounded-[24px] ${t.cls}`}>
                  <img src={t.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <span style={DISPLAY} className="absolute left-3.5 top-3 text-[11px] font-black tracking-[0.2em] text-white/80">{['I', 'II', 'III', 'IV'][i]}</span>
                  <span className="absolute right-3 top-3 h-7 w-7 rounded-full bg-white/90 text-black flex items-center justify-center"><ArrowUpRight size={14} /></span>
                  <span className="absolute inset-x-3.5 bottom-3 text-white">
                    <span style={DISPLAY} className="block text-[17px] font-extrabold leading-tight">{t.title}</span>
                    <span className="block text-[10.5px] text-white/70">{t.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* The menu */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/45">The menu</span>
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8102E]">{active ? SEGMENT_LABEL[segment] : 'All cars'}</span>
            </div>
            {isLoading && !servicesRes ? (
              <Skeleton className="mt-3 h-56 w-full" />
            ) : (
              <div className="mt-1">
                {popular.map((s, i) => (
                  <button key={s.id} onClick={() => navigate(`/customer/services?service=${s.id}`)} className="flex w-full items-center gap-3.5 border-b border-black/[0.08] py-3.5 text-left">
                    <span style={DISPLAY} className="w-6 shrink-0 text-[13px] font-black text-black/25">{String(i + 1).padStart(2, '0')}</span>
                    <ServiceImage service={s} className="h-14 w-14 shrink-0 rounded-[18px]" />
                    <span className="min-w-0 flex-1">
                      <span style={DISPLAY} className="block text-[15px] font-extrabold leading-tight truncate">{s.name}</span>
                      <span className={`block text-[11.5px] truncate ${hasOffer(s) ? 'font-bold text-[#C8102E]' : 'text-black/45'}`}>{hasOffer(s) ? offerBadge(s) : (s.category_name || s.category || 'GK detailing')}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span style={DISPLAY} className="block text-[15px] font-black">{priceTag(s)}</span>
                      {hasOffer(s) && <span className="block text-[10.5px] text-black/35 line-through">{formatPrice(priceForSegment(s, segment))}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Champagne rewards */}
          <Link to="/customer/loyalty" className="relative block overflow-hidden rounded-[28px] bg-gradient-to-br from-[#EFE2C4] via-[#D9BF88] to-[#B8955A] p-5 text-[#1d1608]">
            <span className="pointer-events-none absolute -right-10 -bottom-16 h-48 w-48 rounded-full bg-white/25 blur-2xl" />
            <span className="relative flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/55">GK Rewards</span>
              <Gift size={18} className="text-black/60" />
            </span>
            <span style={DISPLAY} className="relative mt-3 block text-[40px] font-black leading-none tracking-[-0.02em]">{points.toLocaleString('en-IN')}<span className="ml-1.5 text-[14px] font-bold text-black/55">points</span></span>
            <span className="relative mt-2 block text-[12px] text-black/65">Earn 10% back on every service · redeem free washes</span>
            <span className="relative mt-4 flex items-center gap-4 border-t border-black/10 pt-3 text-[11px] text-black/60">
              <span><b className="text-black">{freeWashes}</b> free washes</span>
              {d.active_package && <span className="flex min-w-0 items-center gap-1"><Package size={13} /> <b className="truncate text-black">{d.active_package.package_name}</b></span>}
            </span>
          </Link>

          <div className="grid grid-cols-3 divide-x divide-black/10 text-center">
            {[{ icon: ShieldCheck, label: 'Coating warranty' }, { icon: Clock, label: 'On-time delivery' }, { icon: Sparkles, label: 'Trained detailers' }].map(({ icon: Icon, label }) => (
              <div key={label} className="px-2">
                <Icon size={18} className="mx-auto text-[#C8102E]" />
                <p className="mt-1.5 text-[10.5px] font-semibold leading-tight text-black/55">{label}</p>
              </div>
            ))}
          </div>
        </div>
        {sheets}
      </div>
    );
  }

  return (
    <div className="-mx-4">
      {/* ── Hero: location + vehicle chip over a promo banner (Hoora style) ── */}
      <div className="relative h-[330px] overflow-hidden bg-black">
        {slides.map((s, i) => (
          <img
            key={s.img}
            src={s.img}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === slide % slides.length ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/20 to-black/80" />

        <div className="relative z-10 px-4 pt-safe">
          <div className="flex items-start justify-between gap-3 pt-3">
            <button onClick={() => setAddressOpen(true)} className="min-w-0 text-left text-white">
              <span className="flex items-center gap-1.5 font-display text-[17px] font-extrabold">
                <MapPin size={18} className="text-[#ff5252]" />
                {defaultAddress ? addressTitle(defaultAddress) : 'Set location'}
                <ChevronDown size={16} />
              </span>
              <span className="block text-[13px] text-white/80 truncate max-w-[200px]">{addressLine(defaultAddress)}</span>
              {distanceKm !== null && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                  <Navigation size={11} /> ~{distanceKm} km from studio · ~{estimateDriveMinutes(distanceKm)} min
                </span>
              )}
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <Link to="/customer/notifications" className="relative h-10 w-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white" aria-label="Notifications">
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D32F2F] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-black/40">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              <VehicleChip dark />
            </div>
          </div>

          <div className="mt-10 text-white">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#ff8a80]">{current.kicker}</p>
            <h1 className="font-display text-[30px] leading-[1.08] font-extrabold whitespace-pre-line mt-1.5">{current.title}</h1>
            <button onClick={() => navigate(current.to)} className="mt-4 app-btn h-10 px-4 bg-white text-slate-900">
              {current.cta} <ChevronRight size={16} />
            </button>
          </div>
          <div className="absolute bottom-10 right-4 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${i === slide % slides.length ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <PushCard compact />
      </div>

      {/* ── Content sheet ── */}
      <div className="relative -mt-6 rounded-t-[28px] bg-[#f3f4f6] px-4 pt-5 space-y-6">
        {liveCards}

        {/* Category tiles */}
        <div>
          <div className="grid grid-cols-3 gap-2.5">
            {BIG_TILES.map((t) => (
              <Link key={t.title} to={t.to} className="app-card overflow-hidden flex flex-col h-[148px]">
                <span className="px-3 pt-2.5 font-display text-[13px] font-bold leading-tight text-slate-900">{t.title}</span>
                <span className="mt-auto h-[86px] overflow-hidden">
                  <img src={t.img} alt="" loading="lazy" className={`h-full w-full ${t.white ? 'object-contain p-1' : 'object-cover rounded-tl-2xl'}`} />
                </span>
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2.5 mt-2.5">
            {SMALL_TILES.map((t) => (
              <Link key={t.title} to={t.to} className="app-card overflow-hidden flex flex-col h-[112px]">
                <span className="px-2.5 pt-2 font-display text-[12px] font-bold leading-tight text-slate-900">{t.title}</span>
                <img src={t.img} alt="" loading="lazy" className="mt-auto h-[58px] w-full object-cover" />
              </Link>
            ))}
          </div>
        </div>

        {/* Popular services for this car */}
        <div>
          <SectionTitle
            action={<Link to="/customer/services" className="text-[13px] font-bold text-[#D32F2F] flex items-center">View all <ChevronRight size={15} /></Link>}
          >
            {active ? `Popular for your ${SEGMENT_LABEL[segment]}` : 'Popular services'}
          </SectionTitle>
          {isLoading && !servicesRes ? (
            <div className="flex gap-3"><Skeleton className="h-52 w-44" /><Skeleton className="h-52 w-44" /></div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {popular.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/customer/services?service=${s.id}`)}
                  className="app-card w-44 shrink-0 overflow-hidden text-left"
                >
                  <ServiceImage service={s} className="h-28 w-full" />
                  <span className="block p-3">
                    <span className="block font-display text-[14px] font-bold text-slate-900 leading-tight line-clamp-2 min-h-[36px]">{s.name}</span>
                    <span className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="font-display font-extrabold text-[#C62828]">{formatPrice(offerPriceForSegment(s, segment))}</span>
                      {offerPriceForSegment(s, segment) < priceForSegment(s, segment) && (
                        <span className="text-[11px] text-slate-400 line-through">{formatPrice(priceForSegment(s, segment))}</span>
                      )}
                    </span>
                    {offerBadge(s) && offerPriceForSegment(s, segment) < priceForSegment(s, segment) && (
                      <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-[#D32F2F]">{offerBadge(s)}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PPF & ceramic brands the studio uses */}
        {coatingBrands.length > 0 && (
          <div>
            <SectionTitle
              action={<Link to="/customer/services?cat=Coating" className="text-[13px] font-bold text-[#D32F2F] flex items-center">Coatings <ChevronRight size={15} /></Link>}
            >
              PPF & ceramic brands we use
            </SectionTitle>
            <div className="space-y-2.5">
              {coatingBrands.map((b) => (
                <Link key={b.id} to={`/customer/services?cat=Coating`} className="block">
                  <BrandCard brand={b} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rewards banner */}
        <Link to="/customer/loyalty" className="block rounded-2xl overflow-hidden bg-gradient-to-r from-[#111] via-[#1d1d1d] to-[#7f0000] p-4 text-white shadow-app-lg">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center"><Gift size={24} className="text-[#ff8a80]" /></span>
            <span className="flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">GK Rewards</span>
              <span className="block font-display text-lg font-extrabold">{Math.floor(Number(loyalty.points || 0))} points</span>
              <span className="block text-xs text-white/70">Earn 10% back on every service · redeem free washes</span>
            </span>
            <ChevronRight className="text-white/60" />
          </div>
        </Link>

        {/* Active package */}
        {d.active_package && (
          <Link to="/customer/buy-packages" className="app-card flex items-center gap-3 p-4">
            <span className="h-11 w-11 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center"><Package size={22} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-violet-600">Active membership</span>
              <span className="block font-display font-bold text-slate-900 truncate">{d.active_package.package_name}</span>
            </span>
            <ChevronRight className="text-slate-400" />
          </Link>
        )}

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-2.5 pb-2">
          {[
            { icon: ShieldCheck, label: 'Warranty on coatings' },
            { icon: Clock, label: 'On-time delivery' },
            { icon: Sparkles, label: 'Trained detailers' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="app-card p-3 text-center">
              <Icon size={20} className="mx-auto text-[#D32F2F]" />
              <p className="mt-1.5 text-[11px] font-semibold text-slate-600 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <AddressSheet open={addressOpen} onClose={() => setAddressOpen(false)} />
      <CancelBookingSheet booking={cancelFor} onClose={() => setCancelFor(null)} />
      <RescheduleSheet booking={rescheduleFor} onClose={() => setRescheduleFor(null)} />
    </div>
  );
}
