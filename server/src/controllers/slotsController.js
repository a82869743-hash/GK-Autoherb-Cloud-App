const pool = require('../config/db');

// ─── LIST SLOTS ─────────────────────────────
exports.list = async (req, res) => {
  try {
    const { date, from_date, to_date } = req.query;
    let where = '1=1';
    const params = [];

    if (date) {
      where += ' AND slot_date = ?';
      params.push(date);
    } else if (from_date && to_date) {
      where += ' AND slot_date BETWEEN ? AND ?';
      params.push(from_date, to_date);
    }

    const [rows] = await pool.query(
      `SELECT *, DATE_FORMAT(slot_date, '%Y-%m-%d') as slot_date, (booked_count < max_capacity AND is_blocked = 0) AS is_available
       FROM slots WHERE ${where}
       ORDER BY slot_date ASC, start_time ASC`,
      params
    );

    res.json({
      success: true,
      data: rows.map(r => ({ ...r, is_available: !!r.is_available })),
    });
  } catch (err) {
    console.error('Slots list error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── CREATE SINGLE SLOT ────────────────────
exports.create = async (req, res) => {
  try {
    const { slot_date, start_time, end_time, max_capacity = 1 } = req.body;
    if (!slot_date || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'Date, start time, and end time are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO slots (slot_date, start_time, end_time, max_capacity) VALUES (?, ?, ?, ?)',
      [slot_date, start_time, end_time, max_capacity]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Slot created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Slot already exists for this date and time' });
    console.error('Slot create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── BULK CREATE SLOTS (FIXED: timezone + dedup) ─────────
exports.bulkCreate = async (req, res) => {
  try {
    const { from_date, to_date, start_time, end_time, slot_duration_minutes = 60, max_capacity = 1 } = req.body;
    if (!from_date || !to_date || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const duration = parseInt(slot_duration_minutes);
    if (duration <= 0 || duration > 480) {
      return res.status(400).json({ success: false, error: 'Slot duration must be between 1 and 480 minutes' });
    }

    // FIX: Clear existing unbooked slots in the requested range to allow changing slot duration
    await pool.query(
      'DELETE FROM slots WHERE slot_date BETWEEN ? AND ? AND start_time >= ? AND start_time < ? AND booked_count = 0',
      [from_date, to_date, start_time, end_time]
    );

    let created = 0;
    let skipped = 0;

    // FIX: Use string-based date iteration to avoid UTC timezone shift.
    // Previously `new Date(from_date)` shifted to UTC midnight which could
    // produce wrong dates in IST (+05:30) timezone.
    const dates = getDateRange(from_date, to_date);

    // Parse start/end times
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // FIX: Pre-fetch existing slots in the date range to prevent duplication
    const [existingSlots] = await pool.query(
      'SELECT DATE_FORMAT(slot_date, \'%Y-%m-%d\') as slot_date, start_time FROM slots WHERE slot_date BETWEEN ? AND ?',
      [from_date, to_date]
    );
    const existingSet = new Set(
      existingSlots.map(s => {
        const d = typeof s.slot_date === 'string' ? s.slot_date : s.slot_date.toISOString().split('T')[0];
        return `${d}_${s.start_time}`;
      })
    );

    for (const dateStr of dates) {
      for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
        const slotStart = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}:00`;
        const slotEnd = `${String(Math.floor((t + duration) / 60)).padStart(2, '0')}:${String((t + duration) % 60).padStart(2, '0')}:00`;

        // Skip if slot already exists (dedup guard)
        if (existingSet.has(`${dateStr}_${slotStart}`)) {
          skipped++;
          continue;
        }

        try {
          await pool.query(
            'INSERT INTO slots (slot_date, start_time, end_time, max_capacity) VALUES (?, ?, ?, ?)',
            [dateStr, slotStart, slotEnd, max_capacity]
          );
          created++;
          existingSet.add(`${dateStr}_${slotStart}`);
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY') skipped++;
          else throw e;
        }
      }
    }

    console.log(`[SLOTS] Bulk create: ${created} created, ${skipped} skipped (${from_date} → ${to_date})`);

    res.status(201).json({
      success: true,
      message: `${created} slots created, ${skipped} skipped (duplicates)`,
      data: { created, skipped },
    });
  } catch (err) {
    console.error('Bulk create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── UPDATE SLOT ────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { max_capacity, is_blocked } = req.body;

    const [existing] = await pool.query('SELECT id FROM slots WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Slot not found' });

    const updates = [];
    const params = [];
    if (max_capacity !== undefined) { updates.push('max_capacity = ?'); params.push(max_capacity); }
    if (is_blocked !== undefined) { updates.push('is_blocked = ?'); params.push(is_blocked ? 1 : 0); }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });

    params.push(id);
    await pool.query(`UPDATE slots SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Slot updated' });
  } catch (err) {
    console.error('Slot update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── DELETE SLOT ────────────────────────────
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const [slot] = await pool.query('SELECT booked_count FROM slots WHERE id = ?', [id]);
    if (!slot.length) return res.status(404).json({ success: false, error: 'Slot not found' });
    if (slot[0].booked_count > 0) return res.status(422).json({ success: false, error: 'Cannot delete slot with bookings' });

    await pool.query('DELETE FROM slots WHERE id = ?', [id]);
    res.json({ success: true, message: 'Slot deleted' });
  } catch (err) {
    console.error('Slot delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── HELPER: Generate date range as string array (IST-safe) ─────
function getDateRange(fromStr, toStr) {
  const dates = [];
  // Parse YYYY-MM-DD parts directly to avoid timezone issues
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);

  // Use UTC dates to avoid DST/timezone shifts, but only extract the date part
  let current = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}
