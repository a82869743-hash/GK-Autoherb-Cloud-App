/**
 * Data backfill that goes with migration 087.
 *   1. Stores a pricing segment on every vehicle that has none.
 *   2. Puts uncategorised services into the right category (so filters work).
 *   3. Sets default warranty periods on coating / protection services.
 *   4. Marks two-wheeler services as bike services.
 * Safe to run more than once — it only fills empty values.
 * Usage: node scripts/backfill_087.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const { detectVehicleCategory } = require('../src/utils/vehicleCategory');

// [category name, keywords] — first match wins
const CATEGORY_RULES = [
  ['Coating', ['ceramic coating', 'ppf', 'paint protection', 'teflon', 'graphene', 'anti-rust', 'underbody']],
  ['Interior', ['interior', 'seat', 'dashboard', 'ac vent', 'upholstery', 'deep clean', 'vacuum']],
  ['Washing', ['wash', 'foam', 'spa']],
  ['Detailing', ['polish', 'rubbing', 'compound', 'wax', 'headlight', 'windshield', 'tyre', 'alloy', 'engine', 'detailing']],
];

// Studio photos in client/public/services/gk — one unique image per service
const SERVICE_IMAGES = {
  'exterior body wash': 'exterior_body_wash',
  'interior cleaning': 'interior_cleaning',
  'full body wash': 'full_body_wash',
  'engine bay cleaning': 'engine_bay_cleaning',
  'foam wash': 'foam_wash',
  'rubbing / compounding': 'rubbing_compounding',
  'teflon coating': 'teflon_coating',
  'ceramic coating': 'ceramic_coating',
  'ppf (paint protection film)': 'ppf',
  'underbody anti-rust coating': 'underbody_anti_rust',
  'ac vent cleaning': 'ac_vent_cleaning',
  'seat shampooing': 'seat_shampooing',
  'dashboard / trim polish': 'dashboard_trim_polish',
  'windshield treatment': 'windshield_treatment',
  'headlight restoration': 'headlight_restoration',
  'tyre dressing / alloy clean': 'tyre_dressing_alloy',
  'ceramic wash': 'ceramic_wash',
  'foam wash premium': 'foam_wash_premium',
  'interior detailing': 'interior_detailing',
  'premium spa wash': 'premium_spa_wash',
  'premium wash': 'premium_wash',
  'body wax coat': 'body_wax_coat',
  'two wheeler wash': 'two_wheeler_wash',
  'two wheeler wax coat': 'two_wheeler_wax',
  'deep cleaning': 'deep_cleaning',
  'body hybrid ceramic wax coat': 'hybrid_ceramic_wax',
};

// [keyword, months, km]
const WARRANTY_RULES = [
  ['ppf', 60, null],
  ['paint protection', 60, null],
  ['ceramic coating', 36, null],
  ['graphene', 36, null],
  ['underbody', 12, null],
  ['teflon', 6, null],
  ['headlight', 6, null],
  ['hybrid ceramic', 3, null],
  ['windshield', 3, null],
];

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // 1. Vehicle segments
  // Older databases have no `make` column on vehicles — only read it when present
  const [[hasMake]] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'make'"
  );
  const [vehicles] = await conn.query(
    `SELECT id, brand, ${hasMake.n ? 'make' : 'NULL AS make'}, model FROM vehicles WHERE category IS NULL OR category = ''`
  );
  for (const v of vehicles) {
    await conn.query('UPDATE vehicles SET category = ? WHERE id = ?', [detectVehicleCategory(v.brand || v.make, v.model), v.id]);
  }
  console.log(`✓ Segment stored on ${vehicles.length} vehicle(s)`);

  // 2. Service categories
  const [cats] = await conn.query('SELECT id, name FROM service_categories');
  const catId = (name) => cats.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id;
  const [services] = await conn.query('SELECT id, name, category_id, warranty_months FROM services');
  let categorised = 0;
  let warranted = 0;
  for (const s of services) {
    const n = s.name.toLowerCase();
    if (!s.category_id) {
      const rule = CATEGORY_RULES.find(([, words]) => words.some((w) => n.includes(w)));
      const id = catId(rule ? rule[0] : 'Other');
      if (id) {
        await conn.query('UPDATE services SET category_id = ? WHERE id = ?', [id, s.id]);
        categorised++;
      }
    }
    if (!s.warranty_months) {
      const w = WARRANTY_RULES.find(([word]) => n.includes(word));
      if (w) {
        await conn.query('UPDATE services SET warranty_months = ?, warranty_km = ? WHERE id = ?', [w[1], w[2], s.id]);
        warranted++;
      }
    }
  }
  console.log(`✓ Category set on ${categorised} service(s), warranty set on ${warranted}`);

  // 3. Service photos (only where the admin hasn't uploaded one)
  let pictured = 0;
  const [noImage] = await conn.query("SELECT id, name FROM services WHERE image_url IS NULL OR image_url = ''");
  for (const s of noImage) {
    const slug = SERVICE_IMAGES[s.name.trim().toLowerCase()];
    if (slug) {
      await conn.query('UPDATE services SET image_url = ? WHERE id = ?', [`/services/gk/${slug}.jpg`, s.id]);
      pictured++;
    }
  }
  console.log(`✓ Photo set on ${pictured} service(s)`);

  // 4. Two-wheeler services
  const [bike] = await conn.query("UPDATE services SET vehicle_type = 'bike' WHERE (LOWER(name) LIKE '%two wheeler%' OR LOWER(name) LIKE '%bike%') AND vehicle_type = 'car'");
  console.log(`✓ ${bike.affectedRows} bike service(s) flagged`);

  await conn.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
