import { HTTP_STATUS } from '../config/constants.js'
import { Product } from '../models/product.model.js'
import { Wishlist } from '../models/wishlist.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/*
|--------------------------------------------------------------------------
| 1. Get User's Wishlist
|--------------------------------------------------------------------------
*/

export const getUserWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { products: [] } },
    { new: true, upsert: true },
  )
    .lean()
    .exec()

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Wishlist retrieved successfully.', wishlist))
})

/*
|--------------------------------------------------------------------------
| 2. Add Product to Wishlist
|--------------------------------------------------------------------------
*/

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body

  const product = await Product.findOne({ _id: productId, isActive: true }).lean().exec()
  if (!product) {
    throw new AppError('Product not found or unavailable', HTTP_STATUS.NOT_FOUND)
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { products: productId } },
    { new: true, upsert: true },
  )
    .lean()
    .exec()

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Product added to wishlist successfully.', wishlist))
})

/*
|--------------------------------------------------------------------------
| 3. REMOVE PRODUCT FROM WISHLIST
|--------------------------------------------------------------------------
*/

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { products: productId } },
    { new: true },
  )
    .lean()
    .exec()

  if (!wishlist) {
    throw new AppError('Wishlist not found', HTTP_STATUS.NOT_FOUND)
  }

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Product removed from wishlist successfully.', wishlist))
})

/*
|--------------------------------------------------------------------------
| 4. CLEAR ENTIRE WISHLIST
|--------------------------------------------------------------------------
*/

export const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $set: { products: [] } },
    { new: true },
  )
    .lean()
    .exec()

  if (!wishlist) {
    throw new AppError('Wishlist not found', HTTP_STATUS.NOT_FOUND)
  }

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Wishlist cleared successfully.', wishlist))
})
