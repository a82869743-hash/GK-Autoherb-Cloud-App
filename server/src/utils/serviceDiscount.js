// Admin-set service discount (migration 091): percent or flat rupees, optionally limited to a date range.

/** YYYY-MM-DD for "today" in India, to compare with DATE columns. */
function todayIST() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

const day = (d) => (d ? (d instanceof Date ? new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10) : String(d).slice(0, 10)) : null);

/** Is this service's discount running today? */
function isDiscountActive(service, today = todayIST()) {
  if (!service || !service.discount_type || !(Number(service.discount_value) > 0)) return false;
  const from = day(service.discount_starts_on);
  const to = day(service.discount_ends_on);
  if (from && today < from) return false;
  if (to && today > to) return false;
  return true;
}

/** Price after the service's discount (never below 0, whole rupees). */
function applyServiceDiscount(service, price) {
  const p = Number(price) || 0;
  if (p <= 0 || !isDiscountActive(service)) return p;
  const v = Number(service.discount_value);
  const off = service.discount_type === 'percent' ? (p * Math.min(v, 100)) / 100 : v;
  return Math.max(0, Math.round(p - off));
}

/** For API output: offer dates as plain YYYY-MM-DD plus whether the offer is running today. */
function withDiscountInfo(service) {
  return {
    ...service,
    discount_starts_on: day(service.discount_starts_on),
    discount_ends_on: day(service.discount_ends_on),
    discount_active: isDiscountActive(service),
  };
}

module.exports = { isDiscountActive, applyServiceDiscount, withDiscountInfo, todayIST };
