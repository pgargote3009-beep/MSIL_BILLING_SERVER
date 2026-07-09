const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const mobileValidation = body('mobileNumber')
  .trim()
  .notEmpty()
  .withMessage('Mobile number is required')
  .matches(/^\+?[0-9]{10,15}$/)
  .withMessage('Mobile number must contain 10 to 15 digits');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  mobileValidation,
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  mobileValidation,
  body('password').notEmpty().withMessage('Password is required')
];

const otpValidation = [
  mobileValidation,
  body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be exactly 6 digits')
];

const resendOtpValidation = [mobileValidation];

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  return next();
}

router.post('/register', registerValidation, handleValidation, authController.register);
router.post('/verify-otp', otpValidation, handleValidation, authController.verifyOtp);
router.post('/resend-otp', resendOtpValidation, handleValidation, authController.resendOtp);
router.post('/login', loginValidation, handleValidation, authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
