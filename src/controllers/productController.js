const Product = require('../models/Product');
const { buildPagination, buildSort } = require('../utils/apiFeatures');

exports.getProducts = async (req, res, next) => {
  try {
    const { search = '', size, category, minPrice, maxPrice } = req.query;
    const { page, limit, skip } = buildPagination(req.query);

    const filter = {};

    if (search) {
      filter.itemName = { $regex: search, $options: 'i' };
    }

    if (size) {
      filter.size = { $regex: `^${size}$`, $options: 'i' };
    }

    if (category) {
      filter.category = { $regex: `^${category}$`, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      filter.retailPrice = {};
      if (minPrice) filter.retailPrice.$gte = Number(minPrice);
      if (maxPrice) filter.retailPrice.$lte = Number(maxPrice);
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(buildSort(req.query, '-updatedAt'))
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter)
    ]);

    res.json({
      data: products,
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

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(product);
  } catch (error) {
    return next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const existingProduct = await Product.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const mergedMrp =
      req.body.mrpPrice !== undefined ? Number(req.body.mrpPrice) : Number(existingProduct.mrpPrice);
    const mergedRetail =
      req.body.retailPrice !== undefined ? Number(req.body.retailPrice) : Number(existingProduct.retailPrice);
    const hasPriceChange = req.body.mrpPrice !== undefined || req.body.retailPrice !== undefined;

    if (hasPriceChange && Number.isFinite(mergedMrp) && Number.isFinite(mergedRetail) && mergedRetail > mergedMrp) {
      return res.status(400).json({ message: 'Retail price should not exceed MRP' });
    }

    if (req.body.itemName !== undefined) {
      existingProduct.itemName = String(req.body.itemName).trim();
    }

    if (req.body.category !== undefined) {
      existingProduct.category = String(req.body.category || '').trim().toUpperCase();
    }

    if (req.body.size !== undefined) {
      existingProduct.size = String(req.body.size || '').trim();
    }

    if (req.body.mrpPrice !== undefined) {
      existingProduct.mrpPrice = mergedMrp;
    }

    if (req.body.retailPrice !== undefined) {
      existingProduct.retailPrice = mergedRetail;
    }

    if (req.body.stock !== undefined) {
      existingProduct.stock = Number(req.body.stock);
    }

    const product = await existingProduct.save();

    return res.json(product);
  } catch (error) {
    return next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
