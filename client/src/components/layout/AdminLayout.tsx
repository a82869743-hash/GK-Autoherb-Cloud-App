import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';
import MobileNavbar from './MobileNavbar';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <MobileNavbar />
      <AdminSidebar />
      <main className="lg:ml-[240px] pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
