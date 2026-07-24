const mongoose = require('mongoose');

const adminAlertSchema = new mongoose.Schema({
  adminName: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true,
  },
  adminPhoneNumber: {
    type: String,
    required: [true, 'Admin notification phone number is required'],
    trim: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please provide a valid E.164 phone number (e.g. +13186108740)'],
  },
  adminEmail: {
    type: String,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    trim: true,
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Alert date is required'],
  },
  scheduledTime: {
    type: String,
    required: [true, 'Alert time is required'],
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Please provide alert time in HH:mm 24-hour format'],
  },
  notes: {
    type: String,
    default: '',
  },
  channels: {
    whatsapp: {
      type: Boolean,
      default: true,
    },
    sms: {
      type: Boolean,
      default: false,
    },
    voiceCall: {
      type: Boolean,
      default: false,
    },
  },
  status: {
    type: String,
    enum: ['PENDING', 'FIRED', 'FAILED'],
    default: 'PENDING',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AdminAlert', adminAlertSchema);
