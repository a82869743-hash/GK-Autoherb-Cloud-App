import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CreditCard, Droplets, ArrowRight, Shield, Star } from 'lucide-react';
import { useServices } from '../../api/hooks/useServices';
import { usePackages } from '../../api/hooks/usePackages';
import { useLoyalty } from '../../api/hooks/useLoyalty';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { formatINR } from '../../utils/formatters';

const FILTERS = ['all', 'hatchback', 'medium_hatchback', 'sedan', 'premium_sedan', 'suv'] as const;
type Filter = typeof FILTERS[number];

// ─── Service Priority Sorting ─────────────────
// Hot services appear first: washes, PPF, coating, polish, ceramic, then the rest
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
  const [filter, setFilter] = useState<Filter>('all');
  const { data: svcData, isLoading: svcLoading } = useServices({ active_only: true });
  const { data: pkgData, isLoading: pkgLoading } = usePackages({ published_only: true });
  const { data: loyalty } = useLoyalty('mine');

  const services = sortServicesByPriority(svcData?.data || []);
  const packages = pkgData?.data || [];
  const isLoading = svcLoading || pkgLoading;

  const getPriceKey = (f: Filter) => f === 'all' ? null : `price_${f}`;

  return (
    <div className="pt-4">
      {/* ── Hero Banner ──────────────────────────────────── */}
      <div className="relative hero-bg rounded-2xl overflow-hidden mb-8 pattern-overlay">
        <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse-dot" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Premium Detail Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            Services & Packages
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-lg font-medium leading-relaxed">
            Elevate your vehicle with our premium detailing services. Aerospace-grade materials, artisan techniques.
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => navigate('/customer/bookings/new')} icon={<ArrowRight size={16} />}>
              Book Now
            </Button>
            <Button variant="ghost" className="!text-gray-400 hover:!text-white hover:!bg-white/10 after:!bg-white" onClick={() => navigate('/customer/loyalty')}>
              View Rewards
            </Button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-8 right-8 w-32 h-32 rounded-full border border-white/5 hidden sm:block" />
        <div className="absolute bottom-6 right-20 w-16 h-16 rounded-full border border-[#D32F2F]/10 hidden sm:block" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D32F2F] via-[#D32F2F]/40 to-transparent" />
      </div>

      {/* ── Loyalty Banner ───────────────────────────────── */}
      {loyalty && (
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 p-4 sm:p-5 bg-white rounded-xl shadow-sm border border-gray-100 card-premium">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D32F2F]/10 flex items-center justify-center">
              <CreditCard size={16} className="text-[#D32F2F]" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#5f5e5e] uppercase tracking-wider block">Credits</span>
              <span className="text-sm font-extrabold text-[#1c1b1b]">{formatINR(loyalty.credits || 0)}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Droplets size={16} className="text-blue-500" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#5f5e5e] uppercase tracking-wider block">Free Washes</span>
              <span className="text-sm font-extrabold text-[#1c1b1b]">{loyalty.free_washes || 0}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Sparkles size={16} className="text-purple-500" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#5f5e5e] uppercase tracking-wider block">Wax</span>
              <span className="text-sm font-extrabold text-[#1c1b1b]">{loyalty.wax_count || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ──────────────────────────────────── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              filter === f
                ? 'bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white shadow-md shadow-[#D32F2F]/20'
                : 'bg-white text-[#5f5e5e] hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {f === 'all' ? 'All' : f === 'medium_hatchback' ? 'Med Hatch' : f === 'premium_sedan' ? 'Prem Sedan' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="space-y-10">
          {/* ── Services ─────────────────────────────────── */}
          {services.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={14} className="text-[#D32F2F]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Services</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {sortServicesByPriority(services).map((svc: any, idx: number) => (
                  <div
                    key={svc.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-premium group opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-[#1c1b1b] text-base group-hover:text-[#D32F2F] transition-colors">{svc.name}</h3>
                      <ArrowRight size={16} className="text-gray-400 group-hover:text-[#D32F2F] group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                    </div>
                    {svc.description && <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-2 leading-relaxed">{svc.description}</p>}

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {filter === 'all' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 text-center">
                          <div className="bg-[#faf7f5] rounded-lg py-2">
                            <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Hatch</p>
                            <p className="text-xs font-extrabold text-[#1c1b1b]">{formatINR(svc.price_hatchback)}</p>
                          </div>
                          <div className="bg-[#faf7f5] rounded-lg py-2">
                            <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Med Hatch</p>
                            <p className="text-xs font-extrabold text-[#1c1b1b]">{formatINR(svc.price_medium_hatchback)}</p>
                          </div>
                          <div className="bg-[#faf7f5] rounded-lg py-2">
                            <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Sedan</p>
                            <p className="text-xs font-extrabold text-[#1c1b1b]">{formatINR(svc.price_sedan)}</p>
                          </div>
                          <div className="bg-[#faf7f5] rounded-lg py-2">
                            <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Prem Sedan</p>
                            <p className="text-xs font-extrabold text-[#1c1b1b]">{formatINR(svc.price_premium_sedan)}</p>
                          </div>
                          <div className="bg-[#faf7f5] rounded-lg py-2">
                            <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">SUV</p>
                            <p className="text-xs font-extrabold text-[#1c1b1b]">{formatINR(svc.price_suv)}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-lg font-black text-[#D32F2F]">{formatINR(svc[getPriceKey(filter)!])}</p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => navigate(`/customer/bookings/new?service_id=${svc.id}`)}
                      icon={<ArrowRight size={14} />}
                    >
                      Book Now
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Packages ─────────────────────────────────── */}
          {packages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} className="text-[#D32F2F]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Packages</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {packages.map((pkg: any, idx: number) => (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-premium group relative overflow-hidden opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
                  >
                    {/* Red accent top bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#af101a] to-[#D32F2F]" />
                    
                    <div className="flex items-center gap-2 mb-1 mt-1">
                      <Sparkles size={14} className="text-[#D32F2F]" />
                      <h3 className="font-bold text-[#1c1b1b] text-base group-hover:text-[#D32F2F] transition-colors">{pkg.name}</h3>
                    </div>
                    {pkg.description && <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-2 leading-relaxed">{pkg.description}</p>}

                    {/* Included services */}
                    {pkg.services?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-1.5">Includes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.services.map((s: any) => (
                            <span key={s.id} className="px-2.5 py-1 bg-[#f6f3f2] rounded-md text-[10px] font-bold text-[#5f5e5e] border border-gray-100">{s.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Benefits badges */}
                    <div className="flex gap-2 mt-3">
                      {pkg.wash_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-lg text-[10px] font-bold text-blue-600 border border-blue-100">
                          <Droplets size={10} /> {pkg.wash_count} Washes
                        </span>
                      )}
                      {pkg.wax_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 rounded-lg text-[10px] font-bold text-purple-600 border border-purple-100">
                          <Sparkles size={10} /> {pkg.wax_count} Wax
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {filter === 'all' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 text-center">
                          <div className="bg-[#faf7f5] rounded-lg py-2"><p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Hatch</p><p className="text-xs font-extrabold">{formatINR(pkg.price_hatchback)}</p></div>
                          <div className="bg-[#faf7f5] rounded-lg py-2"><p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Med Hatch</p><p className="text-xs font-extrabold">{formatINR(pkg.price_medium_hatchback)}</p></div>
                          <div className="bg-[#faf7f5] rounded-lg py-2"><p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Sedan</p><p className="text-xs font-extrabold">{formatINR(pkg.price_sedan)}</p></div>
                          <div className="bg-[#faf7f5] rounded-lg py-2"><p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Prem Sedan</p><p className="text-xs font-extrabold">{formatINR(pkg.price_premium_sedan)}</p></div>
                          <div className="bg-[#faf7f5] rounded-lg py-2"><p className="text-[8px] font-bold uppercase text-[#5f5e5e]">SUV</p><p className="text-xs font-extrabold">{formatINR(pkg.price_suv)}</p></div>
                        </div>
                      ) : (
                        <p className="text-lg font-black text-[#D32F2F]">{formatINR(pkg[getPriceKey(filter)!])}</p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => navigate(`/customer/bookings/new?package_id=${pkg.id}`)}
                      icon={<ArrowRight size={14} />}
                    >
                      Book Now
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!services.length && !packages.length && (
            <div className="text-center py-12 text-[#5f5e5e]">No services available yet. Check back soon!</div>
          )}
        </div>
      )}
    </div>
  );
}
