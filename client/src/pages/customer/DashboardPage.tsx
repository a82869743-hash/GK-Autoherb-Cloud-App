import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, Clock, Car, Sparkles, Gift, ArrowRight, ChevronRight,
  CreditCard, Droplets, Shield, Star, CalendarCheck, Wrench, Plus, Package
} from 'lucide-react';
import { useCustomerDashboard } from '../../api/hooks/useDashboard';
import { useAuthStore } from '../../store/authStore';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatINR, formatDate, formatTime } from '../../utils/formatters';
import AddCarModal from '../../components/shared/AddCarModal';

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data, isLoading } = useCustomerDashboard();
  const [showAddCar, setShowAddCar] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  if (isLoading) {
    return (
      <div className="pt-4 space-y-6">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  const loyalty = data?.loyalty || { credits: 0, free_washes: 0, wax_count: 0 };
  const vehicles = data?.vehicles || [];
  const upcomingBookings = data?.upcoming_bookings || [];
  const recentJobs = data?.recent_jobs || [];
  const totalVisits = data?.total_visits || 0;
  // Primary car: prefer explicit primary_car from API, fallback to first vehicle
  const primaryCar = data?.primary_car || (vehicles.length > 0 ? vehicles[0] : null);
  const activePackage = data?.active_package || null;
  const activePackages = data?.active_packages || (activePackage ? [activePackage] : []);

  return (
    <div className="pt-4 space-y-6">
      {/* ── Package Expiry Notification ─────────── */}
      {activePackage?.end_date && (() => {
        const daysLeft = Math.ceil((new Date(activePackage.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
          const startStr = new Date(activePackage.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const endStr = new Date(activePackage.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const isExpired = daysLeft <= 0;
          return (
            <div className={`rounded-2xl p-4 border shadow-sm ${isExpired ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl flex-shrink-0 ${isExpired ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <Package size={18} className={isExpired ? 'text-red-600' : 'text-amber-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
                    {isExpired ? '❌ Your package has expired!' : `⚠️ Your package expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`}
                  </p>
                  <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-600' : 'text-amber-700'}`}>
                    <strong>{activePackage.package_name}</strong> • Started: {startStr} • Valid Till: {endStr}
                  </p>
                </div>
                <Link
                  to="/customer/buy-packages"
                  className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    isExpired ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {isExpired ? 'Renew Now' : 'View Package'}
                </Link>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* ── Hero Welcome Section ─────────────────── */}
      <div className="relative hero-bg rounded-2xl overflow-hidden pattern-overlay">
        <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse-dot" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Premium Detail Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-1">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm font-medium mb-6">
            Welcome to your GK AutoHerb dashboard
          </p>
          
          {/* Loyalty Stats in Hero */}
          <div className="flex flex-wrap gap-6 sm:gap-10">
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Credits</p>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{formatINR(loyalty.credits || 0)}</p>
              <div className="w-10 h-[3px] bg-[#D32F2F] rounded-full mt-1.5" />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Free Washes</p>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{loyalty.free_washes || 0}</p>
              <div className="w-10 h-[3px] bg-blue-500 rounded-full mt-1.5" />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Wax Treatments</p>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{loyalty.wax_count || 0}</p>
              <div className="w-10 h-[3px] bg-purple-500 rounded-full mt-1.5" />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Total Visits</p>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{totalVisits}</p>
              <div className="w-10 h-[3px] bg-emerald-500 rounded-full mt-1.5" />
            </div>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute top-8 right-8 w-32 h-32 rounded-full border border-white/5 hidden sm:block" />
        <div className="absolute bottom-6 right-20 w-16 h-16 rounded-full border border-[#D32F2F]/10 hidden sm:block" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D32F2F] via-[#D32F2F]/40 to-transparent" />
      </div>

      {/* ── Quick Actions ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/customer/bookings/new', icon: CalendarCheck, label: 'Book Service', color: 'from-red-50 to-red-100 border-red-200 text-[#D32F2F]' },
          { to: '/customer/services', icon: Wrench, label: 'Services', color: 'from-violet-50 to-violet-100 border-violet-200 text-violet-600' },
          { to: '/customer/loyalty', icon: Gift, label: 'Rewards', color: 'from-amber-50 to-amber-100 border-amber-200 text-amber-600' },
          { to: '/customer/vehicles', icon: Car, label: 'My Cars', color: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600' },
        ].map(({ to, icon: Icon, label, color }, idx) => (
          <Link
            key={to}
            to={to}
            className={`bg-gradient-to-br ${color} border rounded-xl p-4 sm:p-5 text-center hover:shadow-lg hover:-translate-y-1 transition-all group opacity-0 animate-fade-in-up`}
            style={{ animationDelay: `${0.1 + idx * 0.06}s`, animationFillMode: 'forwards' }}
          >
            <Icon size={24} className="mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider block text-gray-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Primary Car + Active Package Row ──────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary Car Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600">
                <Car size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Primary Car</p>
                {primaryCar ? (
                  <p className="font-bold text-[#1c1b1b] text-sm">{primaryCar.brand} {primaryCar.model}</p>
                ) : (
                  <p className="text-gray-400 text-sm">No car added</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddCar(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#D32F2F] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#af101a] transition-colors"
            >
              <Plus size={12} /> Add Car
            </button>
          </div>
          {primaryCar?.registration_no && (
            <p className="text-xs text-gray-500 ml-12">{primaryCar.registration_no}</p>
          )}
        </div>

        {/* Active Package Card(s) */}
        <div className="space-y-4">
          {activePackages.length > 0 ? (
            activePackages.map((pkg: any, index: number) => (
              <div key={pkg.id || index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-400" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Active Package</span>
                        {pkg.vehicle_reg_no ? (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-extrabold uppercase tracking-wider rounded-md">
                            🚗 {pkg.vehicle_brand} {pkg.vehicle_model} ({pkg.vehicle_reg_no})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[9px] font-extrabold uppercase tracking-wider rounded-md">
                            Standard (All Cars)
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-[#1c1b1b] text-sm mt-0.5">{pkg.package_name}</p>
                      {pkg.end_date && (() => {
                        const daysLeft = Math.ceil((new Date(pkg.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysLeft > 0 && daysLeft <= 30) {
                          return <p className="text-[10px] font-bold text-orange-600 mt-0.5">⚠️ Expires in {daysLeft} days!</p>;
                        } else if (daysLeft <= 0) {
                          return <p className="text-[10px] font-bold text-red-600 mt-0.5">⚠️ Expired</p>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/customer/bookings/new?from_package=1&vehicle_id=${pkg.vehicle_id || ''}`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Book from Package
                  </button>
                </div>
                
                {pkg.start_date && pkg.end_date && (
                  <div className="ml-12 mb-3 flex items-center gap-4 text-[10px] text-gray-500 font-medium">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Purchased On</span>
                      {new Date(pkg.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Valid Till</span>
                      {new Date(pkg.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )}

                {pkg.usage && pkg.usage.length > 0 && (
                  <div className="mt-2 ml-12 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Remaining Services:</p>
                    {pkg.usage.map((u: any) => (
                      <div key={u.service_name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{u.service_name}</span>
                        <span className={`font-bold ${u.remaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{u.remaining} / {u.total_count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-400" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Your Package</p>
                  <p className="text-gray-400 text-sm">No active package</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content Grid ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Upcoming Bookings (wider) */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#D32F2F]" />
              <h2 className="font-bold text-[#1c1b1b]">Upcoming Appointments</h2>
            </div>
            <Link to="/customer/bookings" className="text-[#D32F2F] text-xs font-bold uppercase hover:underline flex items-center gap-1">
              All <ChevronRight size={12} />
            </Link>
          </div>
          {upcomingBookings.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {upcomingBookings.map((b: any, idx: number) => {
                const dateObj = b.slot_date ? new Date(b.slot_date) : null;
                return (
                  <div
                    key={b.id}
                    className="px-6 py-4 hover:bg-[#faf7f5] transition-colors opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600">
                          <CalendarCheck size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1c1b1b]">
                            {b.service_name || b.package_name || 'Service Booking'}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            {dateObj && (
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {b.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {formatTime(b.start_time)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold uppercase tracking-wider rounded-md">
                        {b.status}
                      </span>
                    </div>
                    {(b.vehicle_brand || b.vehicle_model) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-[52px]">
                        <Car size={12} className="text-[#D32F2F]" />
                        {b.vehicle_brand} {b.vehicle_model} {b.vehicle_reg_no ? `(${b.vehicle_reg_no})` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center">
              <Calendar size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-3">No upcoming appointments</p>
              <Button onClick={() => navigate('/customer/bookings/new')} icon={<CalendarCheck size={14} />} size="sm">
                Book a Service
              </Button>
            </div>
          )}
        </div>

        {/* My Cars (narrower right column) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Car size={16} className="text-[#D32F2F]" />
              <h2 className="font-bold text-[#1c1b1b]">My Vehicles</h2>
            </div>
            <Link to="/customer/vehicles" className="text-[#D32F2F] text-xs font-bold uppercase hover:underline flex items-center gap-1">
              All <ChevronRight size={12} />
            </Link>
          </div>
          {vehicles.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {vehicles.slice(0, 4).map((v: any, idx: number) => (
                <div
                  key={v.id}
                  className="px-6 py-3.5 hover:bg-[#faf7f5] transition-colors opacity-0 animate-fade-in-up flex items-center gap-3"
                  style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'forwards' }}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-500">
                    <Car size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#1c1b1b] truncate">{v.registration_no}</p>
                    <p className="text-xs text-gray-500">{v.brand} {v.model}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Car size={36} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500 text-sm font-medium">No vehicles registered yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Service History ────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#D32F2F]" />
            <h2 className="font-bold text-[#1c1b1b]">Recent Service History</h2>
          </div>
          <Link to="/customer/job-carts" className="text-[#D32F2F] text-xs font-bold uppercase hover:underline flex items-center gap-1">
            View All <ChevronRight size={12} />
          </Link>
        </div>
        {recentJobs.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {recentJobs.map((job: any, idx: number) => (
              <div
                key={job.id}
                className="px-6 py-4 hover:bg-[#faf7f5] transition-colors opacity-0 animate-fade-in-up flex items-center justify-between"
                style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-500 text-xs font-black">
                    V{job.visit_number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#1c1b1b]">{job.registration_no}</h4>
                      <StatusBadge status={job.status === 'complete' ? 'completed' : job.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.brand} {job.model}
                      {job.visit_date && <span className="text-gray-400 ml-2">• {formatDate(job.visit_date)}</span>}
                    </p>
                    {job.services_done && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-sm">{job.services_done}</p>
                    )}
                  </div>
                </div>
                {job.invoice_number && (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 hidden sm:block">
                    {job.invoice_number}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Wrench size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">No service history yet</p>
            <p className="text-xs text-gray-400">Your completed services will appear here</p>
          </div>
        )}
      </div>

      {/* ── Free Wash CTA ────────────────────────── */}
      {loyalty.free_washes > 0 && (
        <div className="bg-gradient-to-r from-[#af101a] to-[#D32F2F] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                <Gift size={28} />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">You have {loyalty.free_washes} free wash{loyalty.free_washes > 1 ? 'es' : ''}!</h3>
                <p className="text-white/70 text-sm font-medium">Redeem your reward by booking a service</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/customer/bookings/new?free_wash=true')}
              className="px-6 py-3 bg-white text-[#D32F2F] font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] text-sm uppercase tracking-wider flex items-center gap-2"
            >
              <Gift size={16} /> Redeem Now
            </button>
          </div>
        </div>
      )}

      {/* ── Add Car Modal ────────────────────────────── */}
      <AddCarModal isOpen={showAddCar} onClose={() => setShowAddCar(false)} />
    </div>
  );
}
