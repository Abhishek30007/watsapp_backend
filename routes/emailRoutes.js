const express = require('express');
const router = express.Router();
const { sendCustomEmail } = require('../services/emailService');
const NotificationLog = require('../models/NotificationLog');

// @route   POST /api/email/send-custom-email
router.post('/send-custom-email', async (req, res) => {
  const { recipientEmail, subject, message, contactName } = req.body;

  if (!recipientEmail || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required: recipientEmail, subject, and message.',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    return res.status(400).json({ success: false, message: 'Invalid email address format.' });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({
      success: false,
      message: 'Email service not configured. Set EMAIL_USER and EMAIL_PASS in .env.',
    });
  }

  const name = contactName || recipientEmail.split('@')[0];

  // Create Pending log entry
  const log = await NotificationLog.create({
    recipient:    `${name} (${recipientEmail})`,
    email:        recipientEmail,
    channel:      'Email',
    message:      `Subject: ${subject}\n\n${message}`,
    status:       'Pending',
    dispatchType: 'Manual Test',
  });

  try {
    console.log(`[Email Route] Dispatching email to: ${recipientEmail}`);
    const info = await sendCustomEmail(recipientEmail, subject, message);

    log.status = 'Sent';
    await log.save();

    res.status(200).json({
      success: true,
      message: `Email successfully sent to ${recipientEmail}`,
      messageId: info.messageId,
    });
  } catch (error) {
    log.status       = 'Failed';
    log.errorDetails = error.message;
    await log.save();

    console.error('[Email Route Error]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email. Please check your Gmail credentials.',
    });
  }
});

module.exports = router;
