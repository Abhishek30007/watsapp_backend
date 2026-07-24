const twilio = require('twilio');

/**
 * Initiates an outbound voice call with Text-to-Speech message.
 * @param {string} to - Recipient phone number in E.164 format.
 * @param {string} message - Message to be read out via Text-to-Speech.
 * @returns {Promise<object>} Twilio Call response.
 */
async function makeVoiceCall(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials or phone number are not fully configured in environment variables.');
  }

  const client = twilio(accountSid, authToken);
  
  // Use Twilio's official VoiceResponse SDK builder to generate valid TwiML
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  
  response.say({ voice: 'alice' }, message);

  // Alternatively, if your network requires a URL endpoint or Twimlet echo:
  const twimlUrl = `https://twimlets.com/echo?Twiml=${encodeURIComponent(response.toString())}`;

  try {
    const call = await client.calls.create({
      url: twimlUrl, // Pass the encoded URL containing your speech text
      to,
      from,
    });
    return call;
  } catch (error) {
    console.error('[Twilio Voice SDK Error]:', error.message);
    throw new Error(`Twilio SDK error: ${error.message}`);
  }
}

module.exports = { makeVoiceCall };