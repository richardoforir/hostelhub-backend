const express = require('express');

const router = express.Router();

const {
  initializePayment,
  verifyPayment,
  paystackWebhook,
} = require(
  '../controllers/paymentController'
);

const {
  protect,
  authorizeRoles,
} = require(
  '../middleware/authMiddleware'
);

// PAYSTACK WEBHOOK
// IMPORTANT:
// Must come BEFORE protected routes
router.post(
  '/webhook',
  paystackWebhook
);

// INITIALIZE PAYMENT
router.post(
  '/initialize',
  protect,
  authorizeRoles('student'),
  initializePayment
);

// VERIFY PAYMENT
router.get(
  '/verify/:reference',
  protect,
  authorizeRoles(
    'student',
    'admin'
  ),
  verifyPayment
);

module.exports = router;