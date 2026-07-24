const express = require('express');
const router  = express.Router();
const NotificationLog = require('../models/NotificationLog');
const { sendSMS }   = require('../services/smsService');
const { sendCustomEmail } = require('../services/emailService');

// @route   GET /api/logs
// @desc    Fetch paginated wish/delivery history logs
router.get('/', async (req, res) => {
  try {
    const { status, channel, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status  && status  !== 'All') filter.status  = status;
    if (channel && channel !== 'All') filter.channel = channel;

    const [logs, total] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      NotificationLog.countDocuments(filter),
    ]);

    res.json({ success: true, logs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('[Logs GET Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve history logs.' });
  }
});

// @route   DELETE /api/logs
// @desc    Clear all logs (admin utility)
router.delete('/', async (req, res) => {
  try {
    await NotificationLog.deleteMany({});
    res.json({ success: true, message: 'All logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear logs.' });
  }
});

// @route   POST /api/logs/:id/retry
// @desc    Retry a failed or pending alert
router.post('/:id/retry', async (req, res) => {
  try {
    const log = await NotificationLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log entry not found.' });

    if (log.status === 'Sent') {
      return res.status(400).json({ success: false, message: 'This message was already sent. Cannot retry.' });
    }

    log.status       = 'Pending';
    log.errorDetails = '';
    await log.save();

    try {
      if (log.channel === 'SMS') {
        await sendSMS([log.phoneNumber], log.message);
        log.status = 'Sent';
      } else if (log.channel === 'Voice') {
        const { makeVoiceCall } = require('../services/voiceService');
        await makeVoiceCall(log.phoneNumber, log.message);
        log.status = 'Sent';
      } else if (log.channel === 'Email') {
        await sendCustomEmail(log.email, `Retry: Celebration Reminder`, log.message);
        log.status = 'Sent';
      } else if (log.channel === 'WhatsApp') {
        const { sendWhatsAppMessage } = require('../services/whatsappService');
        await sendWhatsAppMessage(log.phoneNumber, log.message);
        log.status = 'Sent';
      }
    } catch (sendErr) {
      log.status       = 'Failed';
      log.errorDetails = sendErr.message;
    }

    log.timestamp = new Date();
    await log.save();

    res.json({
      success: log.status === 'Sent',
      status: log.status,
      message: log.status === 'Sent'
        ? `Retry successful! Message sent via ${log.channel}.`
        : `Retry failed: ${log.errorDetails}`,
    });
  } catch (err) {
    console.error('[Retry Error]:', err);
    res.status(500).json({ success: false, message: 'Server error during retry.' });
  }
});

module.exports = router;
