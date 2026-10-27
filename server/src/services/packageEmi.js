// Package EMI (studio installments): the customer pays installment 1 at purchase and the rest
// monthly, online or at the studio. Admin turns EMI on per package (packages.emi_*).
const pool = require('../config/db');

// Days after a due date before package bookings are paused
const GRACE_DAYS = Number(process.env.EMI_GRACE_DAYS || 7);
// Days before a due date when the reminder goes out
const REMIND_DAYS_BEFORE = 2;

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');
const planUrl = () => `${require('./messagingService').appBaseUrl()}/customer/packages/emi`;

/** "3,6" -> [3, 6] (sorted, 2..24 months only) */
function parseMonths(value) {
  return [...new Set(String(value || '').split(',').map((m) => parseInt(m, 10)).filter((m) => m >= 2 && m <= 24))].sort((a, b) => a - b);
}

/** Equal whole-rupee installments; the first one absorbs the remainder so the sum is exact. */
function splitAmount(total, months) {
  const t = Math.round(Number(total) * 100);
  const base = Math.floor(t / months / 100) * 100;
  const first = t - base * (months - 1);
  return Array.from({ length: months }, (_, i) => (i === 0 ? first : base) / 100);
}

/** Is EMI with this many months allowed for this package at this price? Returns an error string or null. */
function validateChoice(pkg, months, price) {
  if (!pkg || !Number(pkg.emi_enabled)) return 'EMI is not available for this package';
  if (!parseMonths(pkg.emi_months).includes(Number(months))) return 'Please choose one of the EMI options shown';
  if (Number(pkg.emi_min_amount) > 0 && Number(price) < Number(pkg.emi_min_amount)) {
    return `EMI is available on ${money(pkg.emi_min_amount)} and above`;
  }
  return null;
}

/**
 * Create the plan when an EMI package request is approved. Installment 1 is marked paid
 * (it was paid online, by QR, or collected by the admin who approved).
 */
async function createPlanForRequest(conn, reqData, userPackageId, paymentId) {
  const months = Number(reqData.emi_months);
  if (!months) return null;
  const amounts = splitAmount(reqData.price, months);

  let method = 'studio';
  if (paymentId) {
    const [p] = await conn.query('SELECT payment_method FROM v2_payments WHERE id = ?', [paymentId]);
    if (p.length && p[0].payment_method) method = p[0].payment_method;
  }

  const [plan] = await conn.query(
    `INSERT INTO package_emi_plans (customer_id, package_id, package_request_id, user_package_id, vehicle_id, total_amount, months, installment_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [reqData.customer_id, reqData.package_id, reqData.id, userPackageId, reqData.vehicle_id || null, reqData.price, months, amounts[months - 1]]
  );
  for (let i = 0; i < months; i++) {
    await conn.query(
      `INSERT INTO package_emi_installments (plan_id, installment_no, amount, due_date, status, paid_at, payment_method, v2_payment_id)
       VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, ?, ?, ?)`,
      i === 0
        ? [plan.insertId, 1, amounts[0], 0, 'paid', new Date(), method, paymentId || null]
        : [plan.insertId, i + 1, amounts[i], i, 'pending', null, null, null]
    );
  }
  // The package is worth the full price, but only installment 1 has been collected so far
  await conn.query('UPDATE user_packages SET price_paid = ? WHERE id = ?', [amounts[0], userPackageId]);
  return { planId: plan.insertId, months, firstAmount: amounts[0], nextAmount: amounts[1] };
}

/** Plan + installments for one plan id. */
async function getPlan(conn, planId) {
  const [plans] = await conn.query(
    `SELECT ep.*, p.name AS package_name, u.name AS customer_name, u.mobile AS customer_mobile,
            v.registration_no, v.brand, v.model, up.end_date AS package_end_date, up.package_status
     FROM package_emi_plans ep
     JOIN packages p ON p.id = ep.package_id
     LEFT JOIN users u ON u.id = ep.customer_id
     LEFT JOIN vehicles v ON v.id = ep.vehicle_id
     LEFT JOIN user_packages up ON up.id = ep.user_package_id
     WHERE ep.id = ?`,
    [planId]
  );
  if (!plans.length) return null;
  const [installments] = await conn.query(
    'SELECT * FROM package_emi_installments WHERE plan_id = ? ORDER BY installment_no',
    [planId]
  );
  return withSummary({ ...plans[0], installments });
}

function withSummary(plan) {
  const today = new Date(new Date().toDateString());
  const inst = plan.installments || [];
  const paid = inst.filter((i) => i.status !== 'pending');
  const pending = inst.filter((i) => i.status === 'pending');
  const next = pending[0] || null;
  const overdue = pending.filter((i) => new Date(i.due_date) < today);
  return {
    ...plan,
    paid_count: paid.length,
    paid_amount: paid.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0),
    balance: pending.reduce((s, i) => s + Number(i.amount), 0),
    next_installment: next,
    overdue_count: overdue.length,
    is_paused: overdue.some((i) => (today - new Date(i.due_date)) / 864e5 > GRACE_DAYS),
  };
}

/** Mark one installment paid (or waived). Returns { plan, installment } or { error }. */
async function markInstallmentPaid(conn, installmentId, { method = 'cash', ref = null, v2PaymentId = null, recordedBy = null, waive = false } = {}) {
  const [rows] = await conn.query('SELECT * FROM package_emi_installments WHERE id = ? FOR UPDATE', [installmentId]);
  if (!rows.length) return { error: 'Installment not found' };
  const inst = rows[0];
  if (inst.status !== 'pending') return { error: 'This installment is already settled' };

  await conn.query(
    `UPDATE package_emi_installments
     SET status = ?, paid_at = NOW(), payment_method = ?, payment_ref = ?, v2_payment_id = ?, recorded_by = ?
     WHERE id = ?`,
    [waive ? 'waived' : 'paid', waive ? 'waived' : method, ref, v2PaymentId, recordedBy, installmentId]
  );

  const [plans] = await conn.query('SELECT * FROM package_emi_plans WHERE id = ?', [inst.plan_id]);
  const plan = plans[0];
  if (!waive && plan.user_package_id) {
    await conn.query('UPDATE user_packages SET price_paid = COALESCE(price_paid, 0) + ? WHERE id = ?', [inst.amount, plan.user_package_id]);
  }
  const [[{ left }]] = await conn.query(
    "SELECT COUNT(*) AS `left` FROM package_emi_installments WHERE plan_id = ? AND status = 'pending'",
    [inst.plan_id]
  );
  if (Number(left) === 0) {
    await conn.query("UPDATE package_emi_plans SET status = 'completed', completed_at = NOW() WHERE id = ?", [inst.plan_id]);
  }
  return { plan: await getPlan(conn, inst.plan_id), installment: { ...inst, status: waive ? 'waived' : 'paid' } };
}

/** Thank-you message after an installment is paid (fire and forget). */
function notifyPaid(plan, installment) {
  if (!plan || installment.status !== 'paid') return;
  const next = plan.next_installment;
  require('./messagingService')
    .notify(
      plan.customer_id,
      'PACKAGE_EMI_PAID',
      {
        customer_name: plan.customer_name,
        amount: money(installment.amount),
        installment_no: installment.installment_no,
        months: plan.months,
        package_name: plan.package_name,
        next_line: next ? `Next: ${money(next.amount)} on ${fmtDate(next.due_date)}.` : 'All installments are paid. Thank you! 🎉',
      },
      { type: 'package_emi', id: plan.id }
    )
    .catch(() => {});
}

/** Message for a brand-new EMI plan (sent instead of the plain "package active" message).
 *  Built from values in hand: it runs before the approval transaction commits. */
function notifyStarted(customerId, packageName, plan) {
  if (!plan) return;
  const nextDue = new Date();
  nextDue.setMonth(nextDue.getMonth() + 1);
  require('./messagingService')
    .notify(
      customerId,
      'PACKAGE_EMI_STARTED',
      {
        package_name: packageName,
        paid_amount: money(plan.firstAmount),
        months: plan.months,
        next_amount: money(plan.nextAmount),
        next_due: fmtDate(nextDue),
        plan_url: planUrl(),
      },
      { type: 'package_emi', id: plan.planId }
    )
    .catch(() => {});
}

/** Customer bookings from a package pause once an installment is more than GRACE_DAYS late. */
async function bookingBlockReason(conn, userPackageId) {
  try {
    const [rows] = await conn.query(
      `SELECT ei.amount, ei.due_date FROM package_emi_installments ei
       JOIN package_emi_plans ep ON ep.id = ei.plan_id
       WHERE ep.user_package_id = ? AND ep.status = 'active' AND ei.status = 'pending'
         AND ei.due_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY ei.due_date LIMIT 1`,
      [userPackageId, GRACE_DAYS]
    );
    if (!rows.length) return null;
    return `Your EMI installment of ${money(rows[0].amount)} (due ${fmtDate(rows[0].due_date)}) is unpaid. Please pay it to book from your package.`;
  } catch {
    return null; // EMI tables not migrated yet
  }
}

/** Daily: reminder a couple of days before the due date, and an overdue notice the day after. */
async function runEmiJobs() {
  const messagingService = require('./messagingService');
  let due = 0;
  let overdue = 0;
  const base = `SELECT ei.*, ep.customer_id, ep.months, p.name AS package_name, u.name AS customer_name
     FROM package_emi_installments ei
     JOIN package_emi_plans ep ON ep.id = ei.plan_id
     JOIN packages p ON p.id = ep.package_id
     LEFT JOIN users u ON u.id = ep.customer_id
     WHERE ep.status = 'active' AND ei.status = 'pending'`;

  const [upcoming] = await pool.query(
    `${base} AND ei.reminder_sent_at IS NULL AND ei.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
    [REMIND_DAYS_BEFORE]
  );
  for (const i of upcoming) {
    await pool.query('UPDATE package_emi_installments SET reminder_sent_at = NOW() WHERE id = ?', [i.id]);
    const r = await messagingService.notify(i.customer_id, 'PACKAGE_EMI_DUE', {
      customer_name: i.customer_name, installment_no: i.installment_no, months: i.months, package_name: i.package_name,
      amount: money(i.amount), due_date: fmtDate(i.due_date), plan_url: planUrl(),
    }, { type: 'package_emi', id: i.plan_id });
    if (r.success) due++;
  }

  const [late] = await pool.query(`${base} AND ei.overdue_notified_at IS NULL AND ei.due_date < CURDATE()`);
  for (const i of late) {
    await pool.query('UPDATE package_emi_installments SET overdue_notified_at = NOW() WHERE id = ?', [i.id]);
    const r = await messagingService.notify(i.customer_id, 'PACKAGE_EMI_OVERDUE', {
      customer_name: i.customer_name, installment_no: i.installment_no, package_name: i.package_name,
      amount: money(i.amount), due_date: fmtDate(i.due_date), plan_url: planUrl(),
    }, { type: 'package_emi', id: i.plan_id });
    if (r.success) overdue++;
  }
  if (due || overdue) console.log(`[CRON] EMI: ${due} due reminders, ${overdue} overdue notices`);
  return { due, overdue };
}

module.exports = {
  GRACE_DAYS, parseMonths, splitAmount, validateChoice, createPlanForRequest, getPlan, withSummary,
  markInstallmentPaid, notifyPaid, notifyStarted, bookingBlockReason, runEmiJobs,
};
