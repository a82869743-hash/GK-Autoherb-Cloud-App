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
  const out = text.replace(/https?:\/\/[^\s)]+/g, (url) => (ALLOWED_LINK.test(url) ? url : ''));
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

/** OTPs and codes are never touched. */
function isSensitive(text) {
  return /\b(otp|one[- ]time|verification code|login code)\b/i.test(text);
}

/** Cheap variation without Groq: greeting, closing and a light emoji change. */
function localVariant(text) {
  let out = text;
  out = out.replace(/^(hi|hello|hey|dear)\b/i, () => pick(['Hi', 'Hello', 'Hey', 'Namaste']));
  out = out.replace(/[-–]\s*GK\s*Auto\s*Herb\.?\s*$/i, () => pick(['– GK AutoHerb', '— Team GK AutoHerb', '– GK AutoHerb Studio', '~ GK AutoHerb']));
  if (!/[\u{1F300}-\u{1FAFF}]/u.test(out) && Math.random() < 0.6) {
    out = out.replace(/([.!])?\s*$/, (m, p) => `${p || '.'} ${pick(['🚗', '✨', '🙂', '🧽', '👍'])}`);
  }
  if (out === text) out = `${text}${pick(['', ' ', '​'])}`;
  return out;
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
Format for WhatsApp: start with a short greeting line using the customer's name if given; then 1-3 short lines (put the key detail like date/time, car or amount in *single asterisks* for bold); put any link alone on its own line; leave one blank line before the sign-off; last line exactly "– GK AutoHerb". No headings, no markdown lists, no ** double asterisks. Reply with the message only.`,
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
  const text = sanitize(raw);
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
