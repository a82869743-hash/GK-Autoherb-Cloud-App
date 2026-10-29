import { AppPageHeader } from '../../components/customer/ui';
import { NotificationsList, PushCard } from '../../components/shared/NotificationsInbox';

export default function NotificationsPage() {
  return (
    <div className="pb-6">
      <AppPageHeader title="Notifications" subtitle="Bookings, reminders and offers" />
      <div className="mt-3 space-y-4">
        <PushCard />
        <NotificationsList />
      </div>
    </div>
  );
}
