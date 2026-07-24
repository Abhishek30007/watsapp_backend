const express = require('express');
const router = express.Router();
const { generateCard } = require('../services/cardService');

// @route   GET /api/card/generate
// @desc    Stream a PNG greeting card image
// Query params: name, eventType, message
router.get('/generate', (req, res) => {
  const { name, eventType, message } = req.query;

  if (!name || !eventType || !message) {
    return res.status(400).json({ message: 'name, eventType, and message query params are required.' });
  }

  try {
    const buffer = generateCard(
      decodeURIComponent(name),
      decodeURIComponent(eventType),
      decodeURIComponent(message)
    );

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `inline; filename="celebratemate-card.png"`);
    res.set('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (err) {
    console.error('[Card Route Error]:', err.message);
    res.status(500).json({ message: 'Failed to generate greeting card.' });
  }
});

module.exports = router;
