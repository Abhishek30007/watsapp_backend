const express = require('express');
const router = express.Router();
const AdminAlert = require('../models/AdminAlert');
const NotificationLog = require('../models/NotificationLog');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { sendSMS } = require('../services/smsService');
const { makeVoiceCall } = require('../services/voiceService');

// @route   GET /api/admin-alerts
// @desc    Retrieve all admin alerts sorted by scheduledDate
router.get('/', async (req, res) => {
  try {
    const alerts = await AdminAlert.find().sort({ scheduledDate: 1 });
    res.json(alerts);
  } catch (error) {
    console.error('[GET /api/admin-alerts Error]:', error);
    res.status(500).json({ message: 'Server error retrieving admin alerts.' });
  }
});

// @route   POST /api/admin-alerts
// @desc    Create a new admin alert
router.post('/', async (req, res) => {
  const { adminName, adminPhoneNumber, adminEmail, title, scheduledDate, scheduledTime, notes, channels } = req.body;
  try {
    const newAlert = new AdminAlert({
      adminName,
      adminPhoneNumber,
      adminEmail,
      title,
      scheduledDate,
      scheduledTime,
      notes,
      channels,
    });
    const savedAlert = await newAlert.save();
    res.status(201).json(savedAlert);
  } catch (error) {
    console.error('[POST /api/admin-alerts Error]:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error creating admin alert.' });
  }
});

// @route   PUT /api/admin-alerts/:id
// @desc    Update an existing admin alert
router.put('/:id', async (req, res) => {
  const { adminName, adminPhoneNumber, adminEmail, title, scheduledDate, scheduledTime, notes, channels, status } = req.body;
  try {
    const alert = await AdminAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Admin alert not found' });

    if (adminName !== undefined) alert.adminName = adminName;
    if (adminPhoneNumber !== undefined) alert.adminPhoneNumber = adminPhoneNumber;
    if (adminEmail !== undefined) alert.adminEmail = adminEmail;
    if (title !== undefined) alert.title = title;
    if (scheduledDate !== undefined) alert.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) alert.scheduledTime = scheduledTime;
    if (notes !== undefined) alert.notes = notes;
    if (channels !== undefined) alert.channels = channels;
    if (status !== undefined) alert.status = status;

    const updatedAlert = await alert.save();
    res.json(updatedAlert);
  } catch (error) {
    console.error('[PUT /api/admin-alerts/:id Error]:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error updating admin alert.' });
  }
});

// @route   DELETE /api/admin-alerts/:id
// @desc    Delete an admin alert
router.delete('/:id', async (req, res) => {
  try {
    const alert = await AdminAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Admin alert not found' });
    await alert.deleteOne();
    res.json({ message: 'Admin alert successfully deleted' });
  } catch (error) {
    console.error('[DELETE /api/admin-alerts/:id Error]:', error);
    res.status(500).json({ message: 'Server error deleting admin alert.' });
  }
});

// @route   POST /api/admin-alerts/:id/test-whatsapp
// @desc    Manual WhatsApp test alert for admin
router.post('/:id/test-whatsapp', async (req, res) => {
  try {
    const alert = await AdminAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Admin alert not found' });

    // Fallback Chain for toPhoneNumber
    let toPhoneNumber = req.body.adminPhoneNumber || req.body.phone || req.body.toPhoneNumber || req.body.to;

    if (!toPhoneNumber && alert) {
      toPhoneNumber = alert.adminPhoneNumber || alert.phoneNumber || alert.phone;
    }

    if (!toPhoneNumber) {
      try {
        const mongoose = require('mongoose');
        const AdminSettings = mongoose.models.AdminSettings || mongoose.model('AdminSettings');
        if (AdminSettings) {
          const settings = await AdminSettings.findOne();
          if (settings) {
            toPhoneNumber = settings.adminPhoneNumber || settings.phone || settings.phoneNumber;
          }
        }
      } catch (e) {
        // Fail silently
      }
    }

    if (!toPhoneNumber) {
      toPhoneNumber = process.env.MY_PERSONAL_PHONE || process.env.TWILIO_PHONE_NUMBER || '+13186108740';
    }

    // Explicit validation check
    if (!toPhoneNumber) {
      return res.status(400).json({ success: false, message: "Missing recipient phone number (To parameter)." });
    }

    // Clean resolved phone number string and format to E.164
    toPhoneNumber = toPhoneNumber.replace(/[^\d+]/g, '');
    if (!toPhoneNumber.startsWith('+')) {
      toPhoneNumber = '+' + toPhoneNumber;
    }

    const messageBody = `Admin Alert: Don't forget! ${alert.title}. Time: ${alert.scheduledTime}. Notes: ${alert.notes || 'None'}`;
    console.log(`[Manual Admin WhatsApp] Dispatching to ${toPhoneNumber}`);

    const log = await NotificationLog.create({
      recipient: `${alert.adminName || 'Admin'} (${toPhoneNumber})`,
      phoneNumber: toPhoneNumber,
      channel: 'WhatsApp',
      message: messageBody,
      status: 'Pending',
      dispatchType: 'Manual Test',
    });

    try {
      await sendWhatsAppMessage(toPhoneNumber, messageBody);
      log.status = 'Sent';
      await log.save();
      return res.json({ success: true, message: `Admin test WhatsApp successfully sent to ${toPhoneNumber}` });
    } catch (waError) {
      log.status = 'Failed';
      log.errorDetails = waError.message;
      await log.save();
      return res.status(500).json({ success: false, error: waError.message });
    }
  } catch (error) {
    console.error('[Manual Admin WhatsApp Error]:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to dispatch manual admin WhatsApp.' });
  }
});

// @route   POST /api/admin-alerts/:id/test-sms
// @desc    Manual SMS test alert for admin
router.post('/:id/test-sms', async (req, res) => {
  try {
    const alert = await AdminAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Admin alert not found' });

    // Fallback Chain for toPhoneNumber
    let toPhoneNumber = req.body.adminPhoneNumber || req.body.phone || req.body.toPhoneNumber || req.body.to;

    if (!toPhoneNumber && alert) {
      toPhoneNumber = alert.adminPhoneNumber || alert.phoneNumber || alert.phone;
    }

    if (!toPhoneNumber) {
      try {
        const mongoose = require('mongoose');
        const AdminSettings = mongoose.models.AdminSettings || mongoose.model('AdminSettings');
        if (AdminSettings) {
          const settings = await AdminSettings.findOne();
          if (settings) {
            toPhoneNumber = settings.adminPhoneNumber || settings.phone || settings.phoneNumber;
          }
        }
      } catch (e) {
        // Fail silently
      }
    }

    if (!toPhoneNumber) {
      toPhoneNumber = process.env.MY_PERSONAL_PHONE || process.env.TWILIO_PHONE_NUMBER || '+13186108740';
    }

    // Explicit validation check
    if (!toPhoneNumber) {
      return res.status(400).json({ success: false, message: "Missing recipient phone number (To parameter)." });
    }

    // Clean resolved phone number string and format to E.164
    toPhoneNumber = toPhoneNumber.replace(/[^\d+]/g, '');
    if (!toPhoneNumber.startsWith('+')) {
      toPhoneNumber = '+' + toPhoneNumber;
    }

    const messageBody = `Admin Alert: Don't forget! ${alert.title}. Time: ${alert.scheduledTime}. Notes: ${alert.notes || 'None'}`;
    console.log(`[Manual Admin SMS] Dispatching to ${toPhoneNumber}`);

    const log = await NotificationLog.create({
      recipient: `${alert.adminName || 'Admin'} (${toPhoneNumber})`,
      phoneNumber: toPhoneNumber,
      channel: 'SMS',
      message: messageBody,
      status: 'Pending',
      dispatchType: 'Manual Test',
    });

    try {
      await sendSMS([toPhoneNumber], messageBody);
      log.status = 'Sent';
      await log.save();
      return res.json({ success: true, message: `Admin test SMS successfully sent to ${toPhoneNumber}` });
    } catch (smsError) {
      log.status = 'Failed';
      log.errorDetails = smsError.message;
      await log.save();
      return res.status(500).json({ success: false, error: smsError.message });
    }
  } catch (error) {
    console.error('[Manual Admin SMS Error]:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to dispatch manual admin SMS.' });
  }
});

// @route   POST /api/admin-alerts/:id/test-voice
// @desc    Manual Voice Call test alert for admin
router.post('/:id/test-voice', async (req, res) => {
  try {
    const alert = await AdminAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Admin alert not found' });

    // Fallback Chain for toPhoneNumber
    let toPhoneNumber = req.body.adminPhoneNumber || req.body.phone || req.body.toPhoneNumber || req.body.to;

    if (!toPhoneNumber && alert) {
      toPhoneNumber = alert.adminPhoneNumber || alert.phoneNumber || alert.phone;
    }

    if (!toPhoneNumber) {
      try {
        const mongoose = require('mongoose');
        const AdminSettings = mongoose.models.AdminSettings || mongoose.model('AdminSettings');
        if (AdminSettings) {
          const settings = await AdminSettings.findOne();
          if (settings) {
            toPhoneNumber = settings.adminPhoneNumber || settings.phone || settings.phoneNumber;
          }
        }
      } catch (e) {
        // Fail silently
      }
    }

    if (!toPhoneNumber) {
      toPhoneNumber = process.env.MY_PERSONAL_PHONE || process.env.TWILIO_PHONE_NUMBER || '+13186108740';
    }

    // Explicit validation check
    if (!toPhoneNumber) {
      return res.status(400).json({ success: false, message: "Missing recipient phone number (To parameter)." });
    }

    // Clean resolved phone number string and format to E.164
    toPhoneNumber = toPhoneNumber.replace(/[^\d+]/g, '');
    if (!toPhoneNumber.startsWith('+')) {
      toPhoneNumber = '+' + toPhoneNumber;
    }

    const messageBody = `Hello ${alert.adminName || 'Admin'}, this is Celebrate Mate reminding you about ${alert.title}. Notes are: ${alert.notes || 'none'}`;
    console.log(`[Manual Admin Call] Placing Twilio call to ${toPhoneNumber}`);

    const log = await NotificationLog.create({
      recipient: `${alert.adminName || 'Admin'} (${toPhoneNumber})`,
      phoneNumber: toPhoneNumber,
      channel: 'Voice',
      message: messageBody,
      status: 'Pending',
      dispatchType: 'Manual Test',
    });

    try {
      await makeVoiceCall(toPhoneNumber, messageBody);
      log.status = 'Sent';
      await log.save();
      return res.json({ success: true, message: `Admin test call placed to ${toPhoneNumber}` });
    } catch (callError) {
      log.status = 'Failed';
      log.errorDetails = callError.message;
      await log.save();
      return res.status(500).json({ success: false, error: callError.message });
    }
  } catch (error) {
    console.error('[Manual Admin Call Error]:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to place manual admin Twilio call.' });
  }
});

module.exports = router;
