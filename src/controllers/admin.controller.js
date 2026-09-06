import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";

const revenueMatch = {
  paymentStatus: "paid",
  status: { $nin: ["cancelled", "returned"] },
};

export const getAdminDashboardAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    // مش بنعمل mutate على now نفسها
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // تشغيل الـ Aggregation الرئيسي للـ Orders وتعداد الـ Users بالتوازي
    const [analyticsResult, totalCustomers] = await Promise.all([
      Order.aggregate([
        {
          $facet: {
            // 1. Revenue Metrics (Total, Current Month, Last Month)
            revenueStats: [
              { $match: revenueMatch },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$totalPrice" },
                  currentMonthRevenue: {
                    $sum: {
                      $cond: [
                        { $gte: ["$createdAt", startOfCurrentMonth] },
                        "$totalPrice",
                        0,
                      ],
                    },
                  },
                  lastMonthRevenue: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gte: ["$createdAt", startOfLastMonth] },
                            { $lte: ["$createdAt", endOfLastMonth] },
                          ],
                        },
                        "$totalPrice",
                        0,
                      ],
                    },
                  },
                },
              },
            ],

            // 2. Orders Count Grouped by Status (هنا لازم نحسب كل الحالات من غير فلترة عشان نعرف عدد الـ cancelled كمان)
            ordersByStatus: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ],

            // 3. Top 5 Best-Selling Products
            // ملحوظة: orderItemSchema مفيهوش reference لـ Product (مفيش حقل product)،
            // فبنجمع بالاسم المخزّن وقت الشراء بدل الـ ID. لو نفس اسم المنتج
            // اتغيّر لاحقًا في جدول Products، الاسم هنا هيفضل زي وقت الشراء بالظبط.
            topProducts: [
              { $match: revenueMatch },
              { $unwind: "$items" },
              {
                $group: {
                  _id: "$items.name",
                  unitsSold: { $sum: "$items.quantity" },
                  revenue: {
                    $sum: { $multiply: ["$items.price", "$items.quantity"] },
                  },
                  image: { $first: "$items.image" },
                },
              },
              { $sort: { unitsSold: -1 } },
              { $limit: 5 },
              {
                $project: {
                  _id: 0,
                  name: "$_id",
                  unitsSold: 1,
                  revenue: 1,
                  image: 1,
                },
              },
            ],

            // 3. Top 5 Best-Selling Products
            // topProducts: [
            //   { $match: revenueMatch },
            //   { $unwind: '$items' },
            //   {
            //     $group: {
            //       _id: '$items.product',
            //       unitsSold: { $sum: '$items.quantity' },
            //       revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            //     }
            //   },
            //   { $sort: { unitsSold: -1 } },
            //   { $limit: 5 },
            //   {
            //     $lookup: {
            //       from: 'products',
            //       localField: '_id',
            //       foreignField: '_id',
            //       as: 'productDetails'
            //     }
            //   },
            //   // preserveNullAndEmptyArrays عشان لو المنتج اتمسح من الداتابيز
            //   // الأوردر ميتشالش من النتيجة نهائي، وبنرجعله اسم افتراضي
            //   { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
            //   {
            //     $project: {
            //       _id: 1,
            //       name: { $ifNull: ['$productDetails.name', 'Product Deleted'] },
            //       unitsSold: 1,
            //       revenue: 1
            //     }
            //   }
            // ],

            // 4. Daily Revenue & Orders for the Last 7 Days
            last7DaysStats: [
              {
                $match: { createdAt: { $gte: sevenDaysAgo }, ...revenueMatch },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                  },
                  dailyRevenue: { $sum: "$totalPrice" },
                  dailyOrders: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],

            // 5. The 5 Most Recent Orders — مع lookup لبيانات العميل بدل ما نرجع الـ ObjectId خام
            recentOrders: [
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              {
                $lookup: {
                  from: "users",
                  localField: "user",
                  foreignField: "_id",
                  as: "userDetails",
                },
              },
              {
                $unwind: {
                  path: "$userDetails",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: 1,
                  totalPrice: 1,
                  status: 1,
                  createdAt: 1,
                  user: {
                    _id: "$userDetails._id",
                    name: "$userDetails.name",
                    email: "$userDetails.email",
                  },
                },
              },
            ],
          },
        },
      ]),
      User.countDocuments({ role: "customer" }), // 6. Total Registered Customers
    ]);

    const stats = analyticsResult[0].revenueStats[0] || {
      totalRevenue: 0,
      currentMonthRevenue: 0,
      lastMonthRevenue: 0,
    };
    const lastMonth = stats.lastMonthRevenue || 0;
    const currentMonth = stats.currentMonthRevenue || 0;

    let growthPercentage = 0;
    if (lastMonth > 0) {
      growthPercentage = ((currentMonth - lastMonth) / lastMonth) * 100;
    } else if (currentMonth > 0) {
      growthPercentage = 100;
    }

    res.status(200).json({
      status: "success",
      data: {
        revenue: {
          total: stats.totalRevenue,
          currentMonth: currentMonth,
          lastMonth: lastMonth,
          growthPercentage: Number(growthPercentage.toFixed(2)),
        },
        ordersByStatus: analyticsResult[0].ordersByStatus,
        topProducts: analyticsResult[0].topProducts,
        last7Days: analyticsResult[0].last7DaysStats,
        recentOrders: analyticsResult[0].recentOrders,
        totalCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
};
