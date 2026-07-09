require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const pdf = require('pdf-parse');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Product = require('../src/models/Product');

const DEFAULT_PDF_PATH = 'C:\\Users\\PrathameshGargote\\Downloads\\msil\\msil 4.pdf';
const DEFAULT_PRODUCT_STOCK = Number(process.env.DEFAULT_PRODUCT_STOCK || 100);
const CATEGORY_HEADINGS = new Set(['BRANDY', 'LAB', 'GIN', 'WINE', 'RUM', 'VODKA', 'BEER']);

function normalizeName(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeCategory(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function buildProduct(itemName, size, rate, category) {
  return {
    itemName: normalizeName(itemName),
    category: normalizeCategory(category),
    size: String(size),
    mrpPrice: rate,
    retailPrice: rate,
    stock: DEFAULT_PRODUCT_STOCK
  };
}

function stripLeadingSerial(value) {
  const trimmedValue = value.trim();

  for (let digits = 1; digits <= 3 && digits < trimmedValue.length; digits += 1) {
    const serial = trimmedValue.slice(0, digits);

    if (!/^\d+$/.test(serial)) {
      continue;
    }

    const rest = trimmedValue.slice(digits).trimStart();

    if (!rest) {
      continue;
    }

    if (/^[A-Za-z]/.test(rest) || /^\d\s/.test(rest) || /^\d\./.test(rest)) {
      return rest;
    }
  }

  return trimmedValue.replace(/^\d+\s*/, '').trim();
}

function parseProductLine(line, category) {
  const sizes = ['1000', '750', '650', '500', '375', '330', '275', '180', '90'];

  for (const size of sizes) {
    const pattern = new RegExp(`^(.*?)\\s*(${size})\\s*(\\d+(?:\\.\\d+)?)$`);
    const match = line.match(pattern);

    if (!match) {
      continue;
    }

    const [, rawName, parsedSize, rawRate] = match;
    const rate = Number(rawRate);

    if (!Number.isFinite(rate)) {
      return null;
    }

    const itemName = stripLeadingSerial(rawName);

    if (!itemName) {
      return null;
    }

    return buildProduct(itemName, parsedSize, rate, category);
  }

  return null;
}

function parseProducts(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const ignoredPrefixes = [
    'SR',
    'NO.',
    'Date:',
    'M.S.I.L',
    'NAME OF',
    'RateSizePRODUCT'
  ];

  const productsByKey = new Map();
  const collisions = [];
  const skippedLines = [];
  let currentCategory = 'WHISKY';

  for (const line of lines) {
    if (ignoredPrefixes.some((prefix) => line.startsWith(prefix))) {
      continue;
    }

    if (CATEGORY_HEADINGS.has(line)) {
      currentCategory = line;
      continue;
    }

    const product = parseProductLine(line, currentCategory);

    if (!product) {
      if (/^\d+\b/.test(line)) {
        skippedLines.push(line);
      }
      continue;
    }
    const key = `${product.itemName}__${product.size}`;
    const existing = productsByKey.get(key);

    if (existing && (existing.retailPrice !== product.retailPrice || existing.mrpPrice !== product.mrpPrice)) {
      collisions.push({
        key,
        previous: existing,
        next: product,
        sourceLine: line
      });
    }

    productsByKey.set(key, product);
  }

  return {
    products: Array.from(productsByKey.values()),
    skippedLines,
    collisions
  };
}

async function readPdfText(pdfPath) {
  const buffer = await fs.readFile(pdfPath);
  const parsed = await pdf(buffer);
  return parsed.text || '';
}

async function importProducts() {
  const args = process.argv.slice(2);
  const shouldReplace = args.includes('--replace');
  const sourcePathArg = args.find((arg) => !arg.startsWith('--'));
  const pdfPath = sourcePathArg ? path.resolve(sourcePathArg) : DEFAULT_PDF_PATH;

  try {
    const text = await readPdfText(pdfPath);
    const { products, skippedLines, collisions } = parseProducts(text);

    if (!products.length) {
      throw new Error('No valid product rows were found in the PDF');
    }

    await connectDB();

    const existingProducts = await Product.find({}, { itemName: 1, size: 1, stock: 1 }).lean();
    const existingStockByKey = new Map(
      existingProducts.map((product) => [`${normalizeName(product.itemName)}__${String(product.size || '')}`, Number(product.stock) || 0])
    );

    const productsWithStock = products.map((product) => {
      const key = `${product.itemName}__${product.size}`;
      const existingStock = existingStockByKey.get(key);

      return {
        ...product,
        stock: existingStock && existingStock > 0 ? existingStock : DEFAULT_PRODUCT_STOCK
      };
    });

    if (shouldReplace) {
      await Product.deleteMany({});
      await Product.insertMany(productsWithStock);
    } else {
      const operations = productsWithStock.map((product) => ({
        updateOne: {
          filter: { itemName: product.itemName, size: product.size },
          update: { $set: product },
          upsert: true
        }
      }));

      await Product.bulkWrite(operations, { ordered: false });
    }

    console.log(`Imported ${productsWithStock.length} product rows from ${pdfPath} with default stock ${DEFAULT_PRODUCT_STOCK}`);

    if (collisions.length) {
      console.log(`Detected ${collisions.length} duplicate name/size rows in the PDF. The last row was kept for each duplicate:`);
      collisions.forEach((entry) => {
        console.log(`- ${entry.key}: ${entry.previous.retailPrice} -> ${entry.next.retailPrice} from "${entry.sourceLine}"`);
      });
    }

    if (skippedLines.length) {
      console.log(`Skipped ${skippedLines.length} incomplete or unsupported rows:`);
      skippedLines.forEach((line) => {
        console.log(`- ${line}`);
      });
    }
  } catch (error) {
    console.error('Product import failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

importProducts();