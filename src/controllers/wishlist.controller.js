import { HTTP_STATUS } from '../config/constants.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { Product, Wishlist } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'

//////////////////////////////////////////////////////////////

export const getMyWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products').lean()

  if (!wishlist || !wishlist.products || wishlist.products.length === 0) {
    throw new AppError('Wishlist is empty', HTTP_STATUS.NOT_FOUND)
  }

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Wishlist retrieved successfully', wishlist))
})

//////////////////////////////////////////////////////////////

export const addToWishlist = asyncHandler(async (req, res) => {
  const { id: productId } = req.params

  const product = await Product.findOne({ _id: productId, isActive: true }).lean()
  if (!product) {
    throw new AppError('Product not found or unavailable', HTTP_STATUS.NOT_FOUND)
  }

  const existingWishlist = await Wishlist.findOne({
    user: req.user._id,
    products: productId,
  })

  if (existingWishlist) {
    throw new AppError('Product is already in your wishlist', HTTP_STATUS.BAD_REQUEST)
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { products: productId } },
    { new: true, upsert: true },
  ).populate('products')

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Product added to wishlist successfully', wishlist))
})

//////////////////////////////////////////////////////////////

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { id: productId } = req.params

  const wishlistDoc = await Wishlist.findOne({ user: req.user._id })
  if (!wishlistDoc) {
    throw new AppError('Wishlist not found', HTTP_STATUS.NOT_FOUND)
  }

  const isProductExist = wishlistDoc.products.some((p) => {
    const currentId = p._id ? p._id.toString() : p.toString()
    return currentId === productId
  })
  if (!isProductExist) {
    throw new AppError('Product is not in your wishlist', HTTP_STATUS.NOT_FOUND)
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { products: productId } },
    { new: true },
  ).populate('products')

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Product removed from wishlist successfully', wishlist))
})

//////////////////////////////////////////////////////////////
export const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id })

  if (!wishlist) {
    throw new AppError('Wishlist not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!wishlist.products || wishlist.products.length === 0) {
    throw new AppError('Wishlist is already empty', HTTP_STATUS.BAD_REQUEST)
  }

  const updatedWishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $set: { products: [] } },
    { new: true },
  ).populate('products')

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Wishlist cleared successfully', updatedWishlist))
})
