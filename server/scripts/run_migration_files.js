/**
 * Run only the named migration files (instead of replaying the whole folder).
 * Usage: node scripts/run_migration_files.js 087_hoora_mobile_app_features.sql [more.sql ...]
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function splitStatements(sql) {
  const statements = [];
  const regex = /^\s*DELIMITER\s+(\S+)/gim;
  const sections = [];
  let currentDelimiter = ';';
  let currentStart = 0;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const text = sql.substring(currentStart, match.index).trim();
    if (text) sections.push({ text, delimiter: currentDelimiter });
    currentDelimiter = match[1];
    currentStart = regex.lastIndex;
  }
  const finalText = sql.substring(currentStart).trim();
  if (finalText) sections.push({ text: finalText, delimiter: currentDelimiter });

  for (const sec of sections) {
    for (const part of sec.text.split(sec.delimiter)) {
      // Drop comment-only lines so a leading "-- note" doesn't swallow the statement
      const cleaned = part
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      if (cleaned) statements.push(cleaned);
    }
  }
  return statements;
}

const TOLERABLE = ['already exists', 'Duplicate', 'multiple primary key', "check that column/key exists"];

async function run() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Pass one or more migration file names.');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });

  for (const file of files) {
    const sql = fs.readFileSync(path.isAbsolute(file) ? file : path.join(MIGRATIONS_DIR, file), 'utf8');
    let skipped = 0;
    for (const stmt of splitStatements(sql)) {
      try {
        await conn.query(stmt);
      } catch (err) {
        if (TOLERABLE.some((t) => (err.message || '').includes(t))) {
          skipped++;
          continue;
        }
        console.error(`✗ ${file}: ${err.message}\n  SQL: ${stmt.slice(0, 300)}`);
        await conn.end();
        process.exit(1);
      }
    }
    console.log(`✓ ${file}${skipped ? ` (${skipped} already-applied statements skipped)` : ''}`);
  }
  await conn.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
