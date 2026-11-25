const express = require('express');
const router = express.Router();
const Wish = require('../models/Wish');
const NotificationLog = require('../models/NotificationLog');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { scheduleWishJob, removeWishJob } = require('../jobs/wishQueue');

// @route   GET /api/wishes
// @desc    Retrieve all scheduled wishes sorted by scheduledDate
router.get('/', async (req, res) => {
  try {
    const wishes = await Wish.find().sort({ scheduledDate: 1 });
    res.json(wishes);
  } catch (error) {
    console.error('[GET /api/wishes Error]:', error);
    res.status(500).json({ message: 'Server error retrieving wishes list.' });
  }
});

// @route   POST /api/wishes
// @desc    Create a new scheduled wish and queue it in BullMQ
router.post('/', async (req, res) => {
  const { contactName, phoneNumber, email, category, scheduledDate, scheduledTime, generatedMessage, channels } = req.body;
  try {
    const newWish = new Wish({
      contactName,
      phoneNumber,
      email,
      category,
      scheduledDate,
      scheduledTime,
      generatedMessage,
      channels,
    });
    const savedWish = await newWish.save();

    // Enqueue into BullMQ with calculated delay
    try {
      await scheduleWishJob(savedWish);
    } catch (queueErr) {
      console.warn('[BullMQ Queue Warning] Could not enqueue job immediately (Redis may be offline):', queueErr.message);
    }

    res.status(201).json(savedWish);
  } catch (error) {
    console.error('[POST /api/wishes Error]:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error saving wish.' });
  }
});

// @route   PUT /api/wishes/:id
// @desc    Update an existing scheduled wish and update queue
router.put('/:id', async (req, res) => {
  const { contactName, phoneNumber, email, category, scheduledDate, scheduledTime, generatedMessage, channels, status } = req.body;
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) return res.status(404).json({ message: 'Scheduled wish not found' });

    if (contactName !== undefined) wish.contactName = contactName;
    if (phoneNumber !== undefined) wish.phoneNumber = phoneNumber;
    if (email !== undefined) wish.email = email;
    if (category !== undefined) wish.category = category;
    if (scheduledDate !== undefined) wish.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) wish.scheduledTime = scheduledTime;
    if (generatedMessage !== undefined) wish.generatedMessage = generatedMessage;
    if (channels !== undefined) wish.channels = channels;
    if (status !== undefined) wish.status = status;

    const updatedWish = await wish.save();

    // Reschedule in BullMQ if status is PENDING
    if (updatedWish.status === 'PENDING') {
      try {
        await scheduleWishJob(updatedWish);
      } catch (queueErr) {
        console.warn('[BullMQ Queue Warning] Could not reschedule job in Redis:', queueErr.message);
      }
    } else {
      await removeWishJob(updatedWish._id);
    }

    res.json(updatedWish);
  } catch (error) {
    console.error('[PUT /api/wishes/:id Error]:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error updating wish.' });
  }
});

// @route   DELETE /api/wishes/:id
// @desc    Delete a scheduled wish and remove from BullMQ
router.delete('/:id', async (req, res) => {
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) return res.status(404).json({ message: 'Scheduled wish not found' });
    
    // Remove from BullMQ queue
    await removeWishJob(wish._id);
    await wish.deleteOne();
    res.json({ message: 'Scheduled wish successfully deleted' });
  } catch (error) {
    console.error('[DELETE /api/wishes/:id Error]:', error);
    res.status(500).json({ message: 'Server error deleting wish.' });
  }
});

// @route   POST /api/wishes/:id/test-whatsapp
// @desc    Trigger manual test WhatsApp message for a wish
router.post('/:id/test-whatsapp', async (req, res) => {
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) return res.status(404).json({ success: false, message: 'Scheduled wish not found' });

    console.log(`[Manual WhatsApp] Dispatching test to ${wish.phoneNumber}`);

    const log = await NotificationLog.create({
      recipient: `${wish.contactName} (${wish.phoneNumber})`,
      phoneNumber: wish.phoneNumber,
      channel: 'WhatsApp',
      message: wish.generatedMessage,
      status: 'Pending',
      dispatchType: 'Manual Test',
    });

    try {
      await sendWhatsAppMessage(wish.phoneNumber, wish.generatedMessage);
      log.status = 'Sent';
      await log.save();
      res.json({ success: true, message: `WhatsApp test successfully sent to ${wish.phoneNumber}` });
    } catch (apiError) {
      log.status = 'Failed';
      log.errorDetails = apiError.message;
      await log.save();
      throw apiError;
    }
  } catch (error) {
    console.error('[Manual WhatsApp Error]:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to dispatch manual WhatsApp test.' });
  }
});

module.exports = router;
