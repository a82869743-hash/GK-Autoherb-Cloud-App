export const APP_NAME = 'GK AutoHerb';
export const APP_VERSION = '1.0.0';

export const BRAND_COLORS = {
  red: '#D32F2F',
  redDark: '#B71C1C',
  redLight: '#FFEBEE',
  black: '#000000',
  white: '#FFFFFF',
  sidebar: '#111111',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  complete: 'bg-green-50 text-green-900 border-green-200/50',
  open: 'bg-blue-50 text-blue-900 border-blue-200/50',
  draft: 'bg-gray-100 text-gray-700 border-gray-200/50',
  cancelled: 'bg-red-50 text-red-900 border-red-200/50',
  confirmed: 'bg-blue-50 text-blue-900 border-blue-200/50',
  in_transit: 'bg-amber-50 text-amber-900 border-amber-200/50',
  delivered: 'bg-green-50 text-green-900 border-green-200/50',
  pending: 'bg-amber-50 text-amber-900 border-amber-200/50',
  paid: 'bg-green-50 text-green-900 border-green-200/50',
  new: 'bg-blue-50 text-blue-900 border-blue-200/50',
  followed_up: 'bg-amber-50 text-amber-900 border-amber-200/50',
  converted: 'bg-green-50 text-green-900 border-green-200/50',
  sent: 'bg-green-50 text-green-900 border-green-200/50',
  failed: 'bg-red-50 text-red-900 border-red-200/50',
  queued: 'bg-gray-100 text-gray-700 border-gray-200/50',
  present: 'bg-green-50 text-green-900 border-green-200/50',
  absent: 'bg-red-50 text-red-900 border-red-200/50',
  half_day: 'bg-amber-50 text-amber-900 border-amber-200/50',
};

export const VEHICLE_CATEGORIES = ['hatchback', 'sedan', 'suv'] as const;

export const UNITS = ['pcs', 'ml', 'ltr', 'ft', 'kg', 'gm', 'rolls'] as const;
