/**
 * GK AutoHerb WhatsApp gateway.
 *
 * Links the studio WhatsApp number once (scan a QR, like WhatsApp Web) and then sends the
 * app's messages from it. Only the API on the same server talks to it.
 *
 *   GET  /status          { connected, me, queues, counters }
 *   GET  /qr              QR page to link the phone (needs ?key=GATEWAY_KEY)
 *   POST /send            { to, text, priority: 'high' | 'bulk' } → queued, sent one by one
 *   POST /logout          unlink the phone
 *
 * The sending RULES below are fixed in code on purpose (no env overrides) so the number
 * is never pushed harder by a config change. Incoming customer messages are forwarded to
 * APP_INCOMING_URL so the YES / NO bot keeps working.
 *
 * Env: GATEWAY_KEY (required), PORT=5055, HOST=127.0.0.1, APP_INCOMING_URL, AUTH_DIR=./auth,
 *      DRY_RUN=true (log instead of sending, for testing)
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');

// ── Sending rules (hard-coded) ─────────────────────────────────────────
const RULES = Object.freeze({
  HIGH_GAP_MS: [6000, 14000],        // between any two messages (booking/job/payment updates, replies)
  BULK_GAP_MS: [45000, 120000],      // between reminder / offer messages
  BREAK_EVERY_BULK: [6, 10],         // after this many bulk messages…
  BREAK_MS: [300000, 720000],        // …take a 5–12 minute break
  PER_CUSTOMER_GAP_MS: 180000,       // min 3 min between two messages to the same number
  PER_CUSTOMER_DAILY: 5,             // max messages to one number per day
  PER_CUSTOMER_BULK_DAILY: 1,        // max reminders/offers to one number per day
  HOURLY_TOTAL: 30,
  HOURLY_BULK: 20,
  DAILY_TOTAL: 150,
  DAILY_BULK: 100,
  QUIET_HOURS_IST: [21, 9],          // bulk waits between 9 pm and 9 am
  MAX_LENGTH: 1200,
});
// Only job-card and invoice links may ever leave this number
const ALLOWED_LINK = /^https?:\/\/[^/\s]+\/(job|invoice|invoices)\/[\w-]+/i;

const KEY = process.env.GATEWAY_KEY;
if (!KEY || KEY.length < 16) {
  console.error('GATEWAY_KEY (16+ chars) is required');
  process.exit(1);
}
const PORT = Number(process.env.PORT || 5055);
const HOST = process.env.HOST || '127.0.0.1';
const AUTH_DIR = path.resolve(process.env.AUTH_DIR || path.join(__dirname, 'auth'));
const DRY_RUN = process.env.DRY_RUN === 'true';
const APP_INCOMING_URL = process.env.APP_INCOMING_URL || '';

const rand = ([a, b]) => Math.round(a + Math.random() * (b - a));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const istHour = () => Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false })) % 24;
const istDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const isQuiet = () => { const [f, t] = RULES.QUIET_HOURS_IST; const h = istHour(); return f > t ? (h >= f || h < t) : (h >= f && h < t); };

let sock = null;
let connected = DRY_RUN;
let lastQr = null;
let me = DRY_RUN ? 'dry-run' : null;
const queues = { high: [], bulk: [] };
const sentLog = []; // { at, to, bulk }
let sending = false;
let bulkSinceBreak = 0;
let nextBreakAt = rand(RULES.BREAK_EVERY_BULK);
let pumpTimer = null;

function normalize(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return d;
}

function cleanText(text) {
  return String(text)
    .replace(/https?:\/\/[^\s)]+/g, (u) => (ALLOWED_LINK.test(u) ? u : ''))
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, RULES.MAX_LENGTH);
}

async function start() {
  if (DRY_RUN) { console.log('[gateway] DRY_RUN — nothing is really sent'); return; }
  const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({ auth: state, logger: pino({ level: 'warn' }), version, browser: ['GK AutoHerb', 'Chrome', '1.0'], markOnlineOnConnect: false });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) { lastQr = qr; console.log('[gateway] QR ready — open /qr to link the studio phone'); }
    if (connection === 'open') {
      connected = true; lastQr = null; me = sock.user?.id || null;
      console.log('[gateway] linked as', me);
      pump();
    }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('[gateway] phone unlinked — clearing session, new QR will show');
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      setTimeout(() => start().catch((e) => console.error('[gateway] restart failed', e.message)), 5000);
    }
  });

  // Forward customer replies to the app (YES / NO bot)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' || !APP_INCOMING_URL) return;
    for (const m of messages) {
      if (m.key.fromMe || !m.key.remoteJid?.endsWith('@s.whatsapp.net')) continue;
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
      if (!text) continue;
      fetch(APP_INCOMING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gateway-key': KEY },
        body: JSON.stringify({ from: m.key.remoteJid.split('@')[0], name: m.pushName || null, text, id: m.key.id }),
      }).catch((e) => console.error('[gateway] forward failed', e.message));
    }
  });
}

function stats(to) {
  const now = Date.now();
  while (sentLog.length && now - sentLog[0].at > 864e5) sentLog.shift();
  const day = istDay();
  const today = sentLog.filter((s) => s.day === day);
  const hour = sentLog.filter((s) => now - s.at < 36e5);
  const mine = to ? today.filter((s) => s.to === to) : [];
  return {
    hourTotal: hour.length, hourBulk: hour.filter((s) => s.bulk).length,
    dayTotal: today.length, dayBulk: today.filter((s) => s.bulk).length,
    toDay: mine.length, toBulkDay: mine.filter((s) => s.bulk).length,
    toLastAt: mine.length ? mine[mine.length - 1].at : 0,
  };
}

/** 'send' | 'wait' | 'drop' for this job right now. */
function decide(job) {
  const s = stats(job.to);
  const bulk = job.priority === 'bulk';
  if (s.toDay >= RULES.PER_CUSTOMER_DAILY) return 'drop';
  if (bulk && s.toBulkDay >= RULES.PER_CUSTOMER_BULK_DAILY) return 'drop';
  if (Date.now() - s.toLastAt < RULES.PER_CUSTOMER_GAP_MS) return 'wait';
  if (s.dayTotal >= RULES.DAILY_TOTAL || s.hourTotal >= RULES.HOURLY_TOTAL) return 'wait';
  if (bulk && (s.dayBulk >= RULES.DAILY_BULK || s.hourBulk >= RULES.HOURLY_BULK || isQuiet())) return 'wait';
  return 'send';
}

/** First job (high before bulk) that may go now; drops jobs over a per-customer cap. */
function nextJob() {
  for (const p of ['high', 'bulk']) {
    const q = queues[p];
    for (let i = 0; i < q.length; i++) {
      const d = decide(q[i]);
      if (d === 'drop') { console.log(`[gateway] skipped ${p} to ${q[i].to} (per-customer limit)`); q.splice(i, 1); i--; continue; }
      if (d === 'send') return q.splice(i, 1)[0];
    }
  }
  return null;
}

async function deliver(job) {
  const to = `${job.to}@s.whatsapp.net`;
  if (DRY_RUN) { console.log(`[dry-run] ${new Date().toISOString()} ${job.priority} → ${job.to}: ${job.text.replace(/\n/g, ' ⏎ ').slice(0, 140)}`); return; }
  const [exists] = await sock.onWhatsApp(to).catch(() => [null]);
  if (exists && exists.exists === false) throw new Error('Number is not on WhatsApp');
  await sock.presenceSubscribe(to).catch(() => {});
  await sock.sendPresenceUpdate('composing', to).catch(() => {});
  await sleep(1500 + Math.min(6000, job.text.length * 25) + Math.random() * 1500); // "typing"
  await sock.sendPresenceUpdate('paused', to).catch(() => {});
  await sock.sendMessage(to, { text: job.text });
}

async function pump() {
  if (sending) return;
  sending = true;
  clearTimeout(pumpTimer);
  try {
    while (connected) {
      const job = nextJob();
      if (!job) break;
      try {
        await deliver(job);
        sentLog.push({ at: Date.now(), day: istDay(), to: job.to, bulk: job.priority === 'bulk' });
      } catch (e) {
        console.warn('[gateway] send failed', job.to, e.message);
      }
      if (job.priority === 'bulk' && ++bulkSinceBreak >= nextBreakAt) {
        const pause = rand(RULES.BREAK_MS);
        console.log(`[gateway] break ${Math.round(pause / 1000)}s after ${bulkSinceBreak} bulk messages`);
        bulkSinceBreak = 0; nextBreakAt = rand(RULES.BREAK_EVERY_BULK);
        await sleep(pause);
      } else {
        await sleep(rand(job.priority === 'bulk' ? RULES.BULK_GAP_MS : RULES.HIGH_GAP_MS));
      }
    }
  } finally {
    sending = false;
    // Something is waiting on a gap / limit / quiet hours — look again shortly
    if (queues.high.length || queues.bulk.length) pumpTimer = setTimeout(pump, 30000);
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });
}

function send(res, code, obj, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(obj) : obj);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const authed = req.headers['x-gateway-key'] === KEY || url.searchParams.get('key') === KEY;
  if (!authed) return send(res, 401, { error: 'unauthorized' });

  if (req.method === 'GET' && url.pathname === '/status') {
    const s = stats();
    return send(res, 200, {
      connected, me, dry_run: DRY_RUN, needs_qr: !connected && Boolean(lastQr), quiet_now: isQuiet(),
      queue: { high: queues.high.length, bulk: queues.bulk.length },
      sent: { hour: s.hourTotal, today: s.dayTotal, bulk_today: s.dayBulk }, rules: RULES,
    });
  }
  if (req.method === 'GET' && url.pathname === '/qr') {
    if (connected) return send(res, 200, `<h2 style="font-family:sans-serif">Linked ✅ ${me || ''}</h2>`, 'text/html');
    if (!lastQr) return send(res, 200, '<p style="font-family:sans-serif">Waiting for QR… refresh in a few seconds.</p><script>setTimeout(()=>location.reload(),3000)</script>', 'text/html');
    const img = await QRCode.toDataURL(lastQr, { width: 320, margin: 1 });
    return send(res, 200, `<div style="font-family:sans-serif;text-align:center"><h2>Link studio WhatsApp</h2><p>WhatsApp → Settings → Linked devices → Link a device</p><img src="${img}"/></div><script>setTimeout(()=>location.reload(),15000)</script>`, 'text/html');
  }
  if (req.method === 'POST' && url.pathname === '/send') {
    const body = await readBody(req);
    const to = normalize(body.to);
    const text = body.text ? cleanText(body.text) : '';
    if (!to || !text) return send(res, 400, { error: 'to and text required' });
    if (!connected) return send(res, 503, { success: false, status: 'failed', error: 'WhatsApp not linked' });
    const all = [...queues.high, ...queues.bulk];
    if (all.some((j) => j.to === to && j.text === text)) return send(res, 200, { success: true, status: 'sent', duplicate: true });
    const p = body.priority === 'bulk' ? 'bulk' : 'high';
    queues[p].push({ to, text, priority: p });
    pump();
    return send(res, 202, { success: true, status: 'sent', queued: queues[p].length, priority: p });
  }
  if (req.method === 'POST' && url.pathname === '/logout') {
    await sock?.logout().catch(() => {});
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, HOST, () => console.log(`[gateway] listening on ${HOST}:${PORT}`));

start().catch((e) => { console.error('[gateway] start failed', e); process.exit(1); });
