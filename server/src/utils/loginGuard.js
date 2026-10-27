// Slows down password guessing on /auth/login. Kept in memory (one API process under pm2).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_MOBILE = 5;
const MAX_PER_IP = 20;

const failures = new Map(); // key -> [timestamps]

function recent(key) {
  const now = Date.now();
  const list = (failures.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

/** Minutes left on a lock, or 0 when login may be tried. */
function lockedMinutes(mobile, ip) {
  const byMobile = recent(`m:${mobile}`);
  const byIp = recent(`ip:${ip}`);
  const hit = byMobile.length >= MAX_PER_MOBILE ? byMobile : byIp.length >= MAX_PER_IP ? byIp : null;
  if (!hit) return 0;
  return Math.max(1, Math.ceil((hit[0] + WINDOW_MS - Date.now()) / 60000));
}

function fail(mobile, ip) {
  for (const key of [`m:${mobile}`, `ip:${ip}`]) failures.set(key, [...recent(key), Date.now()]);
}

function success(mobile) {
  failures.delete(`m:${mobile}`);
}

// Keep the map small
setInterval(() => { for (const key of failures.keys()) recent(key); }, WINDOW_MS).unref();

module.exports = { lockedMinutes, fail, success };
