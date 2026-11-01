/**
 * Groq rewrites reminder messages so they read friendly and personal.
 *
 * Set GROQ_API_KEY in server/.env (optional: GROQ_MODEL, GROQ_STYLE=english|hinglish).
 * The template text is always the fallback: if Groq is off, slow, or drops any
 * link / number / date from the original, the original goes out unchanged.
 */
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Only these template triggers get rewritten (match on the event_trigger, case-insensitive)
const REWRITE = /REMINDER|NEXT_WASH|RENEW|EXPIR/i;

function enabled() {
  return Boolean(process.env.GROQ_API_KEY) && process.env.GROQ_REMINDERS !== 'false';
}

/** Links, numbers and amounts that must survive the rewrite word-for-word. */
function mustKeep(text) {
  const urls = text.match(/https?:\/\/\S+/g) || [];
  const rest = text.replace(/https?:\/\/\S+/g, ' ');
  const nums = rest.match(/\d[\d,.:/-]*\d|\d/g) || [];
  return [...urls, ...nums];
}

async function polish(eventTrigger, original) {
  if (!enabled() || !REWRITE.test(String(eventTrigger || '')) || !original) return original;
  const style = process.env.GROQ_STYLE === 'hinglish'
    ? 'Write in friendly Hinglish (Hindi words in English letters, mixed with English).'
    : 'Write in simple, warm English.';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: `You rewrite WhatsApp reminder messages for GK AutoHerb, a car detailing studio in Vadodara. ${style}
Rules: keep every fact, name, date, time, amount, number and link exactly as given; do not add offers, prices or promises that are not in the message; keep it short (max 5 lines); 1-2 fitting emojis are fine; end with "– GK AutoHerb". Reply with the message only.`,
          },
          { role: 'user', content: original },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const out = String(data?.choices?.[0]?.message?.content || '').trim().replace(/^"|"$/g, '');
    if (!out || out.length > 1000) return original;
    const missing = mustKeep(original).filter((k) => !out.includes(k));
    if (missing.length) {
      console.warn('[groq] rewrite dropped', missing.slice(0, 3), '— using template text');
      return original;
    }
    return out;
  } catch (err) {
    console.warn('[groq] rewrite skipped:', err.message);
    return original;
  }
}

module.exports = { polish, enabled };
