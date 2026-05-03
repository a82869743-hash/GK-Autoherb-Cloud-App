import { useState, useEffect } from 'react';
import { 
  Briefcase, IndianRupee, Package, Users, TrendingUp, TrendingDown,
  Calendar, Clock, ChevronRight, Car, CalendarCheck, AlertTriangle,
  UserCheck, ArrowUpRight, Zap, BarChart3, ShieldCheck, Bell
} from 'lucide-react';
import { useDashboardStats } from '../../api/hooks/useDashboard';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import AdminTopBar from '../../components/layout/AdminTopBar';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../api/axiosInstance';
import { formatTime, formatINR, timeAgo } from '../../utils/formatters';
import io from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';

export default function DashboardPage() {
  const { token } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentJobs, isLoading: jobsLoading } = useJobCarts({ limit: 5 });

  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/pending', { params: { limit: 10 } });
      setTodayBookings(res.data.data || []);
    } catch {
      setTodayBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    
    if (!token) return;
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000', {
      auth: { token }
    });

    socket.on('new_booking', () => {
      fetchBookings();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const jobs = recentJobs?.data || [];
  const greeting = currentTime.getHours() < 12 ? 'Good Morning' : currentTime.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  // ── Stat Card Component ─────────────────────
  const StatCard = ({ title, value, subtitle, colorClass, icon: Icon, to, trend, alert }: any) => {
    const content = (
      <div className={`relative bg-white p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group h-full overflow-hidden ${
        to ? 'cursor-pointer' : ''
      } ${alert ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
        {/* Subtle gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${
          alert ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-[#af101a] to-[#D32F2F] opacity-0 group-hover:opacity-100 transition-opacity'
        }`} />
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${colorClass} transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
            <Icon size={20} />
          </div>
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
              trend > 0 ? 'bg-green-50 text-green-600' : trend < 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
            }`}>
              {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : null}
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-1">{title}</p>
        <h3 className="text-2xl font-black text-[#1c1b1b] tracking-tight mb-1">{value}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-gray-500 font-medium">{subtitle}</span>
          {to && <ArrowUpRight size={14} className="text-gray-300 group-hover:text-[#D32F2F] transition-colors" />}
        </div>
      </div>
    );
    return to ? <Link to={to} className="block h-full">{content}</Link> : content;
  };

  return (
    <>
      {/* ── Header with greeting ──────────────── */}
      <header className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="border-l-4 pl-6" style={{ borderImage: 'linear-gradient(to bottom, #af101a, #D32F2F) 1' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D32F2F] mb-1">{greeting}</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1c1b1b]">
            DASHBOARD
          </h2>
          <p className="text-[#5f5e5e] text-sm font-medium mt-1 flex items-center gap-2">
            <Clock size={14} />
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="text-gray-300">•</span>
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              title="Notifications"
            >
              <Bell size={18} className="text-gray-600" />
              {!statsLoading && stats?.expiring_packages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {stats.expiring_packages}
                </span>
              )}
            </button>
            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-bold text-[#1c1b1b] uppercase tracking-wider">Notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {stats?.expiring_packages > 0 ? (
                    (stats.expiring_package_details || []).map((pkg: any) => {
                      const daysLeft = Math.ceil((new Date(pkg.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={pkg.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-xs font-bold text-[#1c1b1b]">{pkg.customer_name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {pkg.package_name} — <span className={daysLeft <= 7 ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'}>{daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}</span>
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-400 text-xs">
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link 
            to="/admin/job-carts/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white font-bold rounded-xl shadow-lg shadow-[#D32F2F]/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all text-sm uppercase tracking-wider"
          >
            <Zap size={16} /> New Job Cart
          </Link>
        </div>
      </header>

      {/* ── KPI Grid ─────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Today's Revenue" 
            value={formatINR(stats?.today_revenue || 0)}
            icon={IndianRupee} 
            subtitle={`Month: ${formatINR(stats?.month_revenue || 0)}`}
            colorClass="bg-emerald-100 text-emerald-600"
            to="/admin/accounts"
            trend={stats?.revenue_change}
          />
          <StatCard 
            title="Active Jobs" 
            value={stats?.open_job_carts || 0} 
            icon={Briefcase} 
            subtitle={`${stats?.completedLast7Days || 0} completed this week`}
            colorClass="bg-[#D32F2F]/10 text-[#D32F2F]"
            to="/admin/job-carts"
          />
          <StatCard 
            title="Today's Bookings" 
            value={stats?.todayBookings || 0}
            icon={CalendarCheck}
            subtitle={`${stats?.totalCustomers || 0} total customers`}
            colorClass="bg-violet-100 text-violet-600"
            to="/admin/customer-bookings"
          />
          <StatCard 
            title="Low Stock" 
            value={stats?.low_stock_items || 0} 
            icon={Package} 
            subtitle="Items below threshold"
            colorClass={stats?.low_stock_items > 0 ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}
            to="/admin/inventory"
            alert={stats?.low_stock_items > 3}
          />
          <StatCard 
            title="New Leads" 
            value={stats?.newLeads || 0} 
            icon={Users} 
            subtitle="Unanswered inquiries"
            colorClass="bg-orange-100 text-orange-600"
            to="/admin/inquiries"
          />
          <StatCard 
            title="Staff Present" 
            value={stats?.staffPresent || 0}
            icon={UserCheck}
            subtitle="Checked in today"
            colorClass="bg-teal-100 text-teal-600"
            to="/admin/staff"
          />
        </div>
      )}
      {/* ── Package Expiry Notification ─────────── */}
      {!statsLoading && stats?.expiring_packages > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-amber-800 text-sm mb-1">
                ⚠️ {stats.expiring_packages} Package{stats.expiring_packages > 1 ? 's' : ''} Expiring Soon
              </h3>
              <p className="text-xs text-amber-700 mb-3">
                The following customer packages will expire within the next 30 days. Consider reaching out to them for renewal.
              </p>
              <div className="space-y-2">
                {(stats.expiring_package_details || []).slice(0, 5).map((pkg: any) => {
                  const endDate = new Date(pkg.end_date);
                  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={pkg.id} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2 text-xs">
                      <div>
                        <span className="font-bold text-[#1c1b1b]">{pkg.customer_name}</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-600">{pkg.customer_mobile}</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-amber-700 font-semibold">{pkg.package_name}</span>
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Grid ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Job Carts */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#D32F2F]" />
              <h2 className="font-bold text-[#1c1b1b]">Recent Job Carts</h2>
            </div>
            <Link to="/admin/job-carts" className="text-[#D32F2F] text-xs font-bold uppercase hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          
          <div>
            {jobsLoading ? (
              <div className="p-6 space-y-4">
                {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : jobs.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {jobs.slice(0, 5).map((job: any, idx: number) => (
                  <Link
                    key={job.id}
                    to={`/admin/job-carts/${job.id}`}
                    className="px-6 py-4 hover:bg-[#faf7f5] flex items-center justify-between transition-all group block opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-500 font-bold text-sm group-hover:from-[#D32F2F]/10 group-hover:to-[#D32F2F]/5 group-hover:text-[#D32F2F] transition-all">
                        <Car size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1c1b1b] group-hover:text-[#D32F2F] transition-colors">
                          {job.registration_no}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {job.customer_name} • {job.brand} {job.model}
                          {job.created_at && <span className="text-gray-400 ml-2">• {timeAgo(job.created_at)}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={job.status} />
                      <ChevronRight size={14} className="text-gray-200 group-hover:text-[#D32F2F] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Briefcase size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No job carts yet</p>
                <Link to="/admin/job-carts/new" className="text-[#D32F2F] text-sm font-bold mt-2 inline-block hover:underline">
                  Create your first job cart →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#D32F2F]" />
                <h2 className="font-bold text-[#1c1b1b]">Quick Actions</h2>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { to: '/admin/job-carts/new', icon: Briefcase, label: 'New Job', color: 'from-red-50 to-red-100 border-red-200' },
                { to: '/admin/slots', icon: CalendarCheck, label: 'Manage Slots', color: 'from-violet-50 to-violet-100 border-violet-200' },
                { to: '/admin/messages', icon: Users, label: 'SMS Blast', color: 'from-blue-50 to-blue-100 border-blue-200' },
                { to: '/admin/accounts', icon: IndianRupee, label: 'Accounts', color: 'from-emerald-50 to-emerald-100 border-emerald-200' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to} className={`bg-gradient-to-br ${color} border rounded-xl p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all group`}>
                  <Icon size={22} className="mx-auto mb-2 text-gray-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#D32F2F]" />
                <h2 className="font-bold text-[#1c1b1b]">Pending Approvals</h2>
              </div>
              <Link to="/admin/customer-bookings" className="text-[#D32F2F] text-xs font-bold uppercase hover:underline flex items-center gap-1">
                All <ChevronRight size={12} />
              </Link>
            </div>
            <div>
              {bookingsLoading ? (
                <div className="p-4 space-y-3">
                  {[1,2].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}
                </div>
              ) : todayBookings.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {todayBookings.slice(0, 5).map((b: any, idx: number) => (
                    <div key={b.id} className="px-6 py-3.5 hover:bg-[#faf7f5] transition-colors opacity-0 animate-fade-in-up"
                      style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'forwards' }}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-[#1c1b1b] truncate pr-2">{b.customer_name}</h4>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                          b.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200' :
                          b.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>{b.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">{b.service_name || b.package_name || 'Booking'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1.5">
                        {b.slot_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(b.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {b.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(b.start_time)}
                          </span>
                        )}
                        {(b.vehicle_brand || b.vehicle_model) && (
                          <span className="flex items-center gap-1">
                            <Car size={10} className="text-[#D32F2F]" />
                            {b.vehicle_brand} {b.vehicle_model}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Calendar size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm font-medium">No pending approvals</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts Panel */}
          {stats && (stats.low_stock_items > 0 || stats.pending_staff_payments > 0 || stats.newLeads > 0) && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-amber-200/50 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h2 className="font-bold text-amber-800 text-sm">Needs Attention</h2>
              </div>
              <div className="p-4 space-y-2">
                {stats.low_stock_items > 0 && (
                  <Link to="/admin/inventory" className="flex items-center justify-between p-3 bg-white/60 rounded-xl hover:bg-white transition-colors group">
                    <span className="text-sm text-amber-800 font-medium">{stats.low_stock_items} items low on stock</span>
                    <ChevronRight size={14} className="text-amber-400 group-hover:text-amber-600" />
                  </Link>
                )}
                {stats.pending_staff_payments > 0 && (
                  <Link to="/admin/staff" className="flex items-center justify-between p-3 bg-white/60 rounded-xl hover:bg-white transition-colors group">
                    <span className="text-sm text-amber-800 font-medium">{formatINR(stats.pending_staff_payments)} pending payouts</span>
                    <ChevronRight size={14} className="text-amber-400 group-hover:text-amber-600" />
                  </Link>
                )}
                {stats.newLeads > 0 && (
                  <Link to="/admin/inquiries" className="flex items-center justify-between p-3 bg-white/60 rounded-xl hover:bg-white transition-colors group">
                    <span className="text-sm text-amber-800 font-medium">{stats.newLeads} new inquiries</span>
                    <ChevronRight size={14} className="text-amber-400 group-hover:text-amber-600" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
