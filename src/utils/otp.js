const crypto = require('crypto');

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 120;

function generateOtp() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function hashOtp(mobileNumber, otp) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'otp-fallback-secret';
  return crypto.createHash('sha256').update(`${mobileNumber}.${otp}.${secret}`).digest('hex');
}

function isOtpExpired(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  return new Date(expiresAt).getTime() < Date.now();
}

module.exports = {
  OTP_TTL_SECONDS,
  generateOtp,
  hashOtp,
  isOtpExpired
};
