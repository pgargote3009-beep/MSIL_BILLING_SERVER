const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'staff'), invoiceController.getInvoices);
router.get('/:id', authorize('admin', 'staff'), invoiceController.getInvoiceById);
router.post('/', authorize('admin', 'staff'), invoiceController.createInvoice);

module.exports = router;
