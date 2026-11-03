/**
 * Copies of recently sent messages. If a customer's phone can't decrypt a message it asks us
 * to send it again; without the copy Baileys can't answer and the message stays on one tick.
 */
const fs = require('fs');

const MAX_ITEMS = 500;
const MAX_AGE_MS = 3 * 864e5;

function createSentStore(file) {
  let items = [];
  try { items = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
  if (!Array.isArray(items)) items = [];

  const prune = () => {
    const cutoff = Date.now() - MAX_AGE_MS;
    items = items.filter((m) => m.at > cutoff).slice(-MAX_ITEMS);
  };
  prune();

  return {
    save(id, message) {
      if (!id || !message) return;
      items.push({ id, at: Date.now(), message });
      prune();
      try { fs.writeFileSync(file, JSON.stringify(items), { mode: 0o600 }); } catch (e) { console.error('[gateway] sent store write failed', e.message); }
    },
    get(id) {
      return items.find((m) => m.id === id)?.message;
    },
    size: () => items.length,
  };
}

module.exports = { createSentStore };
