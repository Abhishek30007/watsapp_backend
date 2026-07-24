const axios = require('axios');

/**
 * Sends a WhatsApp message using the Wappfly API.
 * @param {string} toPhoneNumber - Recipient's phone number (e.g., +919876543210).
 * @param {string} messageText - The body content of the message.
 * @returns {Promise<object>} The API response data.
 */
async function sendWhatsAppMessage(toPhoneNumber, messageText) {
  if (!toPhoneNumber || typeof toPhoneNumber !== 'string') {
    throw new Error('Recipient phone number must be a non-empty string.');
  }
  if (!messageText || typeof messageText !== 'string') {
    throw new Error('Message text must be a non-empty string.');
  }

  const apiToken = process.env.WAPPFLY_API_TOKEN;
  if (!apiToken) {
    throw new Error('Wappfly API token is not configured. Please set WAPPFLY_API_TOKEN in your environment.');
  }

  // Format phone number: strip non-numeric characters and append WhatsApp suffix
  const cleanNumber = toPhoneNumber.replace(/\D/g, '');
  const formattedPhoneNumber = `${cleanNumber}@s.whatsapp.net`;

  const url = 'https://wappfly.com/api/messages/send';
  const headers = {
    'X-API-Token': apiToken,
    'Content-Type': 'application/json',
  };
  const data = {
    to: formattedPhoneNumber,
    text: messageText,
  };

  try {
    console.log(`[Wappfly Service] Sending WhatsApp message to: ${formattedPhoneNumber}`);
    const response = await axios.post(url, data, { headers });
    
    console.log('[Wappfly Service] Success response:', response.data);
    return response.data;
  } catch (error) {
    // Catch and process axios error response
    if (error.response) {
      const responseData = error.response.data;
      console.error('[Wappfly Service] API responded with error:', responseData);
      
      const apiMessage = responseData?.message || responseData?.error || JSON.stringify(responseData);
      const customError = new Error(`Wappfly API error: ${apiMessage}`);
      customError.status = error.response.status;
      customError.responseData = responseData;
      throw customError;
    } else if (error.request) {
      console.error('[Wappfly Service] No response received from Wappfly server.');
      throw new Error('Wappfly API server is unreachable.');
    } else {
      console.error('[Wappfly Service] Request setup error:', error.message);
      throw error;
    }
  }
}

module.exports = {
  sendWhatsAppMessage,
};
