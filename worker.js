require('dotenv').config();
const { Worker } = require('bullmq');
const connectDB = require('./config/db');
const { redisConnection } = require('./config/redis');
const { WISH_QUEUE_NAME } = require('./jobs/wishQueue');
const Wish = require('./models/Wish');
const NotificationLog = require('./models/NotificationLog');
const { sendTwilioWhatsAppMessage, sendWhatsAppMessage } = require('./services/whatsappService');

console.log('====================================================');
console.log('   CelebrateMate Distributed Worker Service         ');
console.log('====================================================');

// Connect to MongoDB
connectDB().then(() => {
  console.log('[Worker] Connected to MongoDB.');

  // Initialize BullMQ Worker listening on the queue
  const worker = new Worker(
    WISH_QUEUE_NAME,
    async (job) => {
      console.log(`\n[Worker] Processing Job ID: ${job.id} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);
      const { wishId, contactName, phoneNumber, email, category, generatedMessage, channels } = job.data;

      const results = [];

      // 1. WhatsApp channel (Prioritizes Twilio)
      if (channels?.whatsapp) {
        console.log(`[Worker] Dispatching WhatsApp to ${contactName} (${phoneNumber}) via Twilio...`);
        const log = await NotificationLog.create({
          recipient: `${contactName} (${phoneNumber})`,
          phoneNumber,
          channel: 'WhatsApp',
          message: generatedMessage,
          status: 'Pending',
          dispatchType: 'BullMQ Worker (Twilio WhatsApp)',
        });

        try {
          // Attempt Twilio WhatsApp delivery
          const twilioRes = await sendTwilioWhatsAppMessage(phoneNumber, generatedMessage);
          log.status = 'Sent';
          log.metadata = { twilioSid: twilioRes.sid, attempt: job.attemptsMade + 1 };
          await log.save();
          results.push({ channel: 'whatsapp', success: true });
        } catch (twErr) {
          console.warn(`[Worker] Twilio WhatsApp direct attempt failed: ${twErr.message}`);
          // Fallback to unified sender if configured
          try {
            await sendWhatsAppMessage(phoneNumber, generatedMessage);
            log.status = 'Sent';
            await log.save();
            results.push({ channel: 'whatsapp', success: true });
          } catch (finalErr) {
            log.status = 'Failed';
            log.errorDetails = finalErr.message;
            await log.save();
            throw finalErr; // Throw to trigger BullMQ retry
          }
        }
      }

      // Update Wish status in MongoDB if wishId provided
      if (wishId) {
        try {
          await Wish.findByIdAndUpdate(wishId, { status: 'FIRED' });
          console.log(`[Worker] Wish ${wishId} marked as FIRED.`);
        } catch (dbErr) {
          console.error(`[Worker] Failed to update Wish status for ${wishId}:`, dbErr.message);
        }
      }

      return { success: true, results };
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 concurrent jobs simultaneously
    }
  );

  // Worker lifecycle event listeners
  worker.on('ready', () => {
    console.log(`[Worker] Worker is active and listening to queue: "${WISH_QUEUE_NAME}"`);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] ✅ Job ${job.id} completed successfully.`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}): ${err.message}`);
    
    // If all retries exhausted, mark wish as FAILED in MongoDB
    if (job && job.attemptsMade >= job.opts.attempts && job.data?.wishId) {
      try {
        await Wish.findByIdAndUpdate(job.data.wishId, { status: 'FAILED' });
        console.log(`[Worker] Wish ${job.data.wishId} permanently marked as FAILED after max retries.`);
      } catch (dbErr) {
        console.error(`[Worker] Error marking wish as FAILED:`, dbErr.message);
      }
    }
  });

  worker.on('error', (err) => {
    console.error('[Worker Error] Unhandled worker error:', err);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n[Worker] Gracefully closing worker...');
    await worker.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}).catch((err) => {
  console.error('[Worker Error] Failed to connect to MongoDB:', err);
  process.exit(1);
});
