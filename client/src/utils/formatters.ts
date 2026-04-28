// Currency formatter (Indian Rupees)
export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// Date formatter
export const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Time formatter (12-hour)
export const formatTime = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12)}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// Mobile masking
export const maskMobile = (mobile: string): string =>
  mobile.replace(/(\d{6})(\d{4})/, '$1****');

// Registration number formatting
export const formatRegNo = (regNo: string): string =>
  regNo.toUpperCase().replace(/\s+/g, '');

// Relative time
export const timeAgo = (date: string): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
