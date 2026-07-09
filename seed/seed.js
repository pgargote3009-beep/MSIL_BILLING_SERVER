require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Product = require('../src/models/Product');
const Invoice = require('../src/models/Invoice');

function p(itemName, size, rate, stock = 0) {
  return { itemName, size: String(size), mrpPrice: rate, retailPrice: rate, stock };
}

const products = [
  // WHISKY
  p('8 P.M.WHISKY', 1000, 750.0),
  p('8 P.M.WHISKY', 750, 595.0),
  p('8 P.M.WHISKY', 375, 280.0),
  p('8 P.M.WHISKY', 180, 145.0),
  p('8 P.M.WHISKY', 90, 70.0),
  p('B.P WHISKY', 750, 645.0),
  p('B.P WHISKY', 375, 325.0),
  p('B.P WHISKY', 180, 165.0),
  p('B.P WHISKY', 90, 80.0),
  p('BENGALORE WHISKY', 750, 395.0),
  p('BENGALORE WHISKY', 180, 95.0),
  p('BENGALORE WHISKY', 90, 50.0),
  p('BLACK BELT WHISKY', 750, 385.0),
  p('BLACK BELT WHISKY', 180, 95.0),
  p('BLACK BELT WHISKY', 90, 55.0),
  p('D.K WHISKY', 750, 395.0),
  p('D.K WHISKY', 180, 95.0),
  p('D.K WHISKY', 90, 50.0),
  p('HAYWARDS WHISKY', 750, 455.0),
  p('HAYWARDS WHISKY', 180, 110.0),
  p('HAYWARDS WHISKY', 90, 55.0),
  p('DSP BLACK WHISKY', 750, 850.0),
  p('DSP BLACK WHISKY', 375, 425.0),
  p('DSP BLACK WHISKY', 180, 175.0),
  p('DSP BLACK WHISKY', 90, 90.0),
  p('Mc.D NO1 LUX. WHISKY', 180, 215.0),
  p('Mc.D NO1 LUX. WHISKY', 90, 105.0),
  p('Mc.D NO1. WHISKY', 750, 885.0),
  p('Mc.D NO1. WHISKY', 375, 445.0),
  p('Mc.D NO1. WHISKY', 180, 215.0),
  p('Mc.D NO1. WHISKY', 90, 105.0),
  p('MILAN WHISKY', 750, 420.0),
  p('MILAN WHISKY', 180, 105.0),
  p('Ma Qintosh WHISKY', 180, 145.0),
  p('Ma Qintosh WHISKY', 90, 80.0),
  p('OFF.CHOICE WHISKY', 180, 175.0),
  p('OFF.CHOICE WHISKY', 90, 90.0),
  p('OFF. CH .STAR WHISKY', 750, 680.0),
  p('OFF. CH .STAR WHISKY', 375, 345.0),
  p('OFF. CH .STAR WHISKY', 180, 165.0),
  p('OFF. CH .STAR WHISKY', 90, 85.0),
  p('ORIGINAL CH WHISKY', 750, 445.0),
  p('ORIGINAL CH WHISKY', 180, 110.0),
  p('ORIGINAL CH WHISKY', 90, 55.0),
  p('O.T WHISKY', 750, 560.0),
  p('O.T WHISKY', 180, 135.0),
  p('O.T WHISKY', 90, 70.0),
  p('ROYAL STAG WHISKY', 750, 1145.0),
  p('ROYAL STAG WHISKY', 375, 575.0),
  p('ROYAL STAG WHISKY', 180, 280.0),
  p('ROYAL STAG WHISKY', 90, 140.0),
  p('I.B WHISKY', 750, 885.0),
  p('I.B WHISKY', 375, 445.0),
  p('I.B WHISKY', 180, 215.0),
  p('I.B WHISKY', 90, 110.0),
  p('R C WHISKY', 180, 280.0),
  p('R C WHISKY', 180, 170.0),
  p('ICONIC WHISKY', 180, 215.0),
  p('BLENDERS PRIDE', 750, 1130.0),
  p('BLENDERS PRIDE', 375, 690.0),
  p('BLENDERS PRIDE', 180, 345.0),
  p('BLENDERS PRIDE', 90, 170.0),
  p('FRINDS CLUB', 180, 80.0),
  p('FRINDS CLUB', 90, 40.0),
  p('PRESTEGE BL WHISKY', 180, 100.0),
  p('PRESTEGE BL WHISKY', 90, 50.0),

  // BRANDY
  p('M.H BRANDY', 180, 215.0),

  // LAB
  p('BACRDI CRANBERRY', 275, 115.0),

  // GIN
  p('CARNIVAL GIN', 750, 425.0),
  p('CARNIVAL GIN', 180, 110.0),
  p('CARNIVAL GIN', 90, 55.0),
  p('RAJA GIN', 180, 110.0),
  p('RAJA GIN', 90, 55.0),

  // WINE
  p('BROCODE WINE', 330, 120.0),
  p('RICO WINE', 750, 125.0),
  p('RICO WINE', 180, 30.0),
  p('JUBLEE WINE', 750, 150.0),
  p('JUBLEE WINE', 180, 35.0),
  p('MAGIC PORT WINE', 750, 125.0),
  p('MAGIC PORT WINE', 180, 30.0),

  // RUM
  p('CARNIVAL RUM', 750, 385.0),
  p('CARNIVAL RUM', 180, 95.0),
  p('CARNIVAL RUM', 90, 55.0),
  p('B.P RUM', 180, 135.0),
  p('B.P RUM', 90, 70.0),
  p('MC.D NO1 RUM', 375, 380.0),
  p('Mc.D NO1 RUM', 180, 165.0),
  p('Mc.D NO1 RUM', 90, 85.0),
  p('MILAN RUM', 750, 420.0),
  p('MILAN RUM', 180, 105.0),
  p('LEGACY RUM', 750, 370.0),
  p('LEGACY RUM', 180, 90.0),
  p('OLD MONK RUM', 750, 850.0),
  p('OLD MONK RUM', 375, 425.0),
  p('OLD MONK RUM', 180, 175.0),
  p('OLD MONK RUM', 90, 90.0),
  p('RAJA RUM', 180, 110.0),
  p('RAJA RUM', 90, 55.0),

  // VODKA
  p('ROMANOVE ORG', 180, 215.0),
  p('ROMANOVE ORG', 90, 110.0),
  p('OXYGEN', 180, 190.0),
  p('OXYGEN', 90, 110.0),
  p('MOSCOVEY', 180, 185.0),
  p('MOSCOVEY', 90, 105.0),
  p('MAGIC MOMENT', 180, 265.0),

  // BEER
  p('POWER COOL', 650, 120.0),
  p('POWER COOL CAN', 500, 90.0),
  p('BUDWISER MAG', 650, 250.0),
  p('BUDWISER MAG CAN', 500, 200.0),
  p('BUDWISER PRM', 650, 205.0),
  p('K.F STONG', 650, 180.0),
  p('K.F STONG BTL', 330, 100.0),
  p('K.F STONG CAN', 500, 140.0),
  p('K.F STONG CAN', 330, 80.0),
  p('K.F PRM BTL', 650, 110.0),
  p('TUBORG', 650, 170.0),
  p('TUBORG CAN', 500, 130.0),
  p('R C STONG', 650, 120.0),
  p('LEGEND', 650, 110.0),
  p('LEGEND', 500, 85.0),
  p('LEGEND', 330, 60.0),
  p('SUNNY STRONG', 650, 105.0),
  p('SUNNY PRM', 650, 80.0),
  p('SUNNY PRM', 500, 65.0),
  p('SUNNY PRM', 330, 45.0)
];

async function seed() {
  try {
    await connectDB();
    await Product.deleteMany({});
    await Invoice.deleteMany({});

    const insertedProducts = await Product.insertMany(products);

    const demoInvoice = {
      invoiceNumber: 'INV-DEMO-0001',
      customerName: 'Walk-in Customer',
      customerPhone: '9999999999',
      purchasedItems: [
        {
          productId: insertedProducts[0]._id,
          itemName: insertedProducts[0].itemName,
          size: insertedProducts[0].size,
          unitPrice: insertedProducts[0].retailPrice,
          quantity: 2,
          itemTotal: insertedProducts[0].retailPrice * 2
        }
      ],
      subtotal: insertedProducts[0].retailPrice * 2,
      gst: 100,
      discount: 50,
      grandTotal: insertedProducts[0].retailPrice * 2 + 100 - 50
    };

    await Invoice.create(demoInvoice);

    console.log(`Seed completed successfully: ${insertedProducts.length} products inserted`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seed().finally(async () => {
  await mongoose.connection.close();
});
