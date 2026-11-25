require('dotenv').config();
const { sendTwilioWhatsAppMessage } = require('./services/whatsappService');

const targetPhone = process.argv[2] || '+918252369636';
const message = process.argv[3] || '🎉 Hello from CelebrateMate! Your Twilio WhatsApp connection is working perfectly!';

console.log(`[Test Script] Sending WhatsApp message to: ${targetPhone}`);
console.log(`[Test Script] From Sandbox: ${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`);

sendTwilioWhatsAppMessage(targetPhone, message)
  .then((res) => {
    console.log('✅ WhatsApp message dispatched successfully via Twilio!');
    console.log('Message SID:', res.sid);
    console.log('Status:', res.status);
    console.log('To:', res.to);
    console.log('From:', res.from);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed to dispatch message via Twilio:');
    console.error(err.message);
    if (err.code === 21654 || err.message.includes('ContentSid Required')) {
      console.log('\n⚠️ ACTION REQUIRED:');
      console.log('Your number has not linked with the Twilio WhatsApp Sandbox yet.');
      console.log('1. Open WhatsApp on ' + targetPhone);
      console.log('2. Send "join twilio-trial" to +1 737 250 8034');
      console.log('3. Wait for the confirmation message from Twilio, then re-run this script!');
    }
    process.exit(1);
  });
