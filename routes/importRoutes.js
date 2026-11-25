const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const Wish = require('../models/Wish');
const { scheduleWishJob } = require('../jobs/wishQueue');

// Use memory storage for CSV parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are accepted.'));
    }
  },
});

/**
 * Robust CSV parser that parses raw CSV string into an array of row objects
 */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

  return lines.slice(1).map(line => {
    // Basic CSV line splitter supporting quoted comma values
    const values = [];
    let insideQuotes = false;
    let currentVal = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

    return headers.reduce((obj, h, i) => {
      obj[h] = values[i] !== undefined ? values[i] : '';
      return obj;
    }, {});
  });
}

// @route   POST /api/import/csv
// @desc    Bulk import contacts from CSV and automatically schedule WhatsApp wishes
router.post('/csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });
  }

  const text = req.file.buffer.toString('utf-8');
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return res.status(400).json({ success: false, message: 'CSV file is empty or has no data rows.' });
  }

  const results = { imported: 0, skipped: 0, errors: [] };

  // Process rows in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (row, idx) => {
      const lineNum = i + idx + 2; // Row number in file
      try {
        // Flexible field mappings
        const name        = (row.name || row.fullname || row['full name'] || row.contactname || row['contact name'] || '').trim();
        let phoneNumber   = (row.phonenumber || row.phone || row['phone number'] || row.mobile || '').trim();
        const category    = (row.category || row.eventtype || row.event || row['event type'] || 'Birthday').trim();
        const dateStr     = (row.date || row.eventdate || row['event date'] || row.scheduleddate || row['scheduled date'] || '').trim();
        const timeStr     = (row.time || row.notificationtime || row['notification time'] || row.scheduledtime || row['scheduled time'] || '09:00').trim();
        const customMsg   = (row.message || row.generatedmessage || row['generated message'] || row.notes || row.note || '').trim();

        if (!name || !phoneNumber || !dateStr) {
          results.skipped++;
          results.errors.push(`Row ${lineNum}: Missing required fields (Name, Phone Number, or Date).`);
          return;
        }

        // Clean & format E.164 phone number
        phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
        if (!phoneNumber.startsWith('+')) {
          phoneNumber = '+' + phoneNumber;
        }

        if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
          results.skipped++;
          results.errors.push(`Row ${lineNum} (${name}): Invalid E.164 phone number "${phoneNumber}".`);
          return;
        }

        // Validate date
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
          results.skipped++;
          results.errors.push(`Row ${lineNum} (${name}): Invalid scheduled date "${dateStr}".`);
          return;
        }

        // Validate or normalize time in HH:mm
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
        const normalizedTime = timePattern.test(timeStr) ? timeStr : '09:00';

        // Auto-generate message if blank
        const finalMessage = customMsg || `Happy ${category}, ${name}! Wishing you joy, health, and great celebration on this special day! 🎉`;

        // Create wish in MongoDB
        const newWish = await Wish.create({
          contactName: name,
          phoneNumber,
          category,
          scheduledDate: parsedDate,
          scheduledTime: normalizedTime,
          generatedMessage: finalMessage,
          channels: {
            whatsapp: true,
          },
          status: 'PENDING',
        });

        // Automatically enqueue into BullMQ delayed job queue
        try {
          await scheduleWishJob(newWish);
        } catch (queueErr) {
          console.warn(`[Bulk Import] Could not enqueue BullMQ job for ${newWish._id}:`, queueErr.message);
        }

        results.imported++;
      } catch (err) {
        results.skipped++;
        results.errors.push(`Row ${lineNum}: ${err.message}`);
      }
    }));
  }

  const status = results.imported > 0 ? 200 : 422;
  res.status(status).json({ success: results.imported > 0, ...results });
});

// @route   GET /api/import/sample
// @desc    Download sample CSV template for bulk contact imports
router.get('/sample', (req, res) => {
  const sampleCSV = [
    'name,phoneNumber,eventType,eventDate,notificationTime,notes',
    'Priya Sharma,+918252369636,Birthday,2026-12-15,09:00,Wishing you the happiest birthday filled with joy and success!',
    'Rohan Verma,+919876543210,Anniversary,2026-11-28,10:30,Congratulations on your milestone anniversary celebration!',
    'Ananya Patel,+917654321098,Graduation,2026-12-01,08:00,So proud of your graduation achievement! Keep soaring high!',
  ].join('\n');

  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="celebratemate-bulk-contacts.csv"');
  res.send(sampleCSV);
});

module.exports = router;
