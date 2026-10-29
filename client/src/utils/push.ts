import api from '../api/axiosInstance';

/** Phone notifications (web push). Free — no SMS/WhatsApp provider needed. */

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;

/** iPhone only allows notifications once the site is added to the Home Screen. */
export const needsIOSInstall = () => isIOS() && !isStandalone();

export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

let regPromise: Promise<ServiceWorkerRegistration | null> | null = null;
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null);
  if (!regPromise) {
    regPromise = navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => null);
  }
  return regPromise;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function getPushState(): Promise<PushState> {
  if (needsIOSInstall() && !pushSupported()) return 'ios-install';
  if (!pushSupported()) return needsIOSInstall() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Ask permission (must be called from a tap) and save this phone for notifications. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return needsIOSInstall() ? 'ios-install' : 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registerServiceWorker();
  if (!reg) return 'unsupported';
  const { data } = await api.get('/app-notifications/push/public-key');
  if (!data?.key) throw new Error('Notifications are not set up on the server yet.');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.key) });
  }
  await api.post('/app-notifications/push/subscribe', sub.toJSON());
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.post('/app-notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return 'off';
}

/** After login: if this phone already allowed notifications, link it to this account (no prompt). */
export async function refreshPushSubscription() {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    await enablePush();
  } catch {
    /* not critical */
  }
}

/** On logout: unlink this phone so the next person using it doesn't get the previous user's alerts. */
export function unlinkPushOnLogout(token: string | null) {
  try {
    if (!token || !pushSupported()) return;
    navigator.serviceWorker.getRegistration('/').then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
      fetch(`${base}/app-notifications/push/unsubscribe`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }).catch(() => {});
  } catch {
    /* not critical */
  }
}
