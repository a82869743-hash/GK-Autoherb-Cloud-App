import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { PackageOpen, Car, CheckCircle, Loader2, ArrowRight, ShieldCheck, X, AlertCircle, Clock, XCircle, Check, Minus } from 'lucide-react';

interface Vehicle {
  id: number;
  registration_no: string;
  brand: string;
  model: string;
  category: 'hatchback' | 'medium_hatchback' | 'sedan' | 'premium_sedan' | 'suv';
}

interface PkgPricing {
  id: number;
  car_type: string;
  pricing_type: string;
  price: number;
}

// Map old vehicle categories to new car_type enum values
const CAR_TYPE_MAP: Record<string, string> = {
  hatchback: 'SMALL_HATCHBACK',
  medium_hatchback: 'MEDIUM_HATCHBACK',
  sedan: 'SEDAN_SUV',
  premium_sedan: 'PREMIUM_SEDAN',
  suv: 'SEDAN_SUV',
};

interface PkgService {
  id: number;
  ps_id?: number;
  name: string;
  total_count: number;
}

interface Pkg {
  id: number;
  name: string;
  description: string;
  wash_count: number;
  paid_wash_count?: number;
  price_hatchback: number;
  price_medium_hatchback: number;
  price_sedan: number;
  price_premium_sedan: number;
  price_suv: number;
  services?: PkgService[];
  pricing?: PkgPricing[];
}

// Package tier colors
const TIER_COLORS: Record<string, { gradient: string; border: string; badge: string; text: string }> = {
  bronze:   { gradient: 'from-amber-800 to-amber-950',  border: 'border-amber-400',  badge: 'bg-amber-100 text-amber-800',    text: 'text-amber-400' },
  silver:   { gradient: 'from-slate-500 to-slate-800',   border: 'border-slate-400',  badge: 'bg-slate-100 text-slate-700',    text: 'text-slate-300' },
  gold:     { gradient: 'from-yellow-600 to-yellow-900', border: 'border-yellow-500', badge: 'bg-yellow-100 text-yellow-800',  text: 'text-yellow-400' },
  diamond:  { gradient: 'from-sky-600 to-sky-900',       border: 'border-sky-400',    badge: 'bg-sky-100 text-sky-800',        text: 'text-sky-300' },
  platinum: { gradient: 'from-purple-700 to-purple-950', border: 'border-purple-400', badge: 'bg-purple-100 text-purple-800',  text: 'text-purple-300' },
};

const DEFAULT_TIER_COLOR = { gradient: 'from-gray-700 to-gray-900', border: 'border-red-500', badge: 'bg-red-100 text-red-800', text: 'text-red-400' };

function getTierKey(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(TIER_COLORS)) {
    if (lower.includes(key)) return key;
  }
  return '';
}

// All 6 service types from the flyer
const ALL_SERVICES = [
  'Car Foam Wash',
  'Body Wax Coat',
  'Two Wheeler Wash',
  'Two Wheeler Wax Coat',
  'Body Hybrid Ceramic Wax Coat',
  'Deep Cleaning',
];

export default function BuyPackagesPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [pricingType, setPricingType] = useState<'basic' | 'premium'>('basic');
  // Confirmation modal state
  const [confirmPkg, setConfirmPkg] = useState<Pkg | null>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [vehRes, pkgRes] = await Promise.all([
          api.get('/vehicles/my-vehicles'),
          api.get('/packages')
        ]);
        if (vehRes.data.success) {
          setVehicles(vehRes.data.data);
          if (vehRes.data.data.length > 0) {
            setSelectedVehicle(vehRes.data.data.find((v: any) => v.is_primary) || vehRes.data.data[0]);
          }
        }
        if (pkgRes.data.success) {
          setPackages(pkgRes.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Fetch customer's own package requests
    api.get('/packages/requests/my').then(res => {
      if (res.data.success) setMyRequests(res.data.data || []);
    }).catch(() => {});
  }, []);

  const getPrice = (pkg: Pkg, cat: string, pt: 'basic' | 'premium' = pricingType) => {
    // Try v2 pricing matrix first
    if (pkg.pricing && pkg.pricing.length > 0) {
      const carType = CAR_TYPE_MAP[cat] || 'SEDAN_SUV';
      const match = pkg.pricing.find(p => p.car_type === carType && p.pricing_type === pt);
      if (match) return Number(match.price);
    }
    // Fallback to old flat pricing
    switch (cat) {
      case 'hatchback': return Number(pkg.price_hatchback);
      case 'medium_hatchback': return Number(pkg.price_medium_hatchback);
      case 'sedan': return Number(pkg.price_sedan);
      case 'premium_sedan': return Number(pkg.price_premium_sedan);
      case 'suv': return Number(pkg.price_suv);
      default: return Number(pkg.price_sedan);
    }
  };

  // Get service count from package's services array
  const getServiceCount = (pkg: Pkg, serviceName: string): number => {
    if (!pkg.services || pkg.services.length === 0) return 0;
    const svc = pkg.services.find(s => s.name?.toLowerCase() === serviceName.toLowerCase());
    return svc ? (svc.total_count || 0) : 0;
  };

  // Step 1: User clicks "Request to Buy" → show confirmation modal
  const handleBuyClick = (pkg: Pkg) => {
    if (!selectedVehicle) {
      addToast('error', 'Please select a vehicle first.');
      return;
    }
    setConfirmPkg(pkg);
  };

  // Step 2: User confirms "Yes" → submit to admin
  const handleConfirmPurchase = async () => {
    if (!confirmPkg || !selectedVehicle) return;
    setSubmittingId(confirmPkg.id);
    try {
      const price = getPrice(confirmPkg, selectedVehicle.category, pricingType);
      const carType = CAR_TYPE_MAP[selectedVehicle.category] || 'SEDAN_SUV';
      const res = await api.post('/packages/requests', {
        vehicle_id: selectedVehicle.id,
        package_id: confirmPkg.id,
        price,
        pricing_type: pricingType,
        car_type: carType
      });
      if (res.data.success) {
        addToast('success', 'Package request submitted! Admin will review and approve it shortly.');
      }
    } catch (err) {
      addToast('error', 'Failed to submit package request. Please try again.');
    } finally {
      setSubmittingId(null);
      setConfirmPkg(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <PackageOpen className="w-4 h-4" />
          Almost 45% Discount
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Annual Car Care Packages
        </h1>
        <p className="mt-2 text-gray-600 text-sm">
          Select your vehicle to see personalized pricing for our exclusive car care packages.
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-2xl shadow-sm border border-red-100">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No Vehicles Found</h3>
          <p className="text-gray-500 mt-2">You need to add a vehicle to your profile before purchasing packages.</p>
        </div>
      ) : (
        <div className="mb-10 max-w-xl mx-auto">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Vehicle</label>
          <select
            className="w-full bg-white border-2 border-red-100 focus:border-red-500 focus:ring-0 rounded-xl py-3 px-4 shadow-sm text-gray-900 font-medium transition-colors"
            value={selectedVehicle?.id || ''}
            onChange={(e) => setSelectedVehicle(vehicles.find(v => v.id === Number(e.target.value)) || null)}
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.registration_no || 'No Reg'}) - {v.category ? v.category.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
              </option>
            ))}
          </select>

          {/* Basic / Premium Toggle */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className={`text-xs font-bold uppercase tracking-wider ${pricingType === 'basic' ? 'text-red-600' : 'text-gray-400'}`}>Basic</span>
            <button
              onClick={() => setPricingType(pricingType === 'basic' ? 'premium' : 'basic')}
              className={`relative w-14 h-7 rounded-full transition-colors ${pricingType === 'premium' ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${pricingType === 'premium' ? 'translate-x-7' : ''}`} />
            </button>
            <span className={`text-xs font-bold uppercase tracking-wider ${pricingType === 'premium' ? 'text-purple-600' : 'text-gray-400'}`}>Premium</span>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-1">Premium includes additional interior care & product upgrades</p>
        </div>
      )}

      {/* ─── Package Cards Grid ─────────────────────── */}
      {selectedVehicle && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {packages.map(pkg => {
            const price = getPrice(pkg, selectedVehicle.category);
            const isSubmitting = submittingId === pkg.id;
            const tierKey = getTierKey(pkg.name);
            const colors = TIER_COLORS[tierKey] || DEFAULT_TIER_COLOR;

            // Extract paid foam wash count from description or use wash_count
            const paidWashText = pkg.description?.match(/Pay\s+(?:For\s+)?(\d+)\s+Car\s+Foam\s+Wash/i);
            const paidWashCount = paidWashText ? parseInt(paidWashText[1]) : (pkg.wash_count || 0);

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.18)] duration-300 border-t-4 ${colors.border}`}
              >
                {/* ─── Package Header ─── */}
                <div className={`bg-gradient-to-br ${colors.gradient} p-5 text-white text-center relative overflow-hidden`}>
                  <PackageOpen className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
                  <h3 className="text-lg font-extrabold uppercase tracking-wide relative z-10">
                    {pkg.name.replace(/ Package$/i, '')}
                  </h3>
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 relative z-10">Package</p>
                  {paidWashCount > 0 && (
                    <div className="mt-3 text-xs font-semibold opacity-90 relative z-10 bg-white/10 inline-block px-3 py-1 rounded-full">
                      Pay For {paidWashCount} Car Foam Wash
                    </div>
                  )}
                </div>

                {/* ─── Complementary Services ─── */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-3 text-center">
                    Complementary
                  </p>

                  <div className="space-y-2 flex-1">
                    {ALL_SERVICES.map(svcName => {
                      const count = getServiceCount(pkg, svcName);
                      const included = count > 0;
                      return (
                        <div key={svcName} className="flex items-center gap-2">
                          {included ? (
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                              <X className="w-3 h-3 text-red-400" strokeWidth={3} />
                            </div>
                          )}
                          <span className={`text-xs ${included ? 'text-gray-800 font-semibold' : 'text-gray-400 line-through'}`}>
                            {included && count > 1 ? `${count} ` : included ? '' : ''}{svcName}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ─── Price ─── */}
                  {price > 0 && (
                    <div className="text-center mt-4 pt-3 border-t border-gray-100">
                      <span className="text-2xl font-extrabold text-gray-900">₹{price.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {/* ─── Buy Button ─── */}
                  <button
                    onClick={() => handleBuyClick(pkg)}
                    disabled={isSubmitting}
                    className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Request to Buy <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── My Package Requests ─────────────────────── */}
      {myRequests.length > 0 && (
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            My Package Requests
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {myRequests.map((req: any) => {
              const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
                pending:  { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock, label: 'Pending Approval' },
                approved: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle, label: 'Approved' },
                rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
              };
              const cfg = statusConfig[req.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={req.id} className="px-5 py-4 flex items-start gap-4">
                  <div className={`p-2 rounded-xl ${cfg.bg} border flex-shrink-0 mt-0.5`}>
                    <StatusIcon size={18} className={cfg.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-gray-900">{req.package_name}</h4>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {req.brand} {req.model} ({req.registration_no}) • ₹{req.price}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Requested: {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {req.status === 'rejected' && req.rejection_reason && (
                      <div className="mt-2 flex items-start gap-2 bg-red-50 rounded-lg p-2.5 border border-red-100">
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          <span className="font-bold">Reason: </span>{req.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal ─────────────────────── */}
      {confirmPkg && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <ShieldCheck size={20} />
                Confirm Purchase Request
              </h3>
              <button
                onClick={() => setConfirmPkg(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-5">
                You are requesting to purchase the following package. An admin will review and approve your request.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Package</span>
                  <span className="font-bold text-gray-900">{confirmPkg.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tier</span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${pricingType === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>{pricingType}</span>
                </div>

                {/* Show services included */}
                {confirmPkg.services && confirmPkg.services.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Complementary Services</p>
                    <div className="space-y-1.5">
                      {confirmPkg.services.map(svc => (
                        <div key={svc.id || svc.ps_id} className="flex items-center gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{svc.total_count > 1 ? `${svc.total_count} ` : ''}{svc.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-semibold text-gray-900">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reg No</span>
                  <span className="font-medium text-gray-700">{selectedVehicle.registration_no || '—'}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-gray-500 text-sm">Price</span>
                  <span className="text-xl font-extrabold text-red-600">
                    ₹{getPrice(confirmPkg, selectedVehicle.category).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPkg(null)}
                  disabled={submittingId === confirmPkg.id}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  No, Cancel
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={submittingId === confirmPkg.id}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {submittingId === confirmPkg.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Yes, Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
