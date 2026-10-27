const pool = require('../config/db');
const emi = require('../services/packageEmi');

async function loadPlans(where, params) {
  const [plans] = await pool.query(
    `SELECT ep.*, p.name AS package_name, u.name AS customer_name, u.mobile AS customer_mobile,
            v.registration_no, v.brand, v.model, up.end_date AS package_end_date, up.package_status
     FROM package_emi_plans ep
     JOIN packages p ON p.id = ep.package_id
     LEFT JOIN users u ON u.id = ep.customer_id
     LEFT JOIN vehicles v ON v.id = ep.vehicle_id
     LEFT JOIN user_packages up ON up.id = ep.user_package_id
     WHERE ${where}
     ORDER BY ep.created_at DESC`,
    params
  );
  if (!plans.length) return [];
  const [installments] = await pool.query(
    'SELECT * FROM package_emi_installments WHERE plan_id IN (?) ORDER BY plan_id, installment_no',
    [plans.map((p) => p.id)]
  );
  return plans.map((p) => emi.withSummary({ ...p, installments: installments.filter((i) => i.plan_id === p.id) }));
}

// ─── CUSTOMER: my EMI plans ─────────────────
exports.myPlans = async (req, res) => {
  try {
    const plans = await loadPlans("ep.customer_id = ? AND ep.status <> 'cancelled'", [req.user.id]);
    res.json({ success: true, data: plans, grace_days: emi.GRACE_DAYS });
  } catch (err) {
    console.error('EMI my plans error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN: all plans (?status=active|overdue|completed|all) ───
exports.list = async (req, res) => {
  try {
    const { status = 'active', search } = req.query;
    let where = '1=1';
    const params = [];
    if (status === 'active' || status === 'overdue') where += " AND ep.status = 'active'";
    else if (status === 'completed') where += " AND ep.status = 'completed'";
    if (search) {
      where += ' AND (u.name LIKE ? OR u.mobile LIKE ? OR v.registration_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    let plans = await loadPlans(where, params);
    if (status === 'overdue') plans = plans.filter((p) => p.overdue_count > 0);

    const [[totals]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN ei.status = 'pending' THEN ei.amount END), 0) AS outstanding,
         COALESCE(SUM(CASE WHEN ei.status = 'pending' AND ei.due_date < CURDATE() THEN ei.amount END), 0) AS overdue,
         COALESCE(SUM(CASE WHEN ei.status = 'pending' AND ei.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN ei.amount END), 0) AS due_this_week,
         COUNT(DISTINCT CASE WHEN ep.status = 'active' THEN ep.id END) AS active_plans
       FROM package_emi_installments ei JOIN package_emi_plans ep ON ep.id = ei.plan_id
       WHERE ep.status <> 'cancelled'`
    );
    res.json({ success: true, data: plans, totals, grace_days: emi.GRACE_DAYS });
  } catch (err) {
    console.error('EMI list error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN/STAFF: record a payment collected at the studio ───
exports.recordPayment = async (req, res) => {
  const { method = 'cash', ref, waive } = req.body;
  const allowed = ['cash', 'upi', 'card', 'bank', 'qr'];
  if (!waive && !allowed.includes(method)) return res.status(400).json({ success: false, error: 'Choose cash, UPI, card, bank or QR' });
  if (waive && req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Only admin can waive an installment' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const r = await emi.markInstallmentPaid(conn, req.params.id, {
      method, ref: ref ? String(ref).slice(0, 120) : null, recordedBy: req.user.id, waive: !!waive,
    });
    if (r.error) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: r.error });
    }
    if (!waive) {
      // Same accounts entry as other studio receipts
      await conn.query(
        `INSERT INTO transactions (type, reference_id, amount, direction, note, transaction_date, created_by)
         VALUES ('package_emi', ?, ?, 'in', ?, CURDATE(), ?)`,
        [r.installment.id, r.installment.amount, `EMI ${r.installment.installment_no}/${r.plan.months} · ${r.plan.package_name} · ${r.plan.customer_name || ''}`, req.user.id]
      ).catch((e) => console.warn('EMI accounts entry skipped:', e.message));
    }
    await conn.commit();
    emi.notifyPaid(r.plan, r.installment);
    res.json({ success: true, data: r.plan, message: waive ? 'Installment waived' : 'Payment recorded' });
  } catch (err) {
    await conn.rollback();
    console.error('EMI record payment error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

// ─── ADMIN: send a reminder for the next unpaid installment now ───
exports.remind = async (req, res) => {
  try {
    const plan = await emi.getPlan(pool, req.params.id);
    if (!plan || !plan.next_installment) return res.status(400).json({ success: false, error: 'Nothing due on this plan' });
    const i = plan.next_installment;
    const late = new Date(i.due_date) < new Date(new Date().toDateString());
    const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
    const date = new Date(i.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const messagingService = require('../services/messagingService');
    const r = await messagingService.notify(
      plan.customer_id,
      late ? 'PACKAGE_EMI_OVERDUE' : 'PACKAGE_EMI_DUE',
      {
        installment_no: i.installment_no, months: plan.months, package_name: plan.package_name,
        amount: money(i.amount), due_date: date, plan_url: `${messagingService.appBaseUrl()}/customer/packages/emi`,
      },
      { type: 'package_emi', id: plan.id }
    );
    res.json({ success: !!r.success, wa_link: r.wa_link || null, message: r.success ? 'Reminder sent' : r.error || 'Could not send' });
  } catch (err) {
    console.error('EMI remind error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
