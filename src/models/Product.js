const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [120, 'Item name cannot exceed 120 chars']
    },
    category: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    size: {
      type: String,
      trim: true,
      default: ''
    },
    mrpPrice: {
      type: Number,
      required: [true, 'MRP price is required'],
      min: [0, 'MRP price cannot be negative']
    },
    retailPrice: {
      type: Number,
      required: [true, 'Retail price is required'],
      min: [0, 'Retail price cannot be negative']
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

productSchema.index({ itemName: 'text' });

module.exports = mongoose.model('Product', productSchema);
