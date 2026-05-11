import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { PackageOpen, Car, CheckCircle, Loader2, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface Vehicle {
  id: number;
  registration_no: string;
  brand: string;
  model: string;
  category: 'hatchback' | 'medium_hatchback' | 'sedan' | 'premium_sedan' | 'suv';
}

interface Pkg {
  id: number;
  name: string;
  description: string;
  wash_count: number;
  price_hatchback: number;
  price_medium_hatchback: number;
  price_sedan: number;
  price_premium_sedan: number;
  price_suv: number;
}

export default function BuyPackagesPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  // Confirmation modal state
  const [confirmPkg, setConfirmPkg] = useState<Pkg | null>(null);

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
  }, []);

  const getPrice = (pkg: Pkg, cat: string) => {
    switch (cat) {
      case 'hatchback': return pkg.price_hatchback;
      case 'medium_hatchback': return pkg.price_medium_hatchback;
      case 'sedan': return pkg.price_sedan;
      case 'premium_sedan': return pkg.price_premium_sedan;
      case 'suv': return pkg.price_suv;
      default: return pkg.price_sedan;
    }
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
      const price = getPrice(confirmPkg, selectedVehicle.category);
      const res = await api.post('/packages/requests', {
        vehicle_id: selectedVehicle.id,
        package_id: confirmPkg.id,
        price
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
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
          <PackageOpen className="text-red-600 w-8 h-8" />
          Buy Premium Packages
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
        </div>
      )}

      {selectedVehicle && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map(pkg => {
            const price = getPrice(pkg, selectedVehicle.category);
            const isSubmitting = submittingId === pkg.id;

            const [tierName, washType] = pkg.name.includes(' - ') ? pkg.name.split(' - ') : [pkg.name, ''];

            return (
              <div key={pkg.id} className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-300">
                <div className="bg-gradient-to-br from-gray-900 to-black p-6 text-white text-center relative overflow-hidden">
                  {/* Decorative Background Icon */}
                  <PackageOpen className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5" />
                  
                  <h3 className="text-xl font-bold mb-1 relative z-10">{tierName}</h3>
                  {washType && (
                    <div className="text-red-400 text-sm font-semibold uppercase tracking-wide relative z-10 mb-2">
                      {washType}
                    </div>
                  )}
                  {pkg.wash_count > 0 && (
                    <div className="inline-block bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm relative z-10 mt-1">
                      {pkg.wash_count} Washes Included
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">₹{price}</span>
                    <span className="text-gray-500 ml-1">/ pkg</span>
                  </div>

                  <p className="text-gray-600 text-sm mb-6 flex-1 text-center">
                    {pkg.description || 'Premium auto care services tailored for your vehicle.'}
                  </p>

                  <button
                    onClick={() => handleBuyClick(pkg)}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
                    ₹{getPrice(confirmPkg, selectedVehicle.category)}
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
