const express = require('express');
const router = express.Router();
const { sendWhatsAppMessage } = require('../services/whatsappService');
const NotificationLog = require('../models/NotificationLog');

/**
 * @route   POST /api/whatsapp/send-test
 * @desc    Send a test WhatsApp message manually and log its status
 * @access  Public (or protected if auth is configured, but matches other routes in the app)
 */
router.post('/send-test', async (req, res) => {
  // Support multiple request parameter variations (toPhoneNumber / phoneNumber / to) & (messageText / message / text)
  const toPhoneNumber = req.body.toPhoneNumber || req.body.phoneNumber || req.body.to;
  const messageText = req.body.messageText || req.body.message || req.body.text;

  if (!toPhoneNumber || !messageText) {
    return res.status(400).json({
      success: false,
      message: 'Both recipient phone number (toPhoneNumber) and message content (messageText) are required.',
    });
  }

  // Pre-create the log entry as Pending
  const log = await NotificationLog.create({
    recipient: `WhatsApp Target (${toPhoneNumber})`,
    phoneNumber: toPhoneNumber,
    channel: 'WhatsApp',
    message: messageText,
    status: 'Pending',
    dispatchType: 'Manual Test',
  });

  try {
    console.log(`[WhatsApp Route] Dispatching test WhatsApp to: ${toPhoneNumber}`);
    const apiResponse = await sendWhatsAppMessage(toPhoneNumber, messageText);

    // Update log entry to Sent
    log.status = 'Sent';
    await log.save();

    return res.status(200).json({
      success: true,
      message: `WhatsApp test message successfully sent to ${toPhoneNumber}`,
      data: apiResponse,
    });
  } catch (error) {
    // Update log entry to Failed with error details
    log.status = 'Failed';
    log.errorDetails = error.message;
    await log.save();

    console.error('[WhatsApp Route Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to dispatch manual WhatsApp test message.',
      error: error.responseData || error.message,
    });
  }
});

module.exports = router;
