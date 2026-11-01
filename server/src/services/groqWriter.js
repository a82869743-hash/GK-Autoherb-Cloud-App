/**
 * Makes every WhatsApp message from the studio phone read a little different, so the same
 * template never goes out word-for-word to many people (safer for the linked number).
 *
 * Set GROQ_API_KEY in server/.env (optional: GROQ_MODEL, GROQ_STYLE=english|hinglish,
 * GROQ_REWRITE=false to switch Groq off). Groq rewrites the text; if Groq is off, slow,
 * or drops any link / number / date, a small local variation of the original goes out instead.
 */
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function groqEnabled() {
  return Boolean(process.env.GROQ_API_KEY) && process.env.GROQ_REWRITE !== 'false';
}

/** Links, numbers and amounts that must survive word-for-word. */
function mustKeep(text) {
  const urls = text.match(/https?:\/\/\S+/g) || [];
  const rest = text.replace(/https?:\/\/\S+/g, ' ');
  const nums = rest.match(/\d[\d,.:/-]*\d|\d/g) || [];
  return [...urls, ...nums];
}

/**
 * WhatsApp from the studio phone may only ever carry a job-card or invoice link.
 * Any other link is removed (with a leftover "Book here:"-style label line).
 */
const ALLOWED_LINK = /^https?:\/\/[^/\s]+\/(job|invoice|invoices)\/[\w-]+/i;

function onlyAllowedLinks(text) {
  // Drop the disallowed link together with a short label in front of it ("Book again: …")
  const out = text.replace(/(?:[A-Za-z][\w ]{0,24}:\s*)?(https?:\/\/[^\s)]+)/g, (whole, url) => (ALLOWED_LINK.test(url) ? whole : ''));
  return out
    .split('\n')
    .filter((line) => !/^[^\n]{0,40}[:\-–→👉]\s*$/u.test(line.trim()) || !line.trim())
    .join('\n');
}

/** Tidy WhatsApp formatting: *bold* not **bold**, no headings, short paragraphs. */
function tidy(text) {
  return String(text)
    .replace(/\r/g, '')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/__(.+?)__/g, '_$1_')
    .replace(/^#+\s*/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitize(text) {
  return tidy(onlyAllowedLinks(text));
}

/** Template text without its own sign-off (a random one is added back). */
function withoutSignoff(text) {
  return tidy(text.replace(/\s*[-–—~]\s*(?:team\s*)?GK\s*Auto\s*Herb[^\n]*$/i, '').replace(SIGNOFF_RE, ''));
}

/** OTPs and codes are never touched. */
function isSensitive(text) {
  return /\b(otp|one[- ]time|verification code|login code)\b/i.test(text);
}

// One of these is picked at random for every message, so the layout changes too
const LAYOUTS = [
  'Layout: a short greeting line with the name; then 1-2 short lines with the key detail (date/time, car or amount) in *single asterisks*; any link alone on its own line; one blank line; sign-off line.',
  'Layout: one short friendly paragraph of 2-3 sentences (key detail in *single asterisks*); any link on the next line; sign-off on the last line.',
  'Layout: greeting with the name in *bold*; then each key fact on its own line starting with a fitting emoji (like 📅 🚗 🧾 💰); any link alone on its own line; sign-off line.',
  'Layout: open straight with the key detail in *bold* (no separate greeting line), then one warm line using the name; any link alone on its own line; sign-off line.',
];
const SIGNOFFS = ['– GK AutoHerb', '— Team GK AutoHerb', '– GK AutoHerb Studio', 'Regards, GK AutoHerb', '~ GK AutoHerb, Vadodara'];
const SIGNOFF_RE = /^\s*(?:[-–—~]|regards,?)\s*(?:team\s*)?gk\s*auto\s*herb.*$/gim;

/** Variation without Groq: random greeting, sign-off, emoji and layout. */
function localVariant(text) {
  // Keep each link with its label ("Track: https://…") on its own line
  const LINK = /(?:[A-Za-z][\w ]{0,24}:\s*)?https?:\/\/\S+/g;
  const links = withoutSignoff(text).match(LINK) || [];
  let words = withoutSignoff(text).replace(LINK, '').trim();
  words = words.replace(/^(hi|hello|hey|dear)\b/i, () => pick(['Hi', 'Hello', 'Hey', 'Namaste']));
  const sentences = words.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const emoji = pick([' 🚗', ' ✨', ' 🙂', ' 🧽', ' 👍', '']);
  let body;
  switch (Math.floor(Math.random() * 3)) {
    case 0: body = sentences.join(' '); break; // one paragraph
    case 1: body = sentences.join('\n'); break; // a line per sentence
    default: body = [sentences[0], sentences.slice(1).join(' ')].filter(Boolean).join('\n\n'); // greeting + paragraph
  }
  const parts = [body + emoji];
  if (links.length) parts.push(links.join('\n'));
  return tidy(`${parts.join('\n')}\n\n${pick(SIGNOFFS)}`);
}

async function groqRewrite(original, kind) {
  const style = process.env.GROQ_STYLE === 'hinglish'
    ? 'Write in friendly Hinglish (Hindi words in English letters, mixed with English).'
    : 'Write in simple, warm English.';
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.9,
      max_tokens: 900,
      reasoning_effort: 'low',
      include_reasoning: false,
      messages: [
        {
          role: 'system',
          content: `You rewrite WhatsApp messages from GK AutoHerb, a car detailing studio in Vadodara, so each one is worded freshly. ${style}
${kind === 'bulk' ? 'This is a reminder or offer: make it warm and personal.' : 'This is a service update: keep it clear and to the point.'}
Rules: keep every fact, name, date, time, amount, number and link exactly as given; never add links, offers, prices or promises that are not in the message; vary the wording and sentence order; at most 2 emojis.
Format for WhatsApp. ${pick(LAYOUTS)} The last line must be exactly "${pick(SIGNOFFS)}". No headings, no markdown lists, no ** double asterisks. Reply with the message only.`,
        },
        { role: 'user', content: original },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || '').trim().replace(/^"|"$/g, '');
}

/**
 * Returns a freshly worded version of `text` (same facts). `kind` is 'bulk' or 'high'.
 */
async function vary(raw, kind = 'high') {
  if (!raw || isSensitive(raw)) return raw;
  const text = withoutSignoff(sanitize(raw));
  if (groqEnabled()) {
    try {
      const out = sanitize(await groqRewrite(text, kind));
      const missing = mustKeep(text).filter((k) => !out.includes(k));
      if (out && out.length <= 1200 && !missing.length) return out;
      if (missing.length) console.warn('[groq] rewrite dropped', missing.slice(0, 3), '— using local variation');
    } catch (err) {
      console.warn('[groq] rewrite skipped:', err.message);
    }
  }
  return localVariant(text);
}

module.exports = { vary, localVariant, sanitize, groqEnabled, isSensitive };
