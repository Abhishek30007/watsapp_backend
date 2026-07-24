const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const Wish = require('../models/Wish');

// Use memory storage — no temp files on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are accepted.'));
    }
  },
});

/**
 * Parse a raw CSV string into an array of objects using a naive but robust parser.
 * We do this server-side without papaparse to keep it dependency-free.
 */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return headers.reduce((obj, h, i) => {
      obj[h] = values[i] || '';
      return obj;
    }, {});
  });
}

// @route   POST /api/import/csv
// @desc    Bulk import contacts from a CSV file upload
router.post('/csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });
  }

  const text = req.file.buffer.toString('utf-8');
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return res.status(400).json({ success: false, message: 'CSV is empty or has no data rows.' });
  }

  const results = { imported: 0, skipped: 0, errors: [] };

  // Process rows concurrently in batches of 10
  const BATCH = 10;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async (row, idx) => {
      const lineNum = i + idx + 2; // +2 because header is line 1
      try {
        // Flexible field mapping — accept various header names
        const name           = row.name || row.fullname || row['full name'] || '';
        const phoneNumber    = row.phonenumber || row.phone || row['phone number'] || row.mobile || '';
        const email          = row.email || row.emailaddress || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
        const eventType      = row.eventtype || row.event || row['event type'] || 'Birthday';
        const eventDate      = row.eventdate || row.date || row['event date'] || '';
        const notificationTime = row.notificationtime || row.time || row['notification time'] || '09:00';
        const notes          = row.notes || row.note || '';

        if (!name || !phoneNumber || !eventDate) {
          results.skipped++;
          results.errors.push(`Row ${lineNum}: Missing required field(s) — name, phoneNumber, or eventDate.`);
          return;
        }

        // Validate E.164 phone number
        if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
          results.skipped++;
          results.errors.push(`Row ${lineNum} (${name}): Phone "${phoneNumber}" is not valid E.164 format.`);
          return;
        }

        // Validate date
        const parsed = new Date(eventDate);
        if (isNaN(parsed.getTime())) {
          results.skipped++;
          results.errors.push(`Row ${lineNum} (${name}): Invalid date "${eventDate}".`);
          return;
        }

        await Wish.create({
          contactName: name,
          phoneNumber,
          email,
          category: eventType,
          scheduledDate: parsed,
          scheduledTime: notificationTime,
          generatedMessage: notes || `Wishing you a wonderful celebration!`,
          channels: {
            whatsapp: true,
            sms: false,
            email: false
          },
          status: 'PENDING'
        });
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
// @desc    Download a sample CSV template
router.get('/sample', (req, res) => {
  const csv = [
    'name,phoneNumber,eventType,eventDate,notificationTime,notes',
    'Priya Sharma,+919876543210,Birthday,1995-03-15,09:00,Best friend since college',
    'Rohan Verma,+918765432109,Anniversary,2019-06-22,10:30,Work anniversary',
    'Ananya Patel,+917654321098,Graduation,2024-05-20,08:00,Proud moment!',
  ].join('\n');

  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="celebratemate-contacts-template.csv"');
  res.send(csv);
});

module.exports = router;
