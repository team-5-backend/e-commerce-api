import { Product } from '../models/product.model.js'
import Wishlist from '../models/wishlist.model.js'

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId
const getProductId = (product) => (product._id || product).toString()

const ensureUser = (req, res) => {
  if (getUserId(req)) return true
  res.status(401).json({ message: 'Authentication is required' })
  return false
}

export const getMyWishlist = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return
    let wishlist = await Wishlist.findOne({ user: getUserId(req) })
    if (!wishlist) wishlist = await Wishlist.create({ user: getUserId(req) })
    res.status(200).json({ wishlist })
  } catch (error) {
    next(error)
  }
}

export const addToWishlist = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return
    const product = await Product.findById(req.params.productId)
    if (!product || product.isActive === false) {
      return res.status(404).json({ message: 'Product not found' })
    }

    let wishlist = await Wishlist.findOne({ user: getUserId(req) })
    if (!wishlist) wishlist = new Wishlist({ user: getUserId(req), products: [] })

    if (wishlist.products.some((id) => getProductId(id) === product._id.toString())) {
      return res.status(400).json({ message: 'Product already in wishlist' })
    }

    wishlist.products.push(product._id)
    await wishlist.save()
    await wishlist.populate('products')
    res.status(201).json({ wishlist })
  } catch (error) {
    next(error)
  }
}

export const removeFromWishlist = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return
    const wishlist = await Wishlist.findOne({ user: getUserId(req) })
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' })

    const exists = wishlist.products.some(
      (product) => getProductId(product) === req.params.productId,
    )
    if (!exists) return res.status(404).json({ message: 'Product not in wishlist' })

    wishlist.products = wishlist.products.filter(
      (product) => getProductId(product) !== req.params.productId,
    )
    await wishlist.save()
    await wishlist.populate('products')
    res.status(200).json({ wishlist })
  } catch (error) {
    next(error)
  }
}

export const clearWishlist = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return
    const wishlist = await Wishlist.findOne({ user: getUserId(req) })
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' })

    wishlist.products = []
    await wishlist.save()
    res.status(200).json({ wishlist })
  } catch (error) {
    next(error)
  }
}
