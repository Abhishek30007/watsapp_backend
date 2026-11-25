const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');

// Name of queue for notification dispatches
const WISH_QUEUE_NAME = 'wish-notification-queue';

// BullMQ Queue instance
const wishQueue = new Queue(WISH_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s retries
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for history
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

/**
 * Helper to compute delay in milliseconds from date and 24-hr time strings
 * @param {string|Date} dateStr - Date string or Date object
 * @param {string} timeStr - "HH:mm" 24-hour time
 * @returns {number} Delay in milliseconds (minimum 0)
 */
function calculateJobDelay(dateStr, timeStr) {
  if (!dateStr || !timeStr) return 0;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const targetDate = new Date(dateStr);
  targetDate.setHours(hours, minutes, 0, 0);

  const now = Date.now();
  const delay = targetDate.getTime() - now;
  return delay > 0 ? delay : 0;
}

/**
 * Schedule a wish job into the BullMQ Queue
 * @param {object} wish - Wish document or object
 * @returns {Promise<Job>}
 */
async function scheduleWishJob(wish) {
  const delay = calculateJobDelay(wish.scheduledDate, wish.scheduledTime);
  const jobId = `wish-${wish._id}`;

  console.log(`[Queue Producer] Scheduling wish job "${jobId}" with delay: ${Math.round(delay / 1000)}s`);

  // Remove existing delayed job if rescheduling
  try {
    const existingJob = await wishQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
    }
  } catch (err) {
    // Ignore if job was already processed or removed
  }

  return await wishQueue.add(
    'dispatch-wish',
    {
      wishId: wish._id ? wish._id.toString() : null,
      contactName: wish.contactName,
      phoneNumber: wish.phoneNumber,
      email: wish.email,
      category: wish.category,
      generatedMessage: wish.generatedMessage,
      channels: wish.channels,
    },
    {
      jobId,
      delay,
    }
  );
}

/**
 * Remove a scheduled wish job from the queue
 * @param {string} wishId
 */
async function removeWishJob(wishId) {
  try {
    const jobId = `wish-${wishId}`;
    const job = await wishQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`[Queue Producer] Removed wish job "${jobId}"`);
    }
  } catch (err) {
    console.warn(`[Queue Producer] Failed to remove job wish-${wishId}:`, err.message);
  }
}

module.exports = {
  WISH_QUEUE_NAME,
  wishQueue,
  scheduleWishJob,
  removeWishJob,
  calculateJobDelay,
};
