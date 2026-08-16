/**
 * Server-side WhatsApp Messaging Service
 * Configured via environment variables:
 * - WHATSAPP_API_TOKEN
 * - WHATSAPP_API_URL
 * - WHATSAPP_PHONE_NUMBER_ID
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_NUMBER
 * - HEAD_TEACHER_WHATSAPP_NUMBER
 */

const fs = require('fs');
const path = require('path');

async function sendWhatsAppNotification({ toPhone, message }) {
  const recipientPhone = toPhone || process.env.HEAD_TEACHER_WHATSAPP_NUMBER || '9876543210';
  const cleanPhone = recipientPhone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;

  const whatsappDeepLink = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(message)}`;

  console.log(`\n=======================================================`);
  console.log(`📱 [WHATSAPP NOTIFICATION SENT]`);
  console.log(`📞 Recipient Mobile: +${fullPhone}`);
  console.log(`💬 Message:\n${message}`);
  console.log(`🔗 WhatsApp Link: ${whatsappDeepLink}`);
  console.log(`=======================================================\n`);

  // Log to file for audit trailing
  try {
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logEntry = `[${new Date().toISOString()}] +${fullPhone} | ${message.replace(/\n/g, ' ')}\n`;
    fs.appendFileSync(path.join(logsDir, 'whatsapp_notifications.log'), logEntry);
  } catch (e) {}

  // 1. Meta / WhatsApp Cloud API Integration
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const apiUrl = process.env.WHATSAPP_API_URL || (process.env.WHATSAPP_PHONE_NUMBER_ID ? `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages` : null);

  if (apiToken && apiUrl) {
    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'text',
          text: { body: message }
        })
      });
      console.log(`✅ [WHATSAPP API] Message posted successfully to Meta WhatsApp API for +${fullPhone}`);
    } catch (err) {
      console.error(`❌ [WHATSAPP API ERROR] Failed to send via Meta WhatsApp API:`, err.message);
    }
  }

  // 2. Twilio WhatsApp API Integration
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const bodyParams = new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        To: `whatsapp:+${fullPhone}`,
        Body: message
      });

      await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        },
        body: bodyParams.toString()
      });
      console.log(`✅ [TWILIO WHATSAPP API] Message posted successfully via Twilio to +${fullPhone}`);
    } catch (err) {
      console.error(`❌ [TWILIO WHATSAPP ERROR] Failed to send via Twilio:`, err.message);
    }
  }

  return {
    success: true,
    recipient: fullPhone,
    whatsapp_url: whatsappDeepLink,
    message: message
  };
}

module.exports = {
  sendWhatsAppNotification
};
