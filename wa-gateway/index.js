/**
 * GK AutoHerb WhatsApp gateway.
 *
 * Links the studio WhatsApp number once (scan a QR, like WhatsApp Web) and then sends the
 * app's messages from it. Only the API on the same server talks to it.
 *
 *   GET  /status          { connected, me, queue }
 *   GET  /qr              QR page to link the phone (needs ?key=GATEWAY_KEY)
 *   POST /send            { to, text } → queued, sent one by one with a pause
 *   POST /logout          unlink the phone
 *
 * Incoming customer messages are forwarded to APP_INCOMING_URL so the existing
 * YES / NO reminder bot keeps working.
 *
 * Env: GATEWAY_KEY (required), PORT=5055, HOST=127.0.0.1, APP_INCOMING_URL,
 *      MIN_GAP_MS=6000, MAX_GAP_MS=12000, DAILY_LIMIT=250, AUTH_DIR=./auth
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

const KEY = process.env.GATEWAY_KEY;
if (!KEY || KEY.length < 16) {
  console.error('GATEWAY_KEY (16+ chars) is required');
  process.exit(1);
}
const PORT = Number(process.env.PORT || 5055);
const HOST = process.env.HOST || '127.0.0.1';
const AUTH_DIR = path.resolve(process.env.AUTH_DIR || path.join(__dirname, 'auth'));
const MIN_GAP = Number(process.env.MIN_GAP_MS || 6000);
const MAX_GAP = Number(process.env.MAX_GAP_MS || 12000);
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 250);
const APP_INCOMING_URL = process.env.APP_INCOMING_URL || '';

const log = pino({ level: 'warn' });
let sock = null;
let connected = false;
let lastQr = null;
let me = null;
const queue = [];
let sending = false;
let sentToday = 0;
let today = new Date().toDateString();

function jid(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return d ? `${d}@s.whatsapp.net` : null;
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({ auth: state, logger: log, version, browser: ['GK AutoHerb', 'Chrome', '1.0'], markOnlineOnConnect: false });
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
      setTimeout(() => start().catch((e) => console.error('[gateway] restart failed', e.message)), 3000);
    }
  });

  // Forward customer replies to the app (YES / NO bot)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' || !APP_INCOMING_URL) return;
    for (const m of messages) {
      if (m.key.fromMe || !m.key.remoteJid?.endsWith('@s.whatsapp.net')) continue;
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text
        || m.message?.buttonsResponseMessage?.selectedButtonId || '';
      if (!text) continue;
      fetch(APP_INCOMING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gateway-key': KEY },
        body: JSON.stringify({ from: m.key.remoteJid.split('@')[0], name: m.pushName || null, text, id: m.key.id }),
      }).catch((e) => console.error('[gateway] forward failed', e.message));
    }
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pump() {
  if (sending) return;
  sending = true;
  try {
    while (queue.length && connected) {
      if (new Date().toDateString() !== today) { today = new Date().toDateString(); sentToday = 0; }
      if (sentToday >= DAILY_LIMIT) { console.warn('[gateway] daily limit reached, holding queue'); break; }
      const job = queue.shift();
      try {
        const to = jid(job.to);
        const [exists] = await sock.onWhatsApp(to).catch(() => [null]);
        if (exists && exists.exists === false) { job.done({ success: false, status: 'failed', error: 'Number is not on WhatsApp' }); continue; }
        await sock.sendPresenceUpdate('composing', to).catch(() => {});
        await sleep(1200 + Math.min(4000, job.text.length * 15));
        const res = await sock.sendMessage(to, { text: job.text });
        sentToday += 1;
        job.done({ success: true, status: 'sent', provider_message_id: res?.key?.id || null });
      } catch (e) {
        job.done({ success: false, status: 'failed', error: e.message });
      }
      await sleep(MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP));
    }
  } finally {
    sending = false;
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
    return send(res, 200, { connected, me, queue: queue.length, sent_today: sentToday, daily_limit: DAILY_LIMIT, needs_qr: !connected && Boolean(lastQr) });
  }
  if (req.method === 'GET' && url.pathname === '/qr') {
    if (connected) return send(res, 200, `<h2 style="font-family:sans-serif">Linked ✅ ${me || ''}</h2>`, 'text/html');
    if (!lastQr) return send(res, 200, '<p style="font-family:sans-serif">Waiting for QR… refresh in a few seconds.</p><script>setTimeout(()=>location.reload(),3000)</script>', 'text/html');
    const img = await QRCode.toDataURL(lastQr, { width: 320, margin: 1 });
    return send(res, 200, `<div style="font-family:sans-serif;text-align:center"><h2>Link studio WhatsApp</h2><p>WhatsApp → Settings → Linked devices → Link a device</p><img src="${img}"/></div><script>setTimeout(()=>location.reload(),15000)</script>`, 'text/html');
  }
  if (req.method === 'POST' && url.pathname === '/send') {
    const { to, text } = await readBody(req);
    if (!to || !text) return send(res, 400, { error: 'to and text required' });
    if (!connected) return send(res, 503, { success: false, status: 'failed', error: 'WhatsApp not linked' });
    // The app does not wait for the paced send — it is told the message is accepted
    queue.push({ to, text: String(text).slice(0, 4000), done: (r) => { if (!r.success) console.warn('[gateway] send failed', r.error); } });
    pump();
    return send(res, 202, { success: true, status: 'sent', queued: queue.length });
  }
  if (req.method === 'POST' && url.pathname === '/logout') {
    await sock?.logout().catch(() => {});
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, HOST, () => console.log(`[gateway] listening on ${HOST}:${PORT}`));

start().catch((e) => { console.error('[gateway] start failed', e); process.exit(1); });
