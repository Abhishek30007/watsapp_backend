const axios = require('axios');

// Hardcoded configurations to fallback to
const DEFAULT_API_KEY = '50af0f74-54d0-4ae*****************';
const DEFAULT_DEVICE_ID = 'iQOO I2223';

/**
 * Sends an SMS using the TextBee gateway.
 * @param {string[]} recipients - List of recipient phone numbers in E.164 format.
 * @param {string} message - Message text to send.
 * @returns {Promise<object>} Response data from TextBee API.
 */
async function sendSMS(recipients, message) {
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Recipients list must be a non-empty array of strings.');
  }
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a non-empty string.');
  }

  // Load values dynamically from process.env at call time to support live config updates
  const apiKey = process.env.TEXTBEE_API_KEY || DEFAULT_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID || DEFAULT_DEVICE_ID;

  // Safely URL-encode the device ID (handles spaces such as "iQOO I2223" -> "iQOO%20I2223")
  const TEXTBEE_API_ENDPOINT = `https://api.textbee.dev/api/v1/gateway/devices/${encodeURIComponent(deviceId)}/send-sms`;

  try {
    console.log(`[TextBee Service] Posting to ${TEXTBEE_API_ENDPOINT}`);
    const response = await axios.post(
      TEXTBEE_API_ENDPOINT,
      {
        recipients,
        message,
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[TextBee Service] Success response:', response.data);
    return response.data;
  } catch (error) {
    // Catch Axios errors explicitly
    if (error.response) {
      const responseData = error.response.data;
      console.error('[TextBee Service] Gateway responded with error:', responseData);
      
      // Pull explicit error message or build standard string
      const apiMessage = responseData?.message || responseData?.error || JSON.stringify(responseData);
      
      const customError = new Error(apiMessage);
      customError.status = error.response.status;
      customError.responseData = responseData;
      throw customError;
    } else if (error.request) {
      console.error('[TextBee Service] No response received from server.');
      throw new Error('TextBee Gateway server is unreachable.');
    } else {
      console.error('[TextBee Service] Request setup error:', error.message);
      throw error;
    }
  }
}

module.exports = {
  sendSMS,
  DEFAULT_DEVICE_ID,
};
