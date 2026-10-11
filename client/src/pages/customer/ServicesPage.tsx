import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, CreditCard, Droplets, ArrowRight, Shield, Search, ArrowUpDown, X, Play } from 'lucide-react';
import { useServices, useCategories } from '../../api/hooks/useServices';
import { useLoyalty } from '../../api/hooks/useLoyalty';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/shared/ErrorState';
import { formatINR } from '../../utils/formatters';
import ServiceDetailsModal from '../../components/shared/ServiceDetailsModal';

export function getServiceImage(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('ceramic') || n.includes('coating')) return '/services/ceramic_coating.jpg';
  if (n.includes('ppf') || n.includes('paint protection') || n.includes('film')) return '/services/ppf_protection.jpg';
  if (n.includes('interior') || n.includes('deep clean') || n.includes('upholstery') || n.includes('seat')) return '/services/interior_detailing.jpg';
  if (n.includes('polish') || n.includes('compound') || n.includes('wax') || n.includes('teflon') || n.includes('rubbing')) return '/services/paint_polish.jpg';
  if (n.includes('exterior body') || n.includes('body wash')) return '/services/exterior_body.jpg';
  if (n.includes('wash') || n.includes('foam') || n.includes('clean')) return '/services/car_wash.jpg';
  if (n.includes('detailing') || n.includes('spa') || n.includes('premium')) return '/services/detailing_spa.jpg';
  return '/services/wash_clean.jpg';
}

export type ServiceCategoryKey = string;

export const SERVICE_CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: 'All Services' },
  { key: 'general', label: 'General Services' },
  { key: 'washing', label: 'Washing Services' },
  { key: 'coating_ppf', label: 'Coating & PPF Services' },
];

export function matchesServiceCategory(svc: any, cat: ServiceCategoryKey): boolean {
  if (cat === 'all') return true;
  const name = (svc.name || '').toLowerCase();
  const desc = (svc.description || '').toLowerCase();
  const catName = (svc.category_name || svc.category || '').toLowerCase();

  const isCoatingOrPpf =
    name.includes('coating') ||
    name.includes('ppf') ||
    name.includes('ceramic') ||
    name.includes('graphene') ||
    name.includes('film') ||
    name.includes('paint protection') ||
    desc.includes('coating') ||
    desc.includes('ppf') ||
    catName.includes('coating') ||
    catName.includes('ppf');

  if (cat === 'coating_ppf') {
    return isCoatingOrPpf;
  }

  const isWash =
    (name.includes('wash') ||
     name.includes('foam') ||
     name.includes('water') ||
     catName.includes('wash')) &&
    !isCoatingOrPpf;

  if (cat === 'washing') {
    return isWash;
  }

  if (cat === 'general') {
    return !isCoatingOrPpf && !isWash;
  }

  return true;
}

const FILTERS = ['all', 'hatchback', 'medium_hatchback', 'sedan', 'premium_sedan', 'suv'] as const;
type Filter = typeof FILTERS[number];

type SortOption = 'priority' | 'alpha_asc' | 'alpha_desc' | 'price_asc' | 'price_desc';

// ─── Service Priority Sorting ─────────────────
const HOT_KEYWORDS = ['wash', 'premium wash', 'basic wash', 'ppf', 'coating', 'ceramic', 'polish', 'wax', 'paint protection', 'interior clean', 'detailing'];

function getServicePriority(name: string): number {
  const lower = name.toLowerCase();
  for (let i = 0; i < HOT_KEYWORDS.length; i++) {
    if (lower.includes(HOT_KEYWORDS[i])) return i;
  }
  return HOT_KEYWORDS.length + 1;
}

function sortServicesByPriority(services: any[]): any[] {
  return [...services].sort((a, b) => getServicePriority(a.name) - getServicePriority(b.name));
}

export default function CustomerServicesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = (searchParams.get('category') || searchParams.get('cat') || 'all') as string;
  const [categoryFilter, setCategoryFilter] = useState<string>(urlCategory);

  const { data: dbCategories = [] } = useCategories();

  const activeCategories = [
    { key: 'all', label: 'All Services' },
    ...(dbCategories.length > 0
      ? dbCategories.map((c: any) => ({ key: String(c.id), label: c.name, name: c.name }))
      : SERVICE_CATEGORIES.slice(1))
  ];

  useEffect(() => {
    const cat = (searchParams.get('category') || searchParams.get('cat')) as string;
    if (cat) {
      setCategoryFilter(cat);
    }
  }, [searchParams]);

  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('priority');

  const { data: svcData, isLoading: svcLoading, isError, refetch } = useServices({ active_only: true });
  const { data: loyalty } = useLoyalty('mine');
  
  const [selectedDetailsSvc, setSelectedDetailsSvc] = useState<any>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<{ url: string; title: string } | null>(null);

  const rawServices = svcData?.data || [];

  // Filter services by search term and category
  const filteredServices = rawServices.filter((svc: any) => {
    if (categoryFilter !== 'all') {
      const matchDbCategory = svc.category_id && String(svc.category_id) === String(categoryFilter);
      const matchDbCatName = activeCategories.find((c: any) => c.key === categoryFilter)?.label?.toLowerCase();
      const matchByName = matchDbCatName && (svc.category_name || '').toLowerCase() === matchDbCatName;
      const matchHardcoded = matchesServiceCategory(svc, categoryFilter as any);
      if (!matchDbCategory && !matchByName && !matchHardcoded) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      svc.name?.toLowerCase().includes(q) ||
      svc.description?.toLowerCase().includes(q) ||
      svc.category?.toLowerCase().includes(q) ||
      svc.category_name?.toLowerCase().includes(q)
    );
  });

  // Sort services based on selection
  const sortedServices = [...filteredServices].sort((a: any, b: any) => {
    if (sortBy === 'alpha_asc') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'alpha_desc') {
      return (b.name || '').localeCompare(a.name || '');
    }
    if (sortBy === 'price_asc') {
      const pA = Number(a.price_sedan || a.price_hatchback || 0);
      const pB = Number(b.price_sedan || b.price_hatchback || 0);
      return pA - pB;
    }
    if (sortBy === 'price_desc') {
      const pA = Number(a.price_sedan || a.price_hatchback || 0);
      const pB = Number(b.price_sedan || b.price_hatchback || 0);
      return pB - pA;
    }
    // Priority default
    return getServicePriority(a.name || '') - getServicePriority(b.name || '');
  });

  const isLoading = svcLoading;
  const renderPrice = (val: any) => { const n = Number(val || 0); return n > 0 ? formatINR(n) : 'Ask Studio'; };

  if (isError) {
    return (
      <div className="pt-4">
        <ErrorState
          message="Failed to load services. Please check your connection and try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const getPriceKey = (f: Filter) => f === 'all' ? null : `price_${f}`;

  return (
    <div className="pt-4 pb-20 relative">
      {/* ── Hero Banner ──────────────────────────────────── */}
      <div className="relative hero-bg rounded-xl overflow-hidden mb-5 pattern-overlay">
        <div className="relative z-10 px-5 sm:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] animate-pulse-dot" />
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Premium Detail Studio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-tight mb-1.5">
            Our Services
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm max-w-lg font-normal leading-relaxed">
            Elevate your vehicle with our premium detailing services. Tap any service card to view details and features.
          </p>
          <div className="flex gap-2.5 mt-4">
            <Button size="sm" onClick={() => navigate(categoryFilter && categoryFilter !== 'all' ? `/customer/bookings/new?category=${categoryFilter}` : '/customer/bookings/new')} icon={<ArrowRight size={14} />}>
              Book Now
            </Button>
          </div>
        </div>
      </div>

      {/* ── Search & Alphabetical Sorting Controls Bar ──────────────────── */}
      <div className="bg-white p-3 rounded-xl shadow-2xs border border-gray-100 mb-5 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services by name or features..."
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Alphabetical & Price Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 w-full sm:w-auto">
              <ArrowUpDown size={14} className="text-[#D32F2F] shrink-0" />
              <span className="text-gray-400 font-normal">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-gray-900 font-extrabold cursor-pointer focus:outline-none text-xs"
              >
                <option value="priority">Recommended Priority</option>
                <option value="alpha_asc">Alphabetical: A to Z</option>
                <option value="alpha_desc">Alphabetical: Z to A</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Dynamic Service Category Filter Buttons ── */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100 no-scrollbar">
          {activeCategories.map((cat: any) => {
            const isSelected = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setCategoryFilter(cat.key);
                  setSearchParams(cat.key === 'all' ? {} : { cat: cat.key, category: cat.key });
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#af101a] to-[#D32F2F] text-white shadow-md shadow-[#D32F2F]/25 scale-[1.02]'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Pricing Segment Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
            Show Pricing:
          </span>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  filter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                {f === 'all' ? 'All Segments' : f === 'medium_hatchback' ? 'Med Hatch' : f === 'premium_sedan' ? 'Prem Sedan' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      ) : sortedServices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <Droplets size={48} className="mx-auto text-gray-300" />
          <h3 className="font-bold text-gray-800 text-base">No services found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try adjusting your search query or vehicle segment filter to see all detailing options.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilter('all'); setSortBy('priority'); }}
            className="px-4 py-2 bg-[#D32F2F] text-white text-xs font-bold rounded-xl"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* ── Services Catalog ────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#D32F2F]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">
                  Services ({sortedServices.length}) — Tap Card for English Details
                </p>
              </div>
              <span className="text-[11px] font-bold text-gray-400">
                Sorted by {sortBy === 'alpha_asc' ? 'A-Z' : sortBy === 'alpha_desc' ? 'Z-A' : sortBy === 'price_asc' ? 'Price Low' : sortBy === 'price_desc' ? 'Price High' : 'Priority'}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedServices.map((svc: any, idx: number) => {
                return (
                  <div
                    key={svc.id}
                    onClick={() => setSelectedDetailsSvc(svc)}
                    className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 card-premium group cursor-pointer hover:border-red-200 transition-all opacity-0 animate-fade-in-up flex flex-col justify-between"
                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
                  >
                    <div>
                      {/* 4:3 Aspect Ratio Card Media */}
                      <div className="aspect-[4/3] w-full relative rounded-xl overflow-hidden bg-slate-900 mb-3.5 shadow-xs">
                        <img
                          src={svc.image_url || getServiceImage(svc.name)}
                          alt={svc.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getServiceImage(svc.name);
                          }}
                        />
                        {/* Category badge */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-md">
                            {svc.category_name || (svc.name && svc.name.toLowerCase().includes('wash') ? 'Washing' : 'Detailing')}
                          </span>
                        </div>
                        {/* Video Play Button if video_url is available */}
                        {svc.video_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVideoModal({ url: svc.video_url, title: svc.name });
                            }}
                            className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-sm shadow-md transition-all active:scale-95"
                          >
                            <Play size={10} className="fill-white" />
                            <span>Studio Video</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-start justify-between mb-1.5">
                        <h3 className="font-bold text-[#1c1b1b] text-base group-hover:text-[#D32F2F] transition-colors">{svc.name}</h3>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md shrink-0">Details ℹ️</span>
                      </div>
                      {svc.description && (
                        <p className="text-xs text-[#5f5e5e] line-clamp-2 leading-relaxed">
                          {svc.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mt-4 pt-3.5 border-t border-gray-100">
                        {filter === 'all' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 text-center">
                            <div className="bg-[#faf7f5] rounded-lg py-1.5">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Hatch</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_hatchback)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-1.5">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Med Hatch</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_medium_hatchback)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-1.5">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Sedan</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_sedan)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-1.5">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Prem Sedan</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_premium_sedan)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-1.5">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">SUV</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_suv)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-400 capitalize">{filter.replace('_', ' ')}:</span>
                            <p className="text-lg font-black text-[#D32F2F]">{renderPrice(svc[getPriceKey(filter)!])}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDetailsSvc(svc)}
                        >
                          Details ℹ️
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#D32F2F] hover:bg-[#b52626] text-white font-bold"
                          onClick={() => navigate(`/customer/bookings/new?service_id=${svc.id}&category=${categoryFilter}`)}
                          icon={<ArrowRight size={14} />}
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      <ServiceDetailsModal
        isOpen={!!selectedDetailsSvc}
        onClose={() => setSelectedDetailsSvc(null)}
        service={selectedDetailsSvc}
      />

      {/* Service Demonstration Video Modal */}
      {activeVideoModal && (
        <Modal
          open={!!activeVideoModal}
          onClose={() => setActiveVideoModal(null)}
          title={`Studio Video: ${activeVideoModal.title}`}
          size="lg"
        >
          <div className="p-2 space-y-3">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg">
              {activeVideoModal.url.includes('youtube.com') || activeVideoModal.url.includes('youtu.be') ? (
                <iframe
                  src={activeVideoModal.url.replace('watch?v=', 'embed/')}
                  title={activeVideoModal.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideoModal.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-gray-500 font-medium">GK AutoHerb studio process & quality demonstration</p>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="px-4 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
