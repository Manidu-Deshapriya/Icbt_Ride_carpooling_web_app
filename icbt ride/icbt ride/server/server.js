/**
 * ==============================================================================
 * ICBT Ride - Carpooling Web Application REST API Backend Server
 * Technology: Node.js + Express + Firebase Admin SDK
 * Port: 5000 (Configurable via .env)
 * ==============================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import Error Middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── 1. CORS CONFIGURATION ───────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role', 'x-user-email']
}));

// ─── 2. BODY PARSING MIDDLEWARE ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ─── 3. SYSTEM HEALTH CHECK ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ONLINE',
    system: 'ICBT Ride Carpooling REST API Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      rides: '/api/rides',
      vehicles: '/api/vehicles',
      assignments: '/api/assignments',
      fuel: '/api/fuel',
      chats: '/api/chats',
      payments: '/api/payments',
      users: '/api/users',
      admin: '/api/admin'
    }
  });
});

// ─── 4. REGISTER REST API ROUTE MODULES ──────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// ─── 5. 404 CATCH-ALL ROUTE ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.originalUrl}' not found on this REST API server.`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// ─── 6. CENTRALIZED ERROR HANDLER ───────────────────────────────────────────
app.use(errorHandler);

// ─── 7. START SERVER ────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('===========================================================');
  console.log(`🚀 ICBT Ride REST API Server is LIVE on port ${PORT}`);
  console.log(`📡 Base URL: http://localhost:${PORT}/api`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log('===========================================================');
});

module.exports = { app, server };
