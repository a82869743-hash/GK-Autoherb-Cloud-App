/**
 * Settings read/write helper.
 *
 * Some databases have `settings(key_name, value)` as plain columns, others have
 * `setting_key / setting_value` with `key_name / value` as generated mirrors.
 * Writing to a generated column fails, so writes go through here and pick the
 * right pair of columns once per process.
 */
const pool = require('../config/db');

let writeColumns = null;

async function resolveWriteColumns(db) {
  if (writeColumns) return writeColumns;
  const [cols] = await db.query(
    `SELECT COLUMN_NAME, EXTRA FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings'`
  );
  const byName = Object.fromEntries(cols.map((c) => [c.COLUMN_NAME, c.EXTRA || '']));
  const keyIsGenerated = /GENERATED/i.test(byName.key_name || '');
  writeColumns = keyIsGenerated && byName.setting_key !== undefined
    ? { key: 'setting_key', value: 'setting_value' }
    : { key: 'key_name', value: 'value' };
  return writeColumns;
}

async function getSettings(keys, db = pool) {
  const [rows] = await db.query('SELECT key_name, value FROM settings WHERE key_name IN (?)', [keys]);
  return rows.reduce((acc, r) => ({ ...acc, [r.key_name]: r.value }), {});
}

async function getSetting(key, fallback = null, db = pool) {
  const map = await getSettings([key], db);
  return map[key] !== undefined && map[key] !== null && map[key] !== '' ? map[key] : fallback;
}

async function setSetting(key, value, db = pool) {
  const cols = await resolveWriteColumns(db);
  const val = value === null || value === undefined ? '' : String(value);
  const [existing] = await db.query('SELECT id FROM settings WHERE key_name = ?', [key]);
  if (existing.length) {
    await db.query(`UPDATE settings SET ${cols.value} = ? WHERE id = ?`, [val, existing[0].id]);
  } else {
    await db.query(`INSERT INTO settings (${cols.key}, ${cols.value}) VALUES (?, ?)`, [key, val]);
  }
}

/** Insert defaults only for keys that don't exist yet. */
async function ensureDefaults(defaults, db = pool) {
  const current = await getSettings(Object.keys(defaults), db);
  for (const [key, value] of Object.entries(defaults)) {
    if (current[key] === undefined) await setSetting(key, value, db);
  }
}

module.exports = { getSettings, getSetting, setSetting, ensureDefaults };
