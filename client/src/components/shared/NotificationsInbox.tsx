import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, BellRing, CheckCheck, Loader2, Share, SquarePlus, X } from 'lucide-react';
import { useAppNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, AppNotification } from '../../api/hooks/useAppNotifications';
import { disablePush, enablePush, getPushState, isIOS, PushState } from '../../utils/push';
import api from '../../api/axiosInstance';
import { useToastStore } from '../../store/toastStore';

function ago(iso: string) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "Get reminders on your phone" — handles Android, iPhone (needs Home Screen) and blocked permission. */
export function PushCard({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { addToast } = useToastStore();
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  useEffect(() => { getPushState().then(setState).catch(() => setState('unsupported')); }, []);

  if (state === 'loading' || state === 'unsupported') return null;

  const turnOn = async () => {
    setBusy(true);
    try {
      const s = await enablePush();
      setState(s);
      if (s === 'on') {
        await api.post('/app-notifications/push/test').catch(() => {});
        addToast('success', 'Notifications are on for this phone');
        onDone?.();
      } else if (s === 'denied') addToast('error', 'Notifications are blocked for this site in your phone settings');
    } catch (e: any) {
      addToast('error', e.message || 'Could not turn on notifications');
    } finally {
      setBusy(false);
    }
  };
  const turnOff = async () => {
    setBusy(true);
    setState(await disablePush());
    setBusy(false);
  };

  if (state === 'on') {
    return compact ? null : (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 text-sm">
        <BellRing size={20} className="text-emerald-600 shrink-0" />
        <span className="flex-1 text-emerald-800 font-semibold">Phone notifications are on</span>
        <button onClick={turnOff} disabled={busy} className="text-xs font-bold text-slate-500">Turn off</button>
      </div>
    );
  }

  if (state === 'ios-install') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="flex items-center gap-2 font-display font-extrabold text-slate-900"><Bell size={18} className="text-[#D32F2F]" /> Get reminders on your iPhone</p>
        <ol className="mt-2 space-y-1.5 text-[13px] text-slate-600">
          <li className="flex items-center gap-1.5">1. Tap <Share size={15} className="text-sky-600" /> Share at the bottom of Safari</li>
          <li className="flex items-center gap-1.5">2. Choose <SquarePlus size={15} /> <b>Add to Home Screen</b></li>
          <li>3. Open GK AutoHerb from your Home Screen and turn on notifications</li>
        </ol>
      </div>
    );
  }

  if (state === 'denied') {
    return compact ? null : (
      <div className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 text-[13px] text-slate-600">
        <BellOff size={20} className="shrink-0 text-slate-400" />
        <span>Notifications are blocked. {isIOS() ? 'Open Settings → Notifications → GK AutoHerb' : 'Tap the lock icon next to the address bar → Notifications → Allow'} and come back.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#111] p-4 text-white">
      <span className="h-11 w-11 shrink-0 rounded-xl bg-white/10 flex items-center justify-center"><BellRing size={22} /></span>
      <span className="flex-1 min-w-0">
        <span className="block font-display font-extrabold">Get reminders on your phone</span>
        <span className="block text-[12px] text-white/70">Booking reminders, “car ready” alerts and offers. Free.</span>
      </span>
      <button onClick={turnOn} disabled={busy} className="h-10 shrink-0 rounded-xl bg-[#D32F2F] px-4 text-sm font-bold flex items-center gap-1.5 disabled:opacity-60">
        {busy && <Loader2 size={15} className="animate-spin" />} Allow
      </button>
    </div>
  );
}

/** List of the user's notifications; tapping one marks it read and opens its screen. */
export function NotificationsList({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { data = [], isLoading } = useAppNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = data.filter((n) => !n.is_read).length;

  const open = (n: AppNotification) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.url) {
      onNavigate?.();
      if (/^https?:\/\//.test(n.url)) window.location.href = n.url;
      else navigate(n.url);
    }
  };

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;
  if (!data.length) {
    return (
      <div className="py-12 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#D32F2F]"><Bell size={26} /></span>
        <p className="font-display font-bold text-slate-900">No notifications yet</p>
        <p className="mt-1 text-sm text-slate-500">Booking updates and reminders will show up here.</p>
      </div>
    );
  }
  return (
    <div>
      {unread > 0 && (
        <div className="mb-2 flex justify-end">
          <button onClick={() => markAll.mutate()} className="flex items-center gap-1 text-[12.5px] font-bold text-[#D32F2F]">
            <CheckCheck size={15} /> Mark all read
          </button>
        </div>
      )}
      <div className="space-y-2">
        {data.map((n) => (
          <button key={n.id} onClick={() => open(n)}
            className={`w-full rounded-2xl border p-3.5 text-left transition-colors ${n.is_read ? 'border-slate-100 bg-white' : 'border-red-100 bg-red-50/50'}`}>
            <span className="flex items-start gap-2">
              {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D32F2F]" />}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-[14.5px] font-extrabold text-slate-900">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{ago(n.created_at)}</span>
                </span>
                <span className="mt-0.5 block whitespace-pre-line break-words text-[13px] leading-snug text-slate-600 line-clamp-4">
                  {n.body.replace(/https?:\/\/\S+/g, '').trim()}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bell with unread badge (used in admin/staff top bars). */
export function BellBadge({ count, className = '' }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D32F2F] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export { X as CloseIcon };
