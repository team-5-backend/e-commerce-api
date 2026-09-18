import { HTTP_STATUS, STATIC_COUPONS } from '../config/constants.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { Cart, Product } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'

//////////////////////////////////////////////////////

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId

const getFinalPrice = (product) =>
  product.discountPrice > 0 ? product.discountPrice : product.price

const getImageUrl = (product) => {
  const image = product.images?.[0]
  return typeof image === 'string' ? image : image?.url
}

//////////////////////////////////////////////////////

export const getCart = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  let cart = await Cart.findOne({ user: userId })
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] })
  }

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart retrieved successfully', cart))
})

//////////////////////////////////////////////////////

export const addCartItem = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const { items } = req.body

  const validatedProducts = []

  try {
    const results = await Promise.all(
      items.map(async (inputItem) => {
        const quantity = Number(inputItem.quantity)
        const productId = inputItem.productId || inputItem.product

        const product = await Product.findOneAndUpdate(
          { _id: productId, isActive: true, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true },
        )

        if (!product) {
          const checkProduct = await Product.findById(productId)
          if (!checkProduct || !checkProduct.isActive) {
            throw new AppError(
              `Product with ID ${productId} is not found or inactive`,
              HTTP_STATUS.NOT_FOUND,
            )
          }
          throw new AppError(
            `Insufficient stock for product ID ${productId}`,
            HTTP_STATUS.BAD_REQUEST,
          )
        }

        return { product, quantity }
      }),
    )

    validatedProducts.push(...results)
  } catch (error) {
    await Promise.all(
      validatedProducts.map(async (deducted) => {
        await Product.updateOne(
          { _id: deducted.product._id },
          { $inc: { stock: deducted.quantity } },
        )
      }),
    )
    throw error
  }

  let cart = await Cart.findOne({ user: userId })
  if (!cart) {
    cart = new Cart({ user: userId, items: [] })
  } else if (cart.items.length === 0) {
    cart.coupon = undefined
    cart.discountAmount = 0
  }

  for (const { product, quantity } of validatedProducts) {
    const existingItem = cart.items.find(
      (cartItem) => cartItem.product.toString() === product._id.toString(),
    )

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        image: getImageUrl(product),
        price: getFinalPrice(product),
        quantity,
      })
    }
  }

  await cart.save()

  res.status(HTTP_STATUS.CREATED).send(ApiResponse('Items added to cart successfully', cart))
})

//////////////////////////////////////////////////////

export const updateCartItem = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const { items } = req.body

  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND)
  }

  const stockChanges = []

  try {
    await Promise.all(
      items.map(async (update) => {
        const { productId, quantity: newQuantity } = update

        const cartItem = cart.items.find((item) => item.product.toString() === productId)
        if (!cartItem) {
          throw new AppError(
            `Cart item with product ID ${productId} not found`,
            HTTP_STATUS.NOT_FOUND,
          )
        }

        const difference = newQuantity - cartItem.quantity
        if (difference === 0) return

        if (difference > 0) {
          const product = await Product.findOneAndUpdate(
            { _id: productId, stock: { $gte: difference } },
            { $inc: { stock: -difference } },
            { new: true },
          )
          if (!product) {
            throw new AppError(
              `Insufficient stock for product ID ${productId}`,
              HTTP_STATUS.BAD_REQUEST,
            )
          }
          stockChanges.push({ productId, type: 'decrement', amount: difference })
        } else {
          const absDiff = Math.abs(difference)
          await Product.updateOne({ _id: productId }, { $inc: { stock: absDiff } })
          stockChanges.push({ productId, type: 'increment', amount: absDiff })
        }

        cartItem.quantity = newQuantity
      }),
    )
  } catch (error) {
    await Promise.all(
      stockChanges.map(async (change) => {
        if (change.type === 'decrement') {
          await Product.updateOne({ _id: change.productId }, { $inc: { stock: change.amount } })
        } else {
          await Product.updateOne({ _id: change.productId }, { $inc: { stock: -change.amount } })
        }
      }),
    )
    throw error
  }

  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart items updated successfully', cart))
})

//////////////////////////////////////////////////////

export const removeCartItem = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const { id: productId } = req.params
  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND)
  }

  const item = cart.items.find((cartItem) => cartItem.product.toString() === productId)
  if (!item) {
    throw new AppError('Cart item not found', HTTP_STATUS.NOT_FOUND)
  }

  await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })

  cart.items = cart.items.filter((cartItem) => cartItem.product.toString() !== productId)
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart item removed successfully', cart))
})

//////////////////////////////////////////////////////

export const applyCoupon = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const couponConfig = STATIC_COUPONS[req.body.code]
  if (!couponConfig) {
    throw new AppError('Invalid coupon code', HTTP_STATUS.BAD_REQUEST)
  }

  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND)
  }

  if (cart.coupon) {
    throw new AppError('Coupon is applied already', HTTP_STATUS.NOT_FOUND)
  }

  cart.coupon = { code: req.body.code, ...couponConfig }
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Coupon applied successfully', cart))
})

//////////////////////////////////////////////////////

export const removeCoupon = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const cart = await Cart.findOne({ user: userId })
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!cart.coupon?.code) {
    throw new AppError('No coupon applied to this cart to remove', HTTP_STATUS.BAD_REQUEST)
  }

  cart.coupon = undefined
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Coupon removed successfully', cart))
})

//////////////////////////////////////////////////////

export const clearCart = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const cart = await Cart.findOne({ user: userId })
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError('No items in cart to remove', HTTP_STATUS.NOT_FOUND)
  }

  const bulkOperations = cart.items.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity } },
    },
  }))

  await Product.bulkWrite(bulkOperations)

  cart.items = []
  cart.coupon = undefined
  await cart.save()

  res.status(HTTP_STATUS.OK).send(ApiResponse('Cart cleared successfully', cart))
})
