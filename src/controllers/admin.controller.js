import { HTTP_STATUS } from '../config/constants.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { Cart, Order, User, Wishlist } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'

/////////////////////////////////////////////////////////////

const REVENUE_MATCH = {
  paymentStatus: 'paid',
  status: { $nin: ['cancelled', 'returned'] },
}

const getPagination = (page, limit) => {
  const currentPage = Math.max(Number(page) || 1, 1)
  const currentLimit = Math.min(Math.max(Number(limit) || 10, 1), 100)
  const skip = (currentPage - 1) * currentLimit
  return { currentPage, currentLimit, skip }
}

/////////////////////////////////////////////////////////////

export const getAdminDashboardAnalytics = asyncHandler(async (_, res) => {
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [analyticsResult, totalCustomers] = await Promise.all([
    Order.aggregate([
      {
        $facet: {
          revenueStats: [
            { $match: REVENUE_MATCH },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$totalPrice' },
                currentMonthRevenue: {
                  $sum: {
                    $cond: [{ $gte: ['$createdAt', startOfCurrentMonth] }, '$totalPrice', 0],
                  },
                },
                lastMonthRevenue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$createdAt', startOfLastMonth] },
                          { $lte: ['$createdAt', endOfLastMonth] },
                        ],
                      },
                      '$totalPrice',
                      0,
                    ],
                  },
                },
              },
            },
          ],
          ordersByStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          topProducts: [
            { $match: REVENUE_MATCH },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                unitsSold: { $sum: '$items.quantity' },
                revenue: {
                  $sum: { $multiply: ['$items.price', '$items.quantity'] },
                },
                image: { $first: '$items.image' },
              },
            },
            { $sort: { unitsSold: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                name: '$_id',
                unitsSold: 1,
                revenue: 1,
                image: 1,
              },
            },
          ],
          last7DaysStats: [
            {
              $match: { createdAt: { $gte: sevenDaysAgo }, ...REVENUE_MATCH },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                dailyRevenue: { $sum: '$totalPrice' },
                dailyOrders: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          recentOrders: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails',
              },
            },
            {
              $unwind: {
                path: '$userDetails',
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
                  _id: '$userDetails._id',
                  username: '$userDetails.username',
                  email: '$userDetails.email',
                },
              },
            },
          ],
        },
      },
    ]),
    User.countDocuments({ role: 'customer' }),
  ])

  const stats = analyticsResult[0]?.revenueStats[0] || {
    totalRevenue: 0,
    currentMonthRevenue: 0,
    lastMonthRevenue: 0,
  }

  const lastMonth = stats.lastMonthRevenue || 0
  const currentMonth = stats.currentMonthRevenue || 0

  let growthPercentage = 0
  if (lastMonth > 0) {
    growthPercentage = ((currentMonth - lastMonth) / lastMonth) * 100
  } else if (currentMonth > 0) {
    growthPercentage = 100
  }

  const responseData = {
    revenue: {
      total: stats.totalRevenue,
      currentMonth: currentMonth,
      lastMonth: lastMonth,
      growthPercentage: Number(growthPercentage.toFixed(2)),
    },
    ordersByStatus: analyticsResult[0]?.ordersByStatus || [],
    topProducts: analyticsResult[0]?.topProducts || [],
    last7Days: analyticsResult[0]?.last7DaysStats || [],
    recentOrders: analyticsResult[0]?.recentOrders || [],
    totalCustomers,
  }

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Dashboard analytics retrieved successfully', responseData))
})

/////////////////////////////////////////////////////////////

export const getAllActiveCarts = asyncHandler(async (req, res) => {
  const { currentPage, currentLimit, skip } = getPagination(req.query.page, req.query.limit)

  const [carts, totalCarts] = await Promise.all([
    Cart.find({ 'items.0': { $exists: true } })
      .populate('user', 'username email phone')
      .populate('items.product', 'name price images')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean(),
    Cart.countDocuments({ 'items.0': { $exists: true } }),
  ])

  if (carts.length === 0 || totalCarts === 0) {
    return res.status(HTTP_STATUS.OK).send(
      ApiResponse('No active carts found', {
        carts: [],
        pagination: {
          page: currentPage,
          limit: currentLimit,
          totalCarts: 0,
          totalPages: 0,
        },
      }),
    )
  }

  return res.status(HTTP_STATUS.OK).send(
    ApiResponse('Active carts retrieved successfully', {
      carts,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        totalCarts,
        totalPages: Math.ceil(totalCarts / currentLimit),
      },
    }),
  )
})

/////////////////////////////////////////////////////////////

export const getAllUserWishlists = asyncHandler(async (req, res) => {
  const { currentPage, currentLimit, skip } = getPagination(req.query.page, req.query.limit)

  const [wishlists, totalWishlists] = await Promise.all([
    Wishlist.find({ 'products.0': { $exists: true } })
      .populate('user', 'username email')
      .populate('products', 'name price images isActive')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean(),
    Wishlist.countDocuments({ 'products.0': { $exists: true } }),
  ])

  if (wishlists.length === 0) {
    return res.status(HTTP_STATUS.OK).send(
      ApiResponse('No wishlists found', {
        wishlists: [],
        pagination: { page: currentPage, limit: currentLimit, totalWishlists: 0, totalPages: 0 },
      }),
    )
  }
  return res.status(HTTP_STATUS.OK).send(
    ApiResponse('User wishlists retrieved successfully', {
      wishlists,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        totalWishlists,
        totalPages: Math.ceil(totalWishlists / currentLimit),
      },
    }),
  )
})

/////////////////////////////////////////////////////////////

export const getTopWishlistedProducts = asyncHandler(async (_, res) => {
  const topWishlisted = await Wishlist.aggregate([
    { $unwind: '$products' },
    {
      $group: {
        _id: '$products',
        wishlistCount: { $sum: 1 },
      },
    },
    { $sort: { wishlistCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails',
      },
    },
    { $unwind: '$productDetails' },
    {
      $project: {
        _id: 0,
        wishlistCount: 1,
        product: {
          _id: '$productDetails._id',
          name: '$productDetails.name',
          price: '$productDetails.price',
          images: '$productDetails.images',
          category: '$productDetails.category',
          isActive: '$productDetails.isActive',
        },
      },
    },
  ])

  if (topWishlisted.length === 0) {
    return res
      .status(HTTP_STATUS.OK)
      .send(ApiResponse('No top wishlisted products found', { topWishlisted: [] }))
  }

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Top wishlisted products retrieved successfully', { topWishlisted }))
})
