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

    // Get all staff
    const [staff] = await conn.query('SELECT id, name FROM users WHERE role = "staff" AND is_active = 1');
    
    // Get checkins for the month
    const [checkins] = await conn.query(`
      SELECT staff_id, COUNT(DISTINCT att_date) as days_present 
      FROM staff_attendance 
      WHERE DATE_FORMAT(att_date, '%Y-%m') = ? AND status = 'present'
      GROUP BY staff_id
    `, [month_year]);
    
    // Generate records
    for (const s of staff) {
      const attendance = checkins.find(c => c.staff_id === s.id)?.days_present || 0;
      const baseSalary = attendance * 500; // simplified logic
      
      await conn.query(`
        INSERT IGNORE INTO staff_salary (staff_id, month_year, base_salary, final_salary)
        VALUES (?, ?, ?, ?)
      `, [s.id, month_year, baseSalary, baseSalary]);
    }
    
    await conn.commit();
    res.json({ success: true, message: 'Salary generated successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('calculateSalary error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    conn.release();
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
