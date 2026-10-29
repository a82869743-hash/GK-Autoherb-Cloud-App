import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, ChevronRight, Truck, Gift, Clock, CalendarClock, ShieldCheck, Sparkles, Package, CheckCircle2, Navigation, Bell } from 'lucide-react';
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
