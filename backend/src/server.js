const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/db');
const { errorResponse } = require('./utils/apiResponse');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const activityRoutes = require('./routes/activityRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const studentRoutes = require('./routes/studentRoutes');
const classRoutes = require('./routes/classRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allow static files like images to be served to Next.js / Mobile APKs
}));

// Prevent API response caching across browsers, CDNs, and proxy caches
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Android APK WebViews, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true); // Allow production Vercel frontend & APK clients
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Ensure uploads directory exists and serve static files
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Healthcheck Route
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  return res.json({
    status: 'online',
    system: 'Government Primary School Jainarkodi REST API',
    timezone: process.env.TIMEZONE || 'Asia/Kolkata',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// 404 Route Handler
app.use((req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.statusCode || 500;
  return errorResponse(res, err.message || 'Internal Server Error', statusCode, 'SERVER_ERROR', err.stack);
});

// Start Server listening on 0.0.0.0 for Local Wi-Fi & Mobile Phone Access
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`🚀 Jainarkodi School REST API running on port ${PORT}`);
  console.log(`📍 Timezone set to: ${process.env.TIMEZONE || 'Asia/Kolkata'}`);
  console.log(`🌐 Base API URL: http://0.0.0.0:${PORT}/api`);
  console.log(`=======================================================`);
  await testConnection();
});
