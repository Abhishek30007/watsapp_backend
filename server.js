require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB      = require('./config/db');
const wishRoutes     = require('./routes/wishRoutes');
const emailRoutes    = require('./routes/emailRoutes');
const aiRoutes       = require('./routes/aiRoutes');
const cardRoutes     = require('./routes/cardRoutes');
const importRoutes   = require('./routes/importRoutes');
const logRoutes      = require('./routes/logRoutes');
const adminAlertRoutes = require('./routes/adminAlertRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { startScheduler } = require('./services/cronScheduler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/wishes',   wishRoutes);
app.use('/api/contacts', wishRoutes); // Alias for compatibility
app.use('/api/email',    emailRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/card',     cardRoutes);
app.use('/api/import',   importRoutes);
app.use('/api/logs',     logRoutes);
app.use('/api/admin-alerts', adminAlertRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    features: ['SMS', 'Email', 'WhatsApp', 'AI Wishes', 'Greeting Cards', 'CSV Import', 'Wish History'],
    integrations: {
      textbee: {
        configured: !!(process.env.TEXTBEE_API_KEY && process.env.TEXTBEE_DEVICE_ID),
        deviceId: process.env.TEXTBEE_DEVICE_ID || 'Not set'
      },
      nodemailer: {
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
        email: process.env.EMAIL_USER || 'Not set'
      },
      twilio: {
        configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not set'
      },
      wappfly: {
        configured: !!process.env.WAPPFLY_API_TOKEN,
        token: process.env.WAPPFLY_API_TOKEN ? 'Configured' : 'Not set'
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  startScheduler();
  app.listen(PORT, () => {
    console.log(`[Server] CelebrateMate Backend running on port ${PORT}`);
    console.log(`[Server] Features: SMS · Email · AI Wishes · Cards · CSV Import · History`);
  });
}).catch(err => {
  console.error('[Server Error] Database connection failed:', err);
  process.exit(1);
});