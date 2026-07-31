import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CreditCard, Droplets, ArrowRight, Shield } from 'lucide-react';
import { useServices } from '../../api/hooks/useServices';
import { useLoyalty } from '../../api/hooks/useLoyalty';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/shared/ErrorState';
import { formatINR } from '../../utils/formatters';
import ServiceDetailsModal from '../../components/shared/ServiceDetailsModal';

const FILTERS = ['all', 'hatchback', 'medium_hatchback', 'sedan', 'premium_sedan', 'suv'] as const;
type Filter = typeof FILTERS[number];

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
  const [filter, setFilter] = useState<Filter>('all');
  const { data: svcData, isLoading: svcLoading, isError, refetch } = useServices({ active_only: true });
  const { data: loyalty } = useLoyalty('mine');
  
  const [selectedDetailsSvc, setSelectedDetailsSvc] = useState<any>(null);

  const services = sortServicesByPriority(svcData?.data || []);
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
      <div className="relative hero-bg rounded-2xl overflow-hidden mb-8 pattern-overlay">
        <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse-dot" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Premium Detail Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            Our Services
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-lg font-medium leading-relaxed">
            Elevate your vehicle with our premium detailing services. Tap any service card to view English details and features.
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => navigate('/customer/bookings/new')} icon={<ArrowRight size={16} />}>
              Book Now
            </Button>
          </div>
        </div>
      </div>

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
          {/* ── Services Catalog ────────────────────────────── */}
          {services.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={14} className="text-[#D32F2F]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Services (Tap Card for English Details)</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {sortServicesByPriority(services).map((svc: any, idx: number) => {
                  return (
                    <div
                      key={svc.id}
                      onClick={() => setSelectedDetailsSvc(svc)}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-premium group cursor-pointer hover:border-red-200 transition-all opacity-0 animate-fade-in-up"
                      style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-[#1c1b1b] text-base group-hover:text-[#D32F2F] transition-colors">{svc.name}</h3>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">View Details ℹ️</span>
                      </div>
                      {svc.description && <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-2 leading-relaxed">{svc.description}</p>}

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {filter === 'all' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 text-center">
                            <div className="bg-[#faf7f5] rounded-lg py-2">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Hatch</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_hatchback)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-2">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Med Hatch</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_medium_hatchback)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-2">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Sedan</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_sedan)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-2">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">Prem Sedan</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_premium_sedan)}</p>
                            </div>
                            <div className="bg-[#faf7f5] rounded-lg py-2">
                              <p className="text-[8px] font-bold uppercase text-[#5f5e5e]">SUV</p>
                              <p className="text-xs font-extrabold text-[#1c1b1b]">{renderPrice(svc.price_suv)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-lg font-black text-[#D32F2F]">{renderPrice(svc[getPriceKey(filter)!])}</p>
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
                          onClick={() => navigate(`/customer/bookings/new?service_id=${svc.id}`)}
                          icon={<ArrowRight size={14} />}
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Details Modal */}
      <ServiceDetailsModal
        isOpen={!!selectedDetailsSvc}
        onClose={() => setSelectedDetailsSvc(null)}
        service={selectedDetailsSvc}
      />
    </div>
  );
}
