import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useInactivityTimer, useTokenRefresh } from './utils/useInactivityTimer';
import AdminLayout from './components/layout/AdminLayout';
import CustomerLayout from './components/layout/CustomerLayout';
import StaffLayout from './components/layout/StaffLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ProtectedRoute from './router/ProtectedRoute';
import RoleRoute from './router/RoleRoute';
import ToastContainer from './components/shared/Toast';

// Job Cart pages
import JobCartListPage from './pages/admin/JobCartListPage';
import JobCartCreatePage from './pages/admin/JobCartCreatePage';
import JobCartDetailPage from './pages/admin/JobCartDetailPage';
import CustomerJobCartsPage from './pages/customer/JobCartsPage';

// Inventory pages
import InventoryPage from './pages/admin/InventoryPage';
import StaffInventoryPage from './pages/staff/InventoryPage';

// Slots & Bookings pages
import SlotsPage from './pages/admin/SlotsPage';
import CustomerBookingsPage from './pages/admin/CustomerBookingsPage';
import BookingPage from './pages/customer/BookingPage';
import BookingsPage from './pages/customer/BookingsPage';

// Services, Packages & Loyalty pages
import ServicesPage from './pages/admin/ServicesPage';
import PackagesPage from './pages/admin/PackagesPage';
import LoyaltyAwardPage from './pages/admin/LoyaltyAwardPage';
import CustomerServicesPage from './pages/customer/ServicesPage';
import LoyaltyPage from './pages/customer/LoyaltyPage';
import VehiclesPage from './pages/customer/VehiclesPage';
import ProfilePage from './pages/customer/ProfilePage';
import CustomerDashboardPage from './pages/customer/DashboardPage';
import CustomerBuyPackagesPage from './pages/customer/BuyPackagesPage';

// Staff & Accounts pages
import StaffPage from './pages/admin/StaffPage';
import StaffDetailPage from './pages/admin/StaffDetailPage';
import StaffSalaryPage from './pages/admin/StaffSalaryPage';
import AccountsPage from './pages/admin/AccountsPage';
import BuySellPage from './pages/admin/BuySellPage';
import CustomersListPage from './pages/admin/CustomersListPage';
import CustomerDetailPage from './pages/admin/CustomerDetailPage';
import ManualRegistrationPage from './pages/admin/ManualRegistrationPage';
import PackageApprovalsPage from './pages/admin/PackageApprovalsPage';
import StaffJobCartsPage from './pages/staff/StaffJobCartsPage';
import StaffBenefitsPage from './pages/staff/StaffBenefitsPage';

// Messages, Inquiries & Import pages
import MessagesPage from './pages/admin/MessagesPage';
import InquiriesPage from './pages/admin/InquiriesPage';
import ImportPage from './pages/admin/ImportPage';
import StaffInquiryPage from './pages/staff/InquiryPage';

// Settings & Dashboard Pages
// Settings, Dashboard & Billing Pages
import DashboardPage from './pages/admin/DashboardPage';
import SettingsPage from './pages/admin/SettingsPage';
import QuickBillingPage from './pages/admin/QuickBillingPage';
import AllInvoicesPage from './pages/admin/AllInvoicesPage';
import ArchivePage from './pages/admin/ArchivePage';

// Phase 2 pages
import QuickWashPage from './pages/admin/QuickWashPage';
import LoyaltySettingsPage from './pages/admin/LoyaltySettingsPage';
import PremiumServicesPage from './pages/admin/PremiumServicesPage';

// Delivery pages
import DeliveryPage from './pages/staff/DeliveryPage';
import TrackingPage from './pages/customer/TrackingPage';

// ─── Placeholder pages (replaced in later phases) ────────
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-[#f6f3f2] flex items-center justify-center mx-auto mb-4">
        <span className="text-xl">🚧</span>
      </div>
      <h2 className="text-xl font-bold text-[#1c1b1b]">{title}</h2>
      <p className="text-sm text-[#5f5e5e] mt-1">Building in next phase</p>
    </div>
  </div>
);

// ─── App ──────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, user } = useAuthStore();

  // Auto-logout after 30 min inactivity
  useInactivityTimer();

  // Silent token refresh (checks expiry on mount, refreshes every 45 min)
  useTokenRefresh();

  const getDefaultRedirect = () => {
    if (!isAuthenticated || !user) return '/login';
    const redirects: Record<string, string> = {
      admin: '/admin',
      customer: '/customer',
      staff: '/staff/job-carts',
    };
    return redirects[user.role] || '/login';
  };

  return (
    <>
      <ToastContainer />
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <LoginPage />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <RegisterPage />
      } />
      <Route path="/forgot-password" element={
        isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <ForgotPasswordPage />
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminLayout /></RoleRoute></ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="job-carts" element={<JobCartListPage />} />
        <Route path="job-carts/new" element={<JobCartCreatePage />} />
        <Route path="job-carts/:id" element={<JobCartDetailPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="slots" element={<SlotsPage />} />
        <Route path="customer-bookings" element={<CustomerBookingsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="packages" element={<PackagesPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/:id" element={<StaffDetailPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="buy-sell" element={<BuySellPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="inquiries" element={<InquiriesPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="customers" element={<CustomersListPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="add-customer" element={<ManualRegistrationPage />} />
        <Route path="package-approvals" element={<PackageApprovalsPage />} />
        {/* ─── New Admin Routes ─── */}
        <Route path="reports" element={<Placeholder title="Reports" />} />
        <Route path="billing" element={<QuickBillingPage />} />
        <Route path="invoices" element={<AllInvoicesPage />} />
        <Route path="salary" element={<StaffSalaryPage />} />
        <Route path="vendors" element={<Placeholder title="Vendor Management" />} />
        <Route path="archive" element={<ArchivePage />} />
        {/* ─── Phase 2 Routes ─── */}
        <Route path="quick-wash" element={<QuickWashPage />} />
        <Route path="loyalty" element={<LoyaltySettingsPage />} />
        <Route path="premium-services" element={<PremiumServicesPage />} />
      </Route>

      {/* Customer routes */}
      <Route path="/customer" element={
        <ProtectedRoute><RoleRoute allowedRoles={['customer']}><CustomerLayout /></RoleRoute></ProtectedRoute>
      }>
        <Route index element={<CustomerDashboardPage />} />
        <Route path="services" element={<CustomerServicesPage />} />
        <Route path="job-carts" element={<CustomerJobCartsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/new" element={<BookingPage />} />
        <Route path="loyalty" element={<LoyaltyPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="buy-packages" element={<CustomerBuyPackagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="delivery/:id" element={<TrackingPage />} />
      </Route>

      {/* Staff routes */}
      <Route path="/staff" element={
        <ProtectedRoute><RoleRoute allowedRoles={['staff']}><StaffLayout /></RoleRoute></ProtectedRoute>
      }>
        <Route index element={<Navigate to="job-carts" replace />} />
        <Route path="job-carts" element={<StaffJobCartsPage />} />
        <Route path="inventory" element={<StaffInventoryPage />} />
        <Route path="benefits" element={<StaffBenefitsPage />} />
        <Route path="inquiry" element={<StaffInquiryPage />} />
        <Route path="delivery" element={<DeliveryPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
    </Routes>
    </>
  );
}
