const pool = require('../config/db');

// Get all unique brands (makes)
exports.getBrands = async (req, res) => {
  try {
    const query = 'SELECT DISTINCT make FROM vehicle_master ORDER BY make ASC';
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows.map(r => r.make).filter(Boolean) });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Server error fetching brands' });
  }
};

// Get models for a specific brand
exports.getModels = async (req, res) => {
  try {
    const { brand } = req.query;
    if (!brand) return res.status(400).json({ error: 'Brand query parameter required' });

    const query = 'SELECT DISTINCT model FROM vehicle_master WHERE make = ? ORDER BY model ASC';
    const [rows] = await pool.query(query, [brand]);
    res.json({ success: true, data: rows.map(r => r.model).filter(Boolean) });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Server error fetching models' });
  }
};

// Get variants for a specific brand and model
exports.getVariants = async (req, res) => {
  try {
    const { brand, model } = req.query;
    if (!brand || !model) return res.status(400).json({ error: 'Brand and model query parameters required' });

    const query = 'SELECT DISTINCT variant FROM vehicle_master WHERE make = ? AND model = ? ORDER BY variant ASC';
    const [rows] = await pool.query(query, [brand, model]);
    res.json({ success: true, data: rows.map(r => r.variant).filter(Boolean) });
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ error: 'Server error fetching variants' });
  }
};

// Get logged-in user's vehicles
exports.getVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = 'SELECT * FROM vehicles WHERE customer_id = ? ORDER BY is_primary DESC, created_at DESC';
    const [vehicles] = await pool.query(query, [userId]);
    
    res.json({ success: true, data: vehicles });
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
  }
};

// ─── GET ALL VEHICLES (Admin) ───────────────────────────────
// Returns all vehicles with customer info — for admin job card vehicle dropdown
exports.getAllVehicles = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (v.registration_no LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR u.name LIKE ? OR u.mobile LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const [rows] = await pool.query(`
      SELECT v.*, u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email
      FROM vehicles v
      JOIN users u ON v.customer_id = u.id
      WHERE ${where}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM vehicles v JOIN users u ON v.customer_id = u.id WHERE ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRows[0].total },
    });
  } catch (err) {
    console.error('getAllVehicles error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── GET VEHICLES BY CUSTOMER (Admin) ───────────────────────
exports.getByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const [vehicles] = await pool.query(
      'SELECT * FROM vehicles WHERE customer_id = ? ORDER BY is_primary DESC, created_at DESC',
      [customerId]
    );
    res.json({ success: true, data: vehicles });
  } catch (err) {
    console.error('getByCustomer error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADD CAR ────────────────────────────────────────────────
// POST /vehicles/add
// Body: { brand, model, registration_no?, car_year?, manufacture_year? }
// Automatically sets as primary if user has no other cars.
exports.addCar = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.user.id;
    const { brand, model, registration_no, car_year, manufacture_year } = req.body;
    const resolvedYear = car_year || manufacture_year || null;

    // Validate required fields
    if (!brand || !model) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: 'Brand and model are required',
      });
    }

    // Check how many cars the user has
    const [existing] = await conn.query(
      'SELECT COUNT(*) AS count FROM vehicles WHERE customer_id = ?',
      [userId]
    );
    const isFirst = existing[0].count === 0;

    // Insert new car — first car is automatically primary
    const [result] = await conn.query(
      `INSERT INTO vehicles (customer_id, brand, model, registration_no, car_year, is_primary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, brand.trim(), model.trim(), registration_no?.toUpperCase().trim() || null, resolvedYear, isFirst ? 1 : 0]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        brand: brand.trim(),
        model: model.trim(),
        registration_no: registration_no?.toUpperCase().trim() || null,
        car_year: resolvedYear,
        is_primary: isFirst ? 1 : 0,
      },
      message: 'Car added successfully',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Add car error:', err);
    res.status(500).json({ success: false, error: 'Failed to add car' });
  } finally {
    conn.release();
  }
};

// ─── SET PRIMARY CAR ────────────────────────────────────────
// PATCH /vehicles/:id/primary
exports.setPrimary = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.user.id;
    const carId = req.params.id;

    // Verify car belongs to user
    const [cars] = await conn.query(
      'SELECT id FROM vehicles WHERE id = ? AND customer_id = ?',
      [carId, userId]
    );
    if (!cars.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    // Unset all primary flags for this user
    await conn.query(
      'UPDATE vehicles SET is_primary = 0 WHERE customer_id = ?',
      [userId]
    );

    // Set the specified car as primary
    await conn.query(
      'UPDATE vehicles SET is_primary = 1 WHERE id = ?',
      [carId]
    );

    await conn.commit();
    res.json({ success: true, message: 'Primary car updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Set primary error:', err);
    res.status(500).json({ success: false, error: 'Failed to update primary car' });
  } finally {
    conn.release();
  }
};

// ─── DELETE CAR ─────────────────────────────────────────────
// DELETE /vehicles/:id
exports.deleteCar = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.user.id;
    const carId = req.params.id;

    // Verify car belongs to user
    const [cars] = await conn.query(
      'SELECT id, is_primary FROM vehicles WHERE id = ? AND customer_id = ?',
      [carId, userId]
    );
    if (!cars.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    // Check if car has active job carts
    const [activeJobs] = await conn.query(
      "SELECT COUNT(*) AS count FROM job_carts WHERE vehicle_id = ? AND status != 'complete'",
      [carId]
    );
    if (activeJobs[0].count > 0) {
      await conn.rollback();
      return res.status(422).json({
        success: false,
        error: 'Cannot delete a car with active job carts',
      });
    }

    const wasPrimary = cars[0].is_primary;

    // Delete the car
    await conn.query('DELETE FROM vehicles WHERE id = ?', [carId]);

    // If deleted car was primary, promote the next car
    if (wasPrimary) {
      await conn.query(
        'UPDATE vehicles SET is_primary = 1 WHERE customer_id = ? ORDER BY created_at ASC LIMIT 1',
        [userId]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Car deleted successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Delete car error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete car' });
  } finally {
    conn.release();
  }
};

// ─── UPDATE CAR ─────────────────────────────────────────────
// PATCH /vehicles/:id
exports.updateCar = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.user.id;
    const carId = req.params.id;
    const { brand, model, registration_no, car_year, manufacture_year } = req.body;
    const resolvedYear = car_year || manufacture_year || null;

    // Verify car exists
    const [cars] = await conn.query(
      'SELECT id, customer_id FROM vehicles WHERE id = ?',
      [carId]
    );
    if (!cars.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    // Check authorization: admin or owner
    if (req.user.role !== 'admin' && cars[0].customer_id !== userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Update details
    await conn.query(
      `UPDATE vehicles 
       SET brand = ?, model = ?, registration_no = ?, car_year = ?
       WHERE id = ?`,
      [
        brand ? brand.trim() : null,
        model ? model.trim() : null,
        registration_no ? registration_no.toUpperCase().trim() : null,
        resolvedYear,
        carId
      ]
    );

    await conn.commit();
    res.json({
      success: true,
      message: 'Car updated successfully',
      data: {
        id: parseInt(carId),
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        registration_no: registration_no?.toUpperCase().trim() || null,
        car_year: resolvedYear
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Update car error:', err);
    res.status(500).json({ success: false, error: 'Failed to update car' });
  } finally {
    conn.release();
  }
};
