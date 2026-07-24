const nodemailer = require('nodemailer');

/**
 * Creates a Nodemailer Gmail transporter using app-password auth.
 * Call this lazily so it always picks up the latest process.env values.
 */
function createTransporter() {
  // Gmail App Passwords are shown with spaces ("ibau bhni hqwy vuyf") but must be
  // sent without spaces ("ibaubhnihqwyvuyf"). Strip all whitespace to handle both formats.
  const appPassword = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: appPassword,
    },
  });
}

/**
 * Sends a custom email with a styled HTML card template.
 * @param {string} recipientEmail  - Destination email address.
 * @param {string} subject         - Email subject line.
 * @param {string} message         - Plain-text body to render inside the HTML card.
 * @returns {Promise<object>}      - Nodemailer sendMail info object.
 */
async function sendCustomEmail(recipientEmail, subject, message) {
  if (!recipientEmail || !subject || !message) {
    throw new Error('recipientEmail, subject, and message are all required.');
  }

  const transporter = createTransporter();

  // Verify SMTP connection before sending
  await transporter.verify();

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a15;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#12111f,#1a1830);border-radius:20px;border:1px solid rgba(147,51,234,0.25);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#9333ea,#ec4899);padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">CelebrateMate</p>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🎉 Celebration Reminder</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#f1f5f9;font-weight:700;">${subject}</h2>
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:28px;">
                <p style="margin:0;font-size:15px;line-height:1.8;color:#cbd5e1;white-space:pre-wrap;">${message}</p>
              </div>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.35);border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                Sent automatically by <strong style="color:#9333ea;">CelebrateMate</strong> · Real-time Event Notification Gateway
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from: `"CelebrateMate 🎉" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: subject,
    text: message, // Fallback plain text
    html: htmlTemplate,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email Service] Message sent: ${info.messageId} → ${recipientEmail}`);
  return info;
}

module.exports = { sendCustomEmail };
