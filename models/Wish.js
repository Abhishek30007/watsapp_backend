const mongoose = require('mongoose');

const wishSchema = new mongoose.Schema({
  contactName: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    // Validation regex for E.164 phone numbers (e.g. +91XXXXXXXXXX)
    match: [/^\+[1-9]\d{1,14}$/, 'Please provide a valid E.164 phone number (e.g. +919876543210)'],
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    trim: true, // e.g. Birthday, Anniversary, Graduation, Promotion
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required'],
    // HH:mm 24-hour format validation regex
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Please provide scheduled time in HH:mm 24-hour format'],
  },
  generatedMessage: {
    type: String,
    required: [true, 'Generated message is required'],
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
    email: {
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

module.exports = mongoose.model('Wish', wishSchema);
