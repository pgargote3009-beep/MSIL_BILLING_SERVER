const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpSms } = require('../utils/smsService');
const { OTP_TTL_SECONDS, generateOtp, hashOtp, isOtpExpired } = require('../utils/otp');

const OTP_RESEND_COOLDOWN_SECONDS = 30;
const FALLBACK_JWT_SECRET = 'dev-jwt-secret-change-me';

function normalizeMobileNumber(rawMobileNumber) {
  return String(rawMobileNumber || '').replace(/\D/g, '');
}

function toSafeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    mobileNumber: user.mobileNumber,
    role: user.role
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      mobileNumber: user.mobileNumber,
      name: user.name
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '12h'
    }
  );
}

async function issueAndStoreOtp(user) {
  const otp = generateOtp();

  user.otpHash = hashOtp(user.mobileNumber, otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  user.otpAttempts = 0;
  user.otpRequestedAt = new Date();

  await user.save();
  await sendOtpSms(user.mobileNumber, otp);

  return otp;
}

exports.register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const mobileNumber = normalizeMobileNumber(req.body.mobileNumber);
    const password = String(req.body.password || '');

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!/^\d{10,15}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Mobile number must contain 10 to 15 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ mobileNumber });

    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ message: 'An account with this mobile number already exists' });
    }

    const verifiedAdminCount = await User.countDocuments({ role: 'admin', isVerified: true });
    const assignedRole = verifiedAdminCount === 0 ? 'admin' : 'staff';
    const passwordHash = await bcrypt.hash(password, 10);

    const user =
      existingUser ||
      new User({
        name,
        mobileNumber,
        passwordHash,
        role: assignedRole,
        isVerified: false
      });

    user.name = name;
    user.mobileNumber = mobileNumber;
    user.passwordHash = passwordHash;
    user.role = assignedRole;
    user.isVerified = false;

    const otp = await issueAndStoreOtp(user);

    const responsePayload = {
      message: 'Registration successful. OTP sent to your mobile number',
      mobileNumber,
      otpExpiresInSeconds: OTP_TTL_SECONDS,
      canResendInSeconds: OTP_RESEND_COOLDOWN_SECONDS
    };

    if (String(process.env.SMS_PROVIDER || 'console').toLowerCase() === 'console') {
      responsePayload.devOtp = otp;
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    return next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const mobileNumber = normalizeMobileNumber(req.body.mobileNumber);
    const otp = String(req.body.otp || '').trim();

    if (!/^\d{10,15}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'OTP must be exactly 6 digits' });
    }

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(404).json({ message: 'Account not found for this mobile number' });
    }

    if (user.isVerified) {
      const token = signToken(user);
      return res.json({
        message: 'Account already verified',
        token,
        user: toSafeUser(user)
      });
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP not generated. Please request a new OTP' });
    }

    if (isOtpExpired(user.otpExpiresAt)) {
      return res.status(410).json({
        message: 'OTP expired. Please request a new OTP',
        canResendInSeconds: 0
      });
    }

    const expectedHash = hashOtp(mobileNumber, otp);
    if (expectedHash !== user.otpHash) {
      user.otpAttempts += 1;
      await user.save();

      return res.status(400).json({
        message: 'Invalid OTP',
        attempts: user.otpAttempts
      });
    }

    user.isVerified = true;
    user.otpHash = '';
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    const token = signToken(user);

    return res.json({
      message: 'OTP verified successfully',
      token,
      user: toSafeUser(user)
    });
  } catch (error) {
    return next(error);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const mobileNumber = normalizeMobileNumber(req.body.mobileNumber);

    if (!/^\d{10,15}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(404).json({ message: 'Account not found for this mobile number' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This account is already verified' });
    }

    const lastRequestedAt = user.otpRequestedAt ? new Date(user.otpRequestedAt).getTime() : 0;
    const elapsedSeconds = Math.floor((Date.now() - lastRequestedAt) / 1000);

    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      return res.status(429).json({
        message: 'Please wait before requesting another OTP',
        canResendInSeconds: OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
      });
    }

    const otp = await issueAndStoreOtp(user);

    const responsePayload = {
      message: 'OTP resent to your mobile number',
      mobileNumber,
      otpExpiresInSeconds: OTP_TTL_SECONDS,
      canResendInSeconds: OTP_RESEND_COOLDOWN_SECONDS
    };

    if (String(process.env.SMS_PROVIDER || 'console').toLowerCase() === 'console') {
      responsePayload.devOtp = otp;
    }

    return res.json(responsePayload);
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const mobileNumber = normalizeMobileNumber(req.body.mobileNumber);
    const password = String(req.body.password || '');

    if (!/^\d{10,15}$/.test(mobileNumber) || !password) {
      return res.status(400).json({ message: 'Mobile number and password are required' });
    }

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(401).json({ message: 'Invalid mobile number or password' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid mobile number or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Account is not OTP verified',
        mobileNumber,
        requiresOtp: true
      });
    }

    const token = signToken(user);

    return res.json({
      message: 'Login successful',
      token,
      user: toSafeUser(user)
    });
  } catch (error) {
    return next(error);
  }
};

exports.getMe = async (req, res) => {
  return res.json({ user: req.user });
};
