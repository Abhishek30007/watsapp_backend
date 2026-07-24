const cron = require('node-cron');
const Wish = require('../models/Wish');
const AdminAlert = require('../models/AdminAlert');
const NotificationLog = require('../models/NotificationLog');
const { sendWhatsAppMessage } = require('./whatsappService');
const { sendSMS } = require('./smsService');
const { sendCustomEmail } = require('./emailService');
const { makeVoiceCall } = require('./voiceService');

function startScheduler() {
  console.log('[Scheduler] Background worker initialized. Checking for event matches every minute...');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDate  = now.getDate();

      // ─── 1. PROCESS WISHES SCHEDULER ─────────────────────────────────────
      const pendingWishes = await Wish.find({ status: 'PENDING', scheduledTime: currentHHmm });
      const dueWishes = pendingWishes.filter(wish => {
        const d = new Date(wish.scheduledDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate;
      });

      if (dueWishes.length > 0) {
        console.log(`[Scheduler] Found ${dueWishes.length} wishes due at ${currentHHmm}`);
        
        for (const wish of dueWishes) {
          const dispatchPromises = [];

          // WhatsApp (Primary)
          if (wish.channels?.whatsapp) {
            dispatchPromises.push((async () => {
              const log = await NotificationLog.create({
                recipient: `${wish.contactName} (${wish.phoneNumber})`,
                phoneNumber: wish.phoneNumber,
                channel: 'WhatsApp',
                message: wish.generatedMessage,
                status: 'Pending',
                dispatchType: 'Automated Cron'
              });
              try {
                await sendWhatsAppMessage(wish.phoneNumber, wish.generatedMessage);
                log.status = 'Sent';
                await log.save();
              } catch (err) {
                log.status = 'Failed';
                log.errorDetails = err.message;
                await log.save();
                throw err;
              }
            })());
          }

          // SMS
          if (wish.channels?.sms) {
            dispatchPromises.push((async () => {
              const log = await NotificationLog.create({
                recipient: `${wish.contactName} (${wish.phoneNumber})`,
                phoneNumber: wish.phoneNumber,
                channel: 'SMS',
                message: wish.generatedMessage,
                status: 'Pending',
                dispatchType: 'Automated Cron'
              });
              try {
                await sendSMS([wish.phoneNumber], wish.generatedMessage);
                log.status = 'Sent';
                await log.save();
              } catch (err) {
                log.status = 'Failed';
                log.errorDetails = err.message;
                await log.save();
                throw err;
              }
            })());
          }

          // Email
          if (wish.channels?.email) {
            dispatchPromises.push((async () => {
              const log = await NotificationLog.create({
                recipient: `${wish.contactName} (${wish.email})`,
                email: wish.email,
                channel: 'Email',
                message: wish.generatedMessage,
                status: 'Pending',
                dispatchType: 'Automated Cron'
              });
              try {
                await sendCustomEmail(wish.email, `Celebration Reminder: ${wish.category}`, wish.generatedMessage);
                log.status = 'Sent';
                await log.save();
              } catch (err) {
                log.status = 'Failed';
                log.errorDetails = err.message;
                await log.save();
                throw err;
              }
            })());
          }

          if (dispatchPromises.length > 0) {
            const results = await Promise.allSettled(dispatchPromises);
            const hasSucceeded = results.some(r => r.status === 'fulfilled');
            wish.status = hasSucceeded ? 'FIRED' : 'FAILED';
          } else {
            // No channels selected
            wish.status = 'FIRED';
          }
          await wish.save();
        }
      }

      // ─── 2. PROCESS ADMIN ALERTS SCHEDULER ──────────────────────────────
      const pendingAdminAlerts = await AdminAlert.find({ status: 'PENDING', scheduledTime: currentHHmm });
      const dueAdminAlerts = pendingAdminAlerts.filter(alert => {
        const d = new Date(alert.scheduledDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate;
      });

      if (dueAdminAlerts.length > 0) {
        console.log(`[Scheduler] Found ${dueAdminAlerts.length} admin alerts due at ${currentHHmm}`);

        for (const alert of dueAdminAlerts) {
          const dispatchPromises = [];
          const alertMessage = `Admin Alert: ${alert.title}. Notes: ${alert.notes || 'None'}`;
          const voiceMessage = `Hello ${alert.adminName}, this is Celebrate Mate reminding you about ${alert.title}. Notes are: ${alert.notes || 'none'}`;

          // WhatsApp (Primary)
          if (alert.channels?.whatsapp) {
            dispatchPromises.push((async () => {
              const log = await NotificationLog.create({
                recipient: `${alert.adminName} (${alert.adminPhoneNumber})`,
                phoneNumber: alert.adminPhoneNumber,
                channel: 'WhatsApp',
                message: alertMessage,
                status: 'Pending',
                dispatchType: 'Automated Cron'
              });
              try {
                await sendWhatsAppMessage(alert.adminPhoneNumber, alertMessage);
                log.status = 'Sent';
                await log.save();
              } catch (err) {
                log.status = 'Failed';
                log.errorDetails = err.message;
                await log.save();
                throw err;
              }
            })());
          }

          // SMS
          if (alert.channels?.sms) {
            dispatchPromises.push((async () => {
              const log = await NotificationLog.create({
                recipient: `${alert.adminName} (${alert.adminPhoneNumber})`,
                phoneNumber: alert.adminPhoneNumber,
                channel: 'SMS',
                message: alertMessage,
                status: 'Pending',
                dispatchType: 'Automated Cron'
              });
              try {
                await sendSMS([alert.adminPhoneNumber], alertMessage);
                log.status = 'Sent';
                await log.save();
              } catch (err) {
                log.status = 'Failed';
                log.errorDetails = err.message;
                await log.save();
                throw err;
              }
            })());
          }

          // Voice Calls
          if (alert.channels?.voiceCall) {
            dispatchPromises.push((async () => {
              const log = await NotificationLog.create({
                recipient: `${alert.adminName} (${alert.adminPhoneNumber})`,
                phoneNumber: alert.adminPhoneNumber,
                channel: 'Voice',
                message: voiceMessage,
                status: 'Pending',
                dispatchType: 'Automated Cron'
              });
              try {
                await makeVoiceCall(alert.adminPhoneNumber, voiceMessage);
                log.status = 'Sent';
                await log.save();
              } catch (err) {
                log.status = 'Failed';
                log.errorDetails = err.message;
                await log.save();
                throw err;
              }
            })());
          }

          if (dispatchPromises.length > 0) {
            const results = await Promise.allSettled(dispatchPromises);
            const hasSucceeded = results.some(r => r.status === 'fulfilled');
            alert.status = hasSucceeded ? 'FIRED' : 'FAILED';
          } else {
            // No channels selected
            alert.status = 'FIRED';
          }
          await alert.save();
        }
      }

    } catch (err) {
      console.error('[Scheduler System Error]:', err);
    }
  });
}

module.exports = { startScheduler };
