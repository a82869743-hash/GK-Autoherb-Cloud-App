const pool = require('../config/db');

// ─── Get staff tasks ────────────────────────────────
exports.getStaffTasks = async (req, res) => {
  try {
    const { staff_id, status } = req.query;
    let where = ['1=1']; const params = [];
    if (staff_id) { where.push('st.assigned_to = ?'); params.push(staff_id); }
    if (status) { where.push('st.status = ?'); params.push(status); }
    const [rows] = await pool.query(`
      SELECT st.*, u.name as staff_name FROM staff_tasks st
      LEFT JOIN users u ON u.id = st.assigned_to
      WHERE ${where.join(' AND ')} ORDER BY st.due_date ASC, st.priority DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to fetch tasks' }); }
};

// ─── Create staff task ──────────────────────────────
exports.createStaffTask = async (req, res) => {
  try {
    const { assigned_to, title, description, priority, due_date } = req.body;
    if (!assigned_to || !title) return res.status(400).json({ success: false, error: 'Staff and title required' });
    const [result] = await pool.query(
      'INSERT INTO staff_tasks (assigned_to, assigned_by, title, description, priority, due_date) VALUES (?,?,?,?,?,?)',
      [assigned_to, req.user.id, title, description, priority || 'medium', due_date]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Task assigned' });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to create task' }); }
};

// ─── Update task status ─────────────────────────────
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';
    await pool.query(`UPDATE staff_tasks SET status = ?, completed_at = ${completedAt} WHERE id = ?`, [status, id]);
    res.json({ success: true, message: 'Task updated' });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to update task' }); }
};

// ─── Get staff leaves ───────────────────────────────
exports.getStaffLeaves = async (req, res) => {
  try {
    const { staff_id, status } = req.query;
    let where = ['1=1']; const params = [];
    if (staff_id) { where.push('sl.staff_id = ?'); params.push(staff_id); }
    if (status) { where.push('sl.status = ?'); params.push(status); }
    const [rows] = await pool.query(`
      SELECT sl.*, u.name as staff_name, a.name as approved_by_name
      FROM staff_leaves sl LEFT JOIN users u ON u.id = sl.staff_id
      LEFT JOIN users a ON a.id = sl.approved_by
      WHERE ${where.join(' AND ')} ORDER BY sl.created_at DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to fetch leaves' }); }
};

// ─── Request leave ──────────────────────────────────
exports.requestLeave = async (req, res) => {
  try {
    const { leave_type, from_date, to_date, reason } = req.body;
    const staff_id = req.user.id;
    if (!from_date || !to_date) return res.status(400).json({ success: false, error: 'Dates required' });
    const days = Math.ceil((new Date(to_date) - new Date(from_date)) / (1000*60*60*24)) + 1;
    const [result] = await pool.query(
      'INSERT INTO staff_leaves (staff_id, leave_type, from_date, to_date, days, reason) VALUES (?,?,?,?,?,?)',
      [staff_id, leave_type || 'casual', from_date, to_date, days, reason]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Leave request submitted' });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to request leave' }); }
};

// ─── Approve/Reject leave ───────────────────────────
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved','rejected'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
    await pool.query('UPDATE staff_leaves SET status = ?, approved_by = ? WHERE id = ?', [status, req.user.id, id]);
    res.json({ success: true, message: `Leave ${status}` });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to update leave' }); }
};

// ─── Get staff performance ──────────────────────────
exports.getStaffPerformance = async (req, res) => {
  try {
    const { staff_id, period } = req.query;
    let where = ['1=1']; const params = [];
    if (staff_id) { where.push('sp.staff_id = ?'); params.push(staff_id); }
    if (period) { where.push('sp.period = ?'); params.push(period); }
    const [rows] = await pool.query(`
      SELECT sp.*, u.name as staff_name FROM staff_performance sp
      LEFT JOIN users u ON u.id = sp.staff_id
      WHERE ${where.join(' AND ')} ORDER BY sp.period DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to fetch performance' }); }
};

// ─── Add performance review ─────────────────────────
exports.addPerformanceReview = async (req, res) => {
  try {
    const { staff_id, period, jobs_completed, avg_rating, attendance_pct, bonus_amount, notes } = req.body;
    if (!staff_id || !period) return res.status(400).json({ success: false, error: 'Staff and period required' });
    const [result] = await pool.query(
      'INSERT INTO staff_performance (staff_id, period, jobs_completed, avg_rating, attendance_pct, bonus_amount, notes, reviewed_by) VALUES (?,?,?,?,?,?,?,?)',
      [staff_id, period, jobs_completed || 0, avg_rating || 0, attendance_pct || 100, bonus_amount || 0, notes, req.user.id]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Performance review recorded' });
  } catch (err) { res.status(500).json({ success: false, error: 'Failed to add review' }); }
};
