const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  channel: {
    type: String,
    enum: ['SMS', 'Email', 'Voice', 'WhatsApp'],
    required: true,
  },
  recipient: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Sent', 'Failed', 'Pending'],
    default: 'Pending',
  },
  dispatchType: {
    type: String,
    enum: ['Automated Cron', 'Manual Test'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  errorDetails: {
    type: String,
    default: '',
  },
  phoneNumber: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

notificationLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
