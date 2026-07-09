async function sendOtpSms(mobileNumber, otp) {
  const provider = String(process.env.SMS_PROVIDER || 'console').toLowerCase();
  const message = `Your MSIL APP OTP is ${otp}. It is valid for 2 minutes.`;

  if (provider === 'console') {
    console.log(`[SMS-MOCK] OTP sent to ${mobileNumber}: ${otp}`);
    return { delivered: true, provider: 'console' };
  }

  if (provider === 'webhook') {
    const webhookUrl = process.env.SMS_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('SMS_WEBHOOK_URL is required when SMS_PROVIDER=webhook');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNumber,
        message,
        otp
      })
    });

    if (!response.ok) {
      throw new Error(`SMS webhook failed with status ${response.status}`);
    }

    return { delivered: true, provider: 'webhook' };
  }

  if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER are required for Twilio');
    }

    const encodedCredentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const payload = new URLSearchParams({
      To: mobileNumber.startsWith('+') ? mobileNumber : `+${mobileNumber}`,
      From: fromNumber,
      Body: message
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Twilio send failed (${response.status}): ${errorBody}`);
    }

    return { delivered: true, provider: 'twilio' };
  }

  throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
}

module.exports = {
  sendOtpSms
};
