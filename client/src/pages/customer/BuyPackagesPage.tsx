import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import { PackageOpen, Car, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

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

  const handleBuy = async (pkg: Pkg) => {
    if (!selectedVehicle) return alert('Please select a vehicle first.');
    setSubmittingId(pkg.id);
    try {
      const price = getPrice(pkg, selectedVehicle.category);
      const res = await api.post('/packages/requests', {
        vehicle_id: selectedVehicle.id,
        package_id: pkg.id,
        price
      });
      if (res.data.success) {
        alert('Package request submitted successfully! An admin will review and approve it shortly.');
      }
    } catch (err) {
      alert('Failed to submit package request. Please try again.');
    } finally {
      setSubmittingId(null);
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
                    onClick={() => handleBuy(pkg)}
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
    </div>
  );
}
