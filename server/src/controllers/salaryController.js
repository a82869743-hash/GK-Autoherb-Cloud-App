const pool = require('../config/db');

exports.getSalary = async (req, res) => {
  try {
    const { month_year } = req.query; // 'YYYY-MM'
    if (!month_year) return res.status(400).json({ success: false, error: 'month_year is required' });

    const [rows] = await pool.query(`
      SELECT s.*, u.name as staff_name, u.mobile as staff_mobile
      FROM staff_salary s
      JOIN users u ON s.staff_id = u.id
      WHERE s.month_year = ?
    `, [month_year]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getSalary error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.calculateSalary = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { month_year } = req.body;
    if (!month_year) return res.status(400).json({ success: false, error: 'month_year is required' });

    await conn.beginTransaction();

    // Get all active staff with base salary
    const [staff] = await conn.query('SELECT id, name, base_salary FROM users WHERE role = "staff" AND is_active = 1');
    const workingDays = 26; // Standard monthly working days baseline
    
    // Get checkins for the month (present = 1, half_day = 0.5)
    const [checkins] = await conn.query(`
      SELECT 
        staff_id, 
        SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'half_day' THEN 0.5 ELSE 0 END) as days_present 
      FROM staff_attendance 
      WHERE DATE_FORMAT(att_date, '%Y-%m') = ?
      GROUP BY staff_id
    `, [month_year]);
    
    // Generate/update records
    for (const s of staff) {
      const attendance = parseFloat(checkins.find(c => c.staff_id === s.id)?.days_present || 0);
      const baseSalary = parseFloat(s.base_salary || 15000);
      const ratio = workingDays > 0 ? (attendance / workingDays) : 1;
      const finalSalary = Math.round(baseSalary * Math.min(1, Math.max(0, ratio)));
      
      await conn.query(`
        INSERT INTO staff_salary (staff_id, month_year, base_salary, bonus, deductions, final_salary, status, notes)
        VALUES (?, ?, ?, 0, 0, ?, 'pending', CONCAT('Auto-calculated: ', ?, ' days present of 26'))
        ON DUPLICATE KEY UPDATE 
          base_salary = VALUES(base_salary),
          final_salary = VALUES(final_salary),
          notes = VALUES(notes)
      `, [s.id, month_year, baseSalary, finalSalary, attendance]);
    }
    
    await conn.commit();
    res.json({ success: true, message: 'Salary generated successfully with attendance weighting' });
  } catch (err) {
    await conn.rollback();
    console.error('calculateSalary error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
  }
};

exports.createSalary = async (req, res) => {
  try {
    const { staff_id, month_year, base_salary, bonus, deductions, status, notes } = req.body;
    if (!staff_id || !month_year) {
      return res.status(400).json({ success: false, error: 'staff_id and month_year are required' });
    }

    const final_salary = parseFloat(base_salary || 0) + parseFloat(bonus || 0) - parseFloat(deductions || 0);

    const [result] = await pool.query(`
      INSERT INTO staff_salary (staff_id, month_year, base_salary, bonus, deductions, final_salary, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        base_salary = VALUES(base_salary), 
        bonus = VALUES(bonus), 
        deductions = VALUES(deductions), 
        final_salary = VALUES(final_salary), 
        status = VALUES(status), 
        notes = VALUES(notes)
    `, [staff_id, month_year, base_salary || 0, bonus || 0, deductions || 0, final_salary, status || 'pending', notes]);

    res.json({ success: true, message: 'Salary record created', data: { id: result.insertId } });
  } catch (err) {
    console.error('createSalary error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { base_salary, bonus, deductions, status, notes } = req.body;
    
    const final_salary = parseFloat(base_salary || 0) + parseFloat(bonus || 0) - parseFloat(deductions || 0);
    
    await pool.query(`
      UPDATE staff_salary 
      SET base_salary = ?, bonus = ?, deductions = ?, final_salary = ?, status = ?, notes = ?
      WHERE id = ?
    `, [base_salary, bonus, deductions, final_salary, status, notes, id]);
    
    res.json({ success: true, message: 'Salary updated' });
  } catch (err) {
    console.error('updateSalary error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DOWNLOAD SALARY SLIP PDF ────────────────
exports.downloadSlip = async (req, res) => {
  try {
    const { generateSalarySlipPDF } = require('../services/invoiceService');
    const { pdfBuffer, invoiceNumber } = await generateSalarySlipPDF(req.params.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Salary slip PDF error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate salary slip' });
  }
};

