const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const { buildPagination, buildSort } = require('../utils/apiFeatures');

function generateInvoiceNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `INV-${datePart}-${randomPart}`;
}

exports.getInvoices = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const { page, limit, skip } = buildPagination(req.query);

    const filter = {};
    if (search) {
      filter.invoiceNumber = { $regex: search, $options: 'i' };
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort(buildSort(req.query, '-createdAt'))
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(filter)
    ]);

    res.json({
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.json(invoice);
  } catch (error) {
    return next(error);
  }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const {
      customerName: rawCustomerName,
      customerPhone = '',
      purchasedItems = [],
      gst = 0,
      discount = 0
    } = req.body;
    const customerName = String(rawCustomerName || '').trim() || 'Walk-in Customer';

    if (!Array.isArray(purchasedItems) || purchasedItems.length === 0) {
      return res.status(400).json({ message: 'Purchased items cannot be empty' });
    }

    const itemsWithTotals = [];
    let subtotal = 0;

    for (const line of purchasedItems) {
      const product = await Product.findById(line.productId);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${line.productId}` });
      }

      const quantity = Number(line.quantity);
      if (!quantity || quantity < 1) {
        return res.status(400).json({ message: `Invalid quantity for ${product.itemName}` });
      }

      if (quantity > product.stock) {
        return res.status(400).json({ message: `Insufficient stock for ${product.itemName}` });
      }

      const mrpPrice = Number(product.mrpPrice);
      const retailPrice = Number(product.retailPrice);
      const unitPrice = retailPrice;
      const itemTotal = Number((quantity * retailPrice).toFixed(2));

      itemsWithTotals.push({
        productId: product._id,
        itemName: product.itemName,
        size: product.size,
        mrpPrice,
        retailPrice,
        unitPrice,
        quantity,
        itemTotal
      });

      subtotal += itemTotal;

      product.stock -= quantity;
      await product.save();
    }

    const gstValue = Number(gst) || 0;
    const discountValue = Number(discount) || 0;
    const grandTotal = Number((subtotal + gstValue - discountValue).toFixed(2));

    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      customerName,
      customerPhone,
      purchasedItems: itemsWithTotals,
      subtotal: Number(subtotal.toFixed(2)),
      gst: gstValue,
      discount: discountValue,
      grandTotal
    });

    return res.status(201).json(invoice);
  } catch (error) {
    return next(error);
  }
};
