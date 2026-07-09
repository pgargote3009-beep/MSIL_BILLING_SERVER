require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const connectDB = require('../src/config/db');

async function run() {
  try {
    await connectDB();

    const products = await Product.find().select('_id mrpPrice retailPrice').lean();
    const invalid = products.filter((p) => Number(p.retailPrice) > Number(p.mrpPrice));

    for (const product of invalid) {
      await Product.updateOne({ _id: product._id }, { $set: { mrpPrice: Number(product.retailPrice) } });
    }

    console.log(JSON.stringify({ invalidCount: invalid.length, fixed: invalid.length }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
