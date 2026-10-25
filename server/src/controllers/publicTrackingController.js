/**
 * Public live tracker for a job card — opened from the WhatsApp link, no login needed.
 * The link carries a signed token (?t=) so ids can't be enumerated; only the car,
 * stage timeline and studio photos are returned (no phone numbers or amounts).
 */
const pool = require('../config/db');
const { JOB_STAGES, STAGE_KEYS, trackingToken } = require('../services/jobStages');

exports.trackJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.query.t || req.query.t !== trackingToken(id)) {
      return res.status(404).json({ success: false, error: 'Tracking link is invalid or has expired' });
    }
    const [rows] = await pool.query(
      `SELECT jc.id, jc.stage, jc.stage_updated_at, jc.status, jc.visit_date, jc.estimated_completion_at,
              v.brand, v.model, v.registration_no, u.name AS customer_name
       FROM job_carts jc
       JOIN vehicles v ON v.id = jc.vehicle_id
       LEFT JOIN users u ON u.id = v.customer_id
       WHERE jc.id = ?`,
      [id]
    );
    const job = rows[0];
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const [history] = await pool.query(
      'SELECT stage, note, created_at FROM job_stage_history WHERE job_cart_id = ? ORDER BY created_at',
      [id]
    );
    const [services] = await pool.query('SELECT service_name FROM job_services WHERE job_cart_id = ?', [id]);

    const current = job.stage || 'received';
    const currentIdx = STAGE_KEYS.indexOf(current);
    res.json({
      success: true,
      data: {
        id: job.id,
        vehicle: { brand: job.brand, model: job.model, registration_no: job.registration_no },
        customer_first_name: (job.customer_name || '').split(' ')[0],
        status: job.status,
        current,
        updated_at: job.stage_updated_at,
        estimated_completion_at: job.estimated_completion_at,
        services: services.map((s) => s.service_name),
        timeline: JOB_STAGES.map((st, idx) => ({
          ...st,
          done: idx < currentIdx || (idx === currentIdx && st.key === 'delivered'),
          current: idx === currentIdx,
          at: history.filter((h) => h.stage === st.key).pop()?.created_at || null,
          note: history.filter((h) => h.stage === st.key).pop()?.note || st.note,
        })),
      },
    });
  } catch (err) {
    console.error('Public track error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
