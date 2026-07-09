const Product = require('../models/Product');
const Invoice = require('../models/Invoice');

exports.getDashboardStats = async (_req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      totalSalesResult,
      dailyRevenueResult,
      invoiceCount,
      salesByDay
    ] = await Promise.all([
      Product.countDocuments(),
      Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Invoice.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      Invoice.countDocuments(),
      Invoice.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$grandTotal' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    res.json({
      totalProducts,
      totalSales: totalSalesResult[0]?.total || 0,
      dailyRevenue: dailyRevenueResult[0]?.total || 0,
      invoiceCount,
      salesByDay
    });
  } catch (error) {
    next(error);
  }
};
