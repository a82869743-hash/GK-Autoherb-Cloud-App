const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./config/db');

const app = express();
const server = http.createServer(app);

// ─── Allowed Origins ────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

// ─── Middleware ──────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request logging (production-safe) ──────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    if (req.url !== '/api/v1/health') {
      const ts = new Date().toISOString().slice(11, 19);
      process.stdout.write(`[${ts}] ${req.method} ${req.url}\n`);
    }
    next();
  });
}

// ─── Health check ───────────────────────────────────
app.get('/api/v1/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const conn = await pool.getConnection();
    conn.release();
    dbStatus = 'connected';
  } catch { /* ignore */ }

  res.json({
    success: true,
    message: 'GK AutoHerb API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
  });
});

// ─── Routes ─────────────────────────────────────────
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/api/job-carts',  require('./routes/jobCarts'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/slots',      require('./routes/slots'));
app.use('/api/bookings',   require('./routes/bookings'));
app.use('/api/services',   require('./routes/services'));
app.use('/api/packages',   require('./routes/packages'));
app.use('/api/loyalty',    require('./routes/loyalty'));
app.use('/api/staff',      require('./routes/staff'));
app.use('/api/accounts',   require('./routes/accounts'));
app.use('/api/buy-sell',   require('./routes/buySell'));
app.use('/api/messages',   require('./routes/messages'));
app.use('/api/inquiries',  require('./routes/inquiries'));
app.use('/api/import',     require('./routes/import'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/vehicles',   require('./routes/vehicles'));

// ─── New Feature Routes ─────────────────────────────────────
app.use('/api/user-packages', require('./routes/userPackages'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/billing',       require('./routes/billing'));
app.use('/api/vendors',       require('./routes/vendors'));
app.use('/api/salary',        require('./routes/salary'));

// ─── Socket.io Auth + GPS ───────────────────────────
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_delivery', async ({ deliveryId }) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM deliveries WHERE id = ? AND status = ?',
        [deliveryId, 'in_transit']
      );
      if (!rows.length) return socket.emit('error', { message: 'Delivery not found' });
      const delivery = rows[0];
      if (socket.user.id !== delivery.staff_id && socket.user.id !== delivery.customer_id) {
        return socket.emit('error', { message: 'Not authorized' });
      }
      socket.join(`delivery_${deliveryId}`);
      socket.emit('joined', { deliveryId });
    } catch {
      socket.emit('error', { message: 'Failed to join delivery room' });
    }
  });

  socket.on('location_update', async ({ deliveryId, lat, lng }) => {
    try {
      const [rows] = await pool.query(
        'SELECT staff_id FROM deliveries WHERE id = ? AND status = ?',
        [deliveryId, 'in_transit']
      );
      if (!rows.length) return;
      if (socket.user.id !== rows[0].staff_id) return;
      io.to(`delivery_${deliveryId}`).emit('location', { lat, lng, timestamp: Date.now() });
    } catch {
      // silently ignore
    }
  });

  socket.on('disconnect', () => {});
});

// ─── Error handling ─────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

// ─── Graceful shutdown ──────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => {
    pool.end().then(() => {
      console.log('Database pool closed.');
      process.exit(0);
    });
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start server ───────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚗 GK AutoHerb API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}\n`);

  if (!process.env.MSG91_AUTH_KEY) {
    console.warn('[WARNING] MSG91_AUTH_KEY not set — messaging in mock mode');
  }
  if (!process.env.JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET not set — authentication will fail');
  }

  // Initialize cron jobs
  const cronService = require('./services/cronService');
  cronService.initCronJobs();
});

module.exports = { app, io };
