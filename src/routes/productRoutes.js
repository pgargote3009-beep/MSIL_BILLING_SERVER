const express = require('express');
const { body, validationResult } = require('express-validator');
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const validateCreateProduct = [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('Category cannot exceed 50 chars'),
  body('mrpPrice').isFloat({ min: 0 }).withMessage('MRP price must be a positive number'),
  body('retailPrice').isFloat({ min: 0 }).withMessage('Retail price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be 0 or more'),
  body('retailPrice').custom((value, { req }) => Number(value) <= Number(req.body.mrpPrice)).withMessage('Retail price should not exceed MRP')
];

const validateUpdateProduct = [
  body('itemName').optional().trim().notEmpty().withMessage('Item name cannot be empty'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('Category cannot exceed 50 chars'),
  body('mrpPrice').optional().isFloat({ min: 0 }).withMessage('MRP price must be a positive number'),
  body('retailPrice').optional().isFloat({ min: 0 }).withMessage('Retail price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be 0 or more')
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}

router.use(protect);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', authorize('admin'), validateCreateProduct, handleValidation, productController.createProduct);
router.put('/:id', authorize('admin'), validateUpdateProduct, handleValidation, productController.updateProduct);
router.patch('/:id', authorize('admin'), validateUpdateProduct, handleValidation, productController.updateProduct);
router.delete('/:id', authorize('admin'), productController.deleteProduct);

module.exports = router;
