import type { CapacitorConfig } from '@capacitor/cli';

// Android app for the Play Store. It opens the live site, so every website deploy reaches the app
// instantly — only native changes (plugins, icon, permissions) need a new Play Store upload.
const config: CapacitorConfig = {
  appId: 'com.gkautoherb.app',
  appName: 'GK AutoHerb',
  webDir: 'dist',
  server: {
    url: 'https://gkautobook.cloud',
    androidScheme: 'https',
    allowNavigation: ['gkautobook.cloud', '*.gkautobook.cloud', '*.razorpay.com'],
  },
  android: {
    backgroundColor: '#111111',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#111111',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
