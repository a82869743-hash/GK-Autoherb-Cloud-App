import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Clock, ShieldCheck, Car, Bike, Check } from 'lucide-react';
import { useServices, useCategories } from '../../api/hooks/useServices';
import { useCustomerDashboard } from '../../api/hooks/useDashboard';
import { useActiveVehicle } from '../../api/hooks/useCustomerApp';
import ServiceDetailsModal, { durationLabel, warrantyLabel } from '../../components/shared/ServiceDetailsModal';
import { VehicleChip } from '../../components/customer/VehicleSheet';
import { AppPageHeader, BottomSheet, EmptyBlock, SegmentedTabs, Skeleton } from '../../components/customer/ui';
import { SEGMENT_LABEL, priceForSegment, formatPrice } from '../../utils/pricing';
import ServiceImage from '../../components/customer/ServiceImage';

// ─── Kept for BookingPage, which groups services the same way ───
export type ServiceCategoryKey = string;
export const SERVICE_CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: 'All Services' },
  { key: 'general', label: 'General Services' },
  { key: 'washing', label: 'Washing Services' },
  { key: 'coating_ppf', label: 'Coating & PPF Services' },
];

export function matchesServiceCategory(svc: any, cat: ServiceCategoryKey): boolean {
  if (!cat || cat === 'all') return true;
  const catName = String(svc.category_name || '').toLowerCase();
  const name = String(svc.name || '').toLowerCase();
  const isCoating = catName.includes('coating') || /coating|ppf|paint protection|ceramic coat/.test(name);
  const isWash = !isCoating && (catName.includes('wash') || /wash|foam/.test(name));
  if (cat === 'coating_ppf') return isCoating;
  if (cat === 'washing') return isWash;
  if (cat === 'general') return !isCoating && !isWash;
  // Real category (id or name from Admin → Services)
  return String(svc.category_id) === String(cat) || catName === String(cat).toLowerCase();
}

export function getServiceImage(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('ceramic')) return '/services/gk/ceramic_coating.jpg';
  if (n.includes('ppf')) return '/services/gk/ppf.jpg';
  if (n.includes('interior')) return '/services/gk/interior_detailing.jpg';
  if (n.includes('foam')) return '/services/gk/foam_wash.jpg';
  return '/services/gk/exterior_body_wash.jpg';
}

type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'name';
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
];

export default function CustomerServicesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: svcData, isLoading } = useServices({ active_only: true });
  const { data: categories = [] } = useCategories();
  const { data: dash } = useCustomerDashboard();
  const { active, segment } = useActiveVehicle();

  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>(params.get('type') === 'bike' ? 'bike' : 'car');
  const [cat, setCat] = useState<string>(params.get('cat') || params.get('category') || 'all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recommended');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const services: any[] = svcData?.data || [];
  const firstWashEligible = (dash?.data || dash)?.first_wash_eligible;

  // Open a service directly from the home carousel (?service=<id>). Remember the id from the first
  // render: the URL-sync effect below rewrites the query string before the list has loaded.
  const deepLinkId = useRef(Number(params.get('service')) || 0);
  useEffect(() => {
    const id = deepLinkId.current;
    if (id && services.length) {
      deepLinkId.current = 0;
      const s = services.find((x) => Number(x.id) === id);
      if (s) {
        if (s.vehicle_type === 'bike') setVehicleType('bike');
        setDetails(s);
      }
    }
  }, [services.length]);

  // Keep the URL in sync so back/forward and shared links keep the filter
  useEffect(() => {
    const next = new URLSearchParams();
    if (cat !== 'all') next.set('cat', cat);
    if (vehicleType === 'bike') next.set('type', 'bike');
    setParams(next, { replace: true });
  }, [cat, vehicleType]);

  const typeServices = useMemo(() => services.filter((s) => (s.vehicle_type || 'car') === vehicleType), [services, vehicleType]);

  // Only show categories that actually have services for this vehicle type
  const catChips = useMemo(() => {
    const counts = new Map<string, number>();
    typeServices.forEach((s) => {
      if (s.category_name) counts.set(s.category_name, (counts.get(s.category_name) || 0) + 1);
    });
    return (categories as any[])
      .filter((c) => counts.has(c.name))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((c) => ({ key: c.name, label: c.name, count: counts.get(c.name) || 0 }));
  }, [categories, typeServices]);

  useEffect(() => {
    if (cat !== 'all' && catChips.length && !catChips.some((c) => c.key.toLowerCase() === cat.toLowerCase() || String((categories as any[]).find((x) => x.name === c.key)?.id) === cat)) {
      setCat('all');
    }
  }, [catChips]);

  const priceOf = (s: any) => priceForSegment(s, vehicleType === 'bike' ? 'hatchback' : segment);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = typeServices.filter((s) => {
      if (cat !== 'all' && !matchesServiceCategory(s, cat)) return false;
      if (q && !`${s.name} ${s.description || ''} ${s.category_name || ''}`.toLowerCase().includes(q)) return false;
      if (maxPrice !== null && priceOf(s) > maxPrice) return false;
      if (warrantyOnly && !(Number(s.warranty_months) > 0)) return false;
      return true;
    });
    if (sort === 'price_asc') list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort === 'price_desc') list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [typeServices, cat, query, sort, maxPrice, warrantyOnly, segment, vehicleType]);

  const activeFilterCount = (sort !== 'recommended' ? 1 : 0) + (maxPrice !== null ? 1 : 0) + (warrantyOnly ? 1 : 0);
  const priceCaps = [500, 1000, 3000, 10000];

  return (
    <div>
      <AppPageHeader title={vehicleType === 'bike' ? 'Bike Services' : 'Car Services'} back={false} right={<VehicleChip />} />

      <div className="space-y-3 mt-1">
        <SegmentedTabs<'car' | 'bike'>
          value={vehicleType}
          onChange={(v) => { setVehicleType(v); setCat('all'); }}
          options={[
            { value: 'car', label: <><Car size={17} /> Car</> },
            { value: 'bike', label: <><Bike size={17} /> Bike</> },
          ]}
        />

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Search "ceramic", "foam wash"…' className="app-input pl-11 pr-10" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear search"><X size={16} /></button>
            )}
          </div>
          <button onClick={() => setFiltersOpen(true)} className="relative h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700" aria-label="Sort and filter">
            <SlidersHorizontal size={19} />
            {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#D32F2F] text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          <button onClick={() => setCat('all')} className={`app-chip ${cat === 'all' ? 'app-chip-on' : 'app-chip-off'}`}>All</button>
          {catChips.map((c) => (
            <button
              key={c.key}
              ref={(el) => { if (el && cat.toLowerCase() === c.key.toLowerCase()) el.scrollIntoView({ block: 'nearest', inline: 'center' }); }}
              onClick={() => setCat(c.key)}
              className={`app-chip ${cat.toLowerCase() === c.key.toLowerCase() ? 'app-chip-on' : 'app-chip-off'}`}>
              {c.label} <span className="opacity-60 text-[11px]">{c.count}</span>
            </button>
          ))}
        </div>

        {vehicleType === 'car' && (
          <p className="text-[12px] text-slate-500 px-0.5">
            {active ? <>Showing prices for your <b className="text-slate-800">{active.brand} {active.model}</b> ({SEGMENT_LABEL[segment]})</> : 'Add your car to see its exact price'}
          </p>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)
        ) : visible.length === 0 ? (
          <EmptyBlock
            icon={<Search size={24} />}
            title="No services match"
            text="Try another category or clear the filters."
            action={<button onClick={() => { setCat('all'); setQuery(''); setMaxPrice(null); setWarrantyOnly(false); setSort('recommended'); }} className="app-btn-outline px-5">Clear filters</button>}
          />
        ) : (
          visible.map((s) => {
            const price = priceOf(s);
            const isWash = /wash/i.test(s.name);
            return (
              <div key={s.id} className="app-card p-3">
                <button onClick={() => setDetails(s)} className="flex gap-3 w-full text-left">
                  <ServiceImage service={s} className="h-[104px] w-[104px] shrink-0 rounded-xl" />
                  <span className="flex-1 min-w-0 py-0.5">
                    <span className="block font-display text-[16px] font-extrabold text-slate-900 leading-snug">{s.name}</span>
                    <span className="flex items-baseline gap-2 mt-1">
                      <span className="font-display text-lg font-extrabold text-slate-900">{formatPrice(price)}</span>
                      {isWash && firstWashEligible && price > 0 && <span className="text-[11px] font-bold text-emerald-600">50% OFF 1st wash</span>}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={13} />{durationLabel(s.duration_minutes)}</span>
                      {warrantyLabel(s.warranty_months) && <span className="flex items-center gap-1 text-emerald-700"><ShieldCheck size={13} />{warrantyLabel(s.warranty_months)}</span>}
                    </span>
                  </span>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => setDetails(s)} className="app-btn h-10 border border-slate-200 bg-white text-slate-800">View details</button>
                  <button onClick={() => navigate(`/customer/bookings/new?service_id=${s.id}`)} className="app-btn h-10 text-white" style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}>Book now</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Sort & filter"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setSort('recommended'); setMaxPrice(null); setWarrantyOnly(false); }} className="app-btn-outline">Reset</button>
            <button onClick={() => setFiltersOpen(false)} className="app-btn-primary">Show {visible.length} services</button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="app-label">Sort by</p>
            <div className="space-y-1">
              {SORTS.map((o) => (
                <button key={o.value} onClick={() => setSort(o.value)} className="w-full flex items-center justify-between rounded-xl px-3 h-11 hover:bg-slate-50">
                  <span className={`text-sm ${sort === o.value ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{o.label}</span>
                  {sort === o.value && <Check size={18} className="text-[#D32F2F]" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="app-label">Budget</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setMaxPrice(null)} className={`app-chip ${maxPrice === null ? 'app-chip-on' : 'app-chip-off'}`}>Any</button>
              {priceCaps.map((p) => (
                <button key={p} onClick={() => setMaxPrice(p)} className={`app-chip ${maxPrice === p ? 'app-chip-on' : 'app-chip-off'}`}>Under ₹{p.toLocaleString('en-IN')}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 px-4 h-12">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600" /> Only services with warranty</span>
            <input type="checkbox" checked={warrantyOnly} onChange={(e) => setWarrantyOnly(e.target.checked)} className="h-5 w-5 rounded text-[#D32F2F] focus:ring-[#D32F2F]" />
          </label>
        </div>
      </BottomSheet>

      <ServiceDetailsModal isOpen={!!details} onClose={() => setDetails(null)} service={details} isFirstWashEligible={firstWashEligible} />
    </div>
  );
}
