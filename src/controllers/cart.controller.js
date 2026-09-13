import { HTTP_STATUS, STATIC_COUPONS } from '../config/constants.js'
import { Cart } from '../models/cart.model.js'
import { Product } from '../models/product.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getFinalPrice = (product) =>
  product.discountPrice > 0 ? product.discountPrice : product.price

const getImageUrl = (product) => {
  const image = product.images?.[0]
  return typeof image === 'string' ? image : image?.url
}

/*
|--------------------------------------------------------------------------
| Get Cart
|--------------------------------------------------------------------------
*/

export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id

  let cart = await Cart.findOne({ user: userId })
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] })
  }

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart retrieved successfully.', cart))
})

/*
|--------------------------------------------------------------------------
| Add to Cart
|--------------------------------------------------------------------------
*/

export const addCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const { productId, quantity } = req.body

  const product = await Product.findOneAndUpdate(
    { _id: productId, isActive: true, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true },
  )

  if (!product) {
    const checkProduct = await Product.findById(productId)
    if (!checkProduct || !checkProduct.isActive) {
      throw new AppError('Product not found or inactive.', HTTP_STATUS.NOT_FOUND)
    }
    throw new AppError('Insufficient product stock.', HTTP_STATUS.BAD_REQUEST)
  }

  let cart = await Cart.findOne({ user: userId })
  if (!cart) {
    cart = new Cart({ user: userId, items: [] })
  }

  const item = cart.items.find((cartItem) => cartItem.product.toString() === productId)

  if (item) {
    item.quantity += quantity
  } else {
    cart.items.push({
      product: product._id,
      name: product.name,
      image: getImageUrl(product),
      price: getFinalPrice(product),
      quantity,
    })
  }

  await cart.save()

  res.status(HTTP_STATUS.CREATED).send(ApiResponse('Item added to cart successfully.', cart))
})

/*
|--------------------------------------------------------------------------
| Update Cart Item
|--------------------------------------------------------------------------
*/

export const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const { productId, quantity } = req.body
  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found.', HTTP_STATUS.NOT_FOUND)
  }

  const item = cart.items.find((cartItem) => cartItem.product.toString() === productId)
  if (!item) {
    throw new AppError('Cart item not found.', HTTP_STATUS.NOT_FOUND)
  }

  const difference = quantity - item.quantity

  if (difference > 0) {
    const product = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: difference } },
      { $inc: { stock: -difference } },
    )
    if (!product) {
      throw new AppError('Insufficient product stock', HTTP_STATUS.BAD_REQUEST)
    }
  } else if (difference < 0) {
    await Product.updateOne({ _id: productId }, { $inc: { stock: Math.abs(difference) } })
  }

  if (quantity <= 0) {
    cart.items = cart.items.filter((cartItem) => cartItem.product.toString() !== productId)
  } else {
    item.quantity = quantity
  }

  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart item updated successfully.', cart))
})

/*
|--------------------------------------------------------------------------
| Remove Cart Item
|--------------------------------------------------------------------------
*/

export const removeCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const { productId } = req.params
  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found.', HTTP_STATUS.NOT_FOUND)
  }

  const item = cart.items.find((cartItem) => cartItem.product.toString() === productId)
  if (!item) {
    throw new AppError('Cart item not found.', HTTP_STATUS.NOT_FOUND)
  }

  await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })

  cart.items = cart.items.filter((cartItem) => cartItem.product.toString() !== productId)
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart item removed successfully.', cart))
})

/*
|--------------------------------------------------------------------------
| Apply Coupon
|--------------------------------------------------------------------------
*/

export const applyCoupon = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const couponConfig = STATIC_COUPONS[req.body.code]
  if (!couponConfig) {
    throw new AppError('Invalid coupon code.', HTTP_STATUS.BAD_REQUEST)
  }

  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found.', HTTP_STATUS.NOT_FOUND)
  }

  cart.coupon = { code: req.body.code, ...couponConfig }
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Coupon applied successfully.', cart))
})

/*
|--------------------------------------------------------------------------
| Remove Coupon
|--------------------------------------------------------------------------
*/

export const removeCoupon = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found.', HTTP_STATUS.NOT_FOUND)
  }

  cart.coupon = undefined
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Coupon removed successfully.', cart))
})

/*
|--------------------------------------------------------------------------
| Clear Cart
|--------------------------------------------------------------------------
*/

export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found.', HTTP_STATUS.NOT_FOUND)
  }

  if (cart.items.length > 0) {
    const bulkOperations = cart.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: item.quantity } },
      },
    }))

    await Product.bulkWrite(bulkOperations)
  }

  cart.items = []
  cart.coupon = undefined
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart cleared successfully.', cart))
})
