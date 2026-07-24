const express = require('express');
const router = express.Router();
const { generateWish, TONES } = require('../services/aiService');

// @route   POST /api/ai/generate-wish
// @desc    Generate a personalized AI wish using Gemini
router.post('/generate-wish', async (req, res) => {
  const { name, eventType, relationship, tone } = req.body;

  if (!name || !eventType || !relationship) {
    return res.status(400).json({
      success: false,
      message: 'name, eventType, and relationship are required.',
    });
  }

  const validTones = Object.keys(TONES);
  const selectedTone = validTones.includes(tone) ? tone : 'Emotional';

  try {
    const wish = await generateWish(name, eventType, relationship, selectedTone);
    res.json({ success: true, wish, tone: selectedTone });
  } catch (err) {
    console.error('[AI Route Error]:', err.message);
    const status = err.message.includes('GEMINI_API_KEY') ? 503 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// @route   POST /api/ai/generate-alert-context
// @desc    Generate brief contextual tips/checklists for admin alerts
router.post('/generate-alert-context', async (req, res) => {
  const { title, notes } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Alert title is required.' });
  }
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env.');
    }
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });

    const prompt = `You are a virtual assistant helping an administrator prepare for their scheduled task reminder.
The reminder is titled: "${title}"
The notes are: "${notes || 'None'}"

Generate a short checklist or preparation context for this task (maximum 3 bullet points, under 3 sentences total). Be highly concise, professional, and clear. Avoid greeting words.`;

    const result = await model.generateContent(prompt);
    const context = result.response.text().trim();
    res.json({ success: true, context });
  } catch (err) {
    console.error('[AI Alert Context Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
