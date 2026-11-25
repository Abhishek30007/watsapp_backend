const twilio = require('twilio');
const axios = require('axios');

/**
 * Sends a WhatsApp message via Twilio Programmable Messaging API.
 * @param {string} toPhoneNumber - Recipient's phone number in E.164 (e.g. +919876543210).
 * @param {string} messageText - The body content of the message.
 * @returns {Promise<object>} The Twilio message response object.
 */
async function sendTwilioWhatsAppMessage(toPhoneNumber, messageText) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // Twilio WhatsApp sender format is usually "whatsapp:+14155238886" (sandbox) or customized sender
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio WhatsApp credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER or TWILIO_PHONE_NUMBER) are not configured.');
  }

  const client = twilio(accountSid, authToken);

  const cleanFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
  const cleanTo = toPhoneNumber.startsWith('whatsapp:') ? toPhoneNumber : `whatsapp:${toPhoneNumber}`;

  console.log(`[Twilio WhatsApp] Dispatching message from ${cleanFrom} to ${cleanTo}...`);
  const message = await client.messages.create({
    from: cleanFrom,
    to: cleanTo,
    body: messageText,
  });

  console.log(`[Twilio WhatsApp] Sent successfully! SID: ${message.sid}, Status: ${message.status}`);
  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
    from: message.from,
    dateCreated: message.dateCreated,
  };
}

/**
 * Sends a WhatsApp message using the Wappfly API (Alternative/Fallback gateway).
 * @param {string} toPhoneNumber - Recipient's phone number (e.g., +919876543210).
 * @param {string} messageText - The body content of the message.
 * @returns {Promise<object>} The API response data.
 */
async function sendWappflyWhatsAppMessage(toPhoneNumber, messageText) {
  const apiToken = process.env.WAPPFLY_API_TOKEN;
  if (!apiToken) {
    throw new Error('Wappfly API token is not configured. Please set WAPPFLY_API_TOKEN in your environment.');
  }

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

  const response = await axios.post(url, data, { headers });
  return response.data;
}

/**
 * Unified WhatsApp dispatcher. Prioritizes Twilio if configured, otherwise falls back to Wappfly.
 * @param {string} toPhoneNumber - Recipient's phone number.
 * @param {string} messageText - The body content of the message.
 * @returns {Promise<object>}
 */
async function sendWhatsAppMessage(toPhoneNumber, messageText) {
  if (!toPhoneNumber || typeof toPhoneNumber !== 'string') {
    throw new Error('Recipient phone number must be a non-empty string.');
  }
  if (!messageText || typeof messageText !== 'string') {
    throw new Error('Message text must be a non-empty string.');
  }

  // If Twilio credentials are provided, use Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      return await sendTwilioWhatsAppMessage(toPhoneNumber, messageText);
    } catch (twilioErr) {
      console.warn('[WhatsApp Service] Twilio dispatch failed, trying Wappfly fallback if configured...', twilioErr.message);
      if (process.env.WAPPFLY_API_TOKEN) {
        return await sendWappflyWhatsAppMessage(toPhoneNumber, messageText);
      }
      throw twilioErr;
    }
  }

  // Otherwise, use Wappfly
  return await sendWappflyWhatsAppMessage(toPhoneNumber, messageText);
}

module.exports = {
  sendWhatsAppMessage,
  sendTwilioWhatsAppMessage,
  sendWappflyWhatsAppMessage,
};
