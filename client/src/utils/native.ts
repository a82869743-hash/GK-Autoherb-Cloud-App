import { Capacitor, registerPlugin } from '@capacitor/core';

const GkNative = registerPlugin<{ pushAvailable(): Promise<{ available: boolean }> }>('GkNative');

/** Firebase configured in this app build? (Registering push without it crashes Android.) */
async function pushReady() {
  try { return (await GkNative.pushAvailable()).available; } catch { return false; }
}

/** True inside the GK AutoHerb Android app (Capacitor), false on the website. */
export const isNativeApp = () => Capacitor.isNativePlatform();

/** Status bar colour, Android back button and notification taps — runs once at start-up in the app. */
export async function initNativeApp(navigate: (to: string) => void) {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#111111' });
  } catch { /* older Android */ }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.minimizeApp();
    });
  } catch { /* not critical */ }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.createChannel({
      id: 'gk_updates', name: 'Bookings & updates', description: 'Booking reminders, car ready, offers',
      importance: 4, visibility: 1, lights: true, vibration: true,
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      const url = a.notification?.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) navigate(url);
    });
  } catch { /* not critical */ }
}

/** Firebase token for this phone; asks permission when `prompt` is true (must follow a tap). */
export async function nativePushToken(prompt: boolean): Promise<string | 'denied' | null> {
  if (!(await pushReady())) return null;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive !== 'granted' && prompt) perm = await PushNotifications.requestPermissions();
  if (perm.receive === 'denied') return 'denied';
  if (perm.receive !== 'granted') return null;
  return new Promise((resolve) => {
    const done = (v: string | null) => { reg.then((h) => h.remove()); err.then((h) => h.remove()); resolve(v); };
    const reg = PushNotifications.addListener('registration', (t) => done(t.value));
    const err = PushNotifications.addListener('registrationError', () => done(null));
    PushNotifications.register();
    setTimeout(() => done(null), 15000);
  });
}

export async function nativePushGranted() {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  return (await PushNotifications.checkPermissions()).receive === 'granted';
}
