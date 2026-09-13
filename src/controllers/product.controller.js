import mongoose from 'mongoose'

import { HTTP_STATUS } from '../config/constants.js'
import { Product } from '../models/product.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { deleteImages, uploadImages } from '../utils/cloudinary.js'
import logger from '../utils/logger.js'

const PUBLIC_PRODUCT_FIELDS =
  'name slug shortDescription description price discountPrice stock sku images category subcategory brand tags averageRating numReviews featured isActive createdAt updatedAt'

const getUserId = (req) => req.user?.id || req.user?._id

const validateObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid product ID', HTTP_STATUS.BAD_REQUEST)
  }
}

const normalizeDeleteImageIds = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {
    // Continue with comma-separated values
  }

  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

////////////////////////////////////////////////////////////////////////
// GET ACTIVE PRODUCTS
export const getActiveProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, brand, minPrice, maxPrice, sort = 'newest' } = req.query

  const query = { isActive: true }

  if (category) query.category = category
  if (brand) query.brand = brand

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {}
    if (minPrice !== undefined) query.price.$gte = Number(minPrice)
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice)
  }

  const skip = (Number(page) - 1) * Number(limit)
  const parsedLimit = Number(limit)

  const sortOptions = {
    newest: { createdAt: -1, _id: -1 },
    'price-asc': { price: 1, _id: 1 },
    'price-desc': { price: -1, _id: -1 },
    rating: { averageRating: -1, _id: -1 },
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .select(PUBLIC_PRODUCT_FIELDS)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(skip)
      .limit(parsedLimit)
      .lean()
      .exec(),
    Product.countDocuments(query).exec(),
  ])

  res.status(HTTP_STATUS.OK).send(
    ApiResponse('Products retrieved successfully.', {
      data: products,
      pagination: {
        page: Number(page),
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      },
    }),
  )
})

////////////////////////////////////////////////////////////////////////
// SEARCH PRODUCTS
export const searchProducts = asyncHandler(async (req, res) => {
  const {
    q,
    page = 1,
    limit = 10,
    category,
    subcategory,
    brand,
    tags,
    minPrice,
    maxPrice,
  } = req.query

  const query = { isActive: true }

  if (q) {
    query.$text = { $search: q }
  }

  if (category) query.category = category
  if (subcategory) query.subcategory = subcategory
  if (brand) query.brand = brand

  if (tags) {
    query.tags = {
      $in: tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {}
    if (minPrice !== undefined) query.price.$gte = Number(minPrice)
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice)
  }

  const skip = (Number(page) - 1) * Number(limit)
  const parsedLimit = Number(limit)

  const sort = q ? { score: { $meta: 'textScore' }, _id: 1 } : { createdAt: -1, _id: -1 }

  const [products, total] = await Promise.all([
    Product.find(query)
      .select(PUBLIC_PRODUCT_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(parsedLimit)
      .lean()
      .exec(),
    Product.countDocuments(query).exec(),
  ])

  res.status(HTTP_STATUS.OK).send(
    ApiResponse('Products searched successfully.', {
      data: products,
      pagination: {
        page: Number(page),
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      },
    }),
  )
})

////////////////////////////////////////////////////////////////////////
// GET PRODUCT BY ID
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params
  validateObjectId(id)

  const product = await Product.findOne({ _id: id, isActive: true })
    .select(PUBLIC_PRODUCT_FIELDS)
    .lean()
    .exec()

  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
  }

  res.status(HTTP_STATUS.OK).send(ApiResponse('Product retrieved successfully.', product))
})

////////////////////////////////////////////////////////////////////////
// CREATE PRODUCT (Admin Only)
export const createProduct = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  if (!req.files || req.files.length === 0) {
    throw new AppError('At least one product image is required', HTTP_STATUS.BAD_REQUEST)
  }

  let uploadedImages = []
  try {
    uploadedImages = await uploadImages(
      req.files.map((file) => file.buffer),
      'products',
    )

    if (!uploadedImages?.length) {
      throw new AppError('Failed to upload product images', HTTP_STATUS.INTERNAL_ERROR)
    }

    const images = uploadedImages.map((image) => ({
      public_id: image.publicId,
      url: image.url,
    }))

    const product = await Product.create({
      ...req.body,
      images,
      createdBy: userId,
    })

    res.status(HTTP_STATUS.CREATED).send(ApiResponse('Product created successfully.', product))
  } catch (error) {
    if (uploadedImages.length > 0) {
      await deleteImages(uploadedImages.map((image) => image.publicId)).catch((cleanupError) => {
        logger.error({
          message: 'Failed to cleanup uploaded product images',
          error: cleanupError,
        })
      })
    }
    throw error
  }
})

////////////////////////////////////////////////////////////////////////
// UPDATE PRODUCT (Admin Only)
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params
  validateObjectId(id)

  const product = await Product.findById(id).exec()
  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
  }

  const { deleteImageIds, ...updates } = req.body
  const imageIdsToDelete = normalizeDeleteImageIds(deleteImageIds)

  const existingImageIds = new Set(product.images.map((image) => image.public_id))

  const invalidImageIds = imageIdsToDelete.filter((imageId) => !existingImageIds.has(imageId))

  if (invalidImageIds.length > 0) {
    throw new AppError(
      'One or more image IDs do not belong to this product',
      HTTP_STATUS.BAD_REQUEST,
    )
  }

  const newFiles = req.files || []

  if (Object.keys(updates).length === 0 && imageIdsToDelete.length === 0 && newFiles.length === 0) {
    throw new AppError('No update data provided', HTTP_STATUS.BAD_REQUEST)
  }

  const finalImageCount = product.images.length - imageIdsToDelete.length + newFiles.length

  if (finalImageCount < 1) {
    throw new AppError('Product must have at least one image', HTTP_STATUS.BAD_REQUEST)
  }

  let uploadedImages = []
  try {
    if (newFiles.length > 0) {
      uploadedImages = await uploadImages(
        newFiles.map((file) => file.buffer),
        'products',
      )
    }

    const newImages = uploadedImages.map((image) => ({
      public_id: image.publicId,
      url: image.url,
    }))

    product.images = product.images.filter((image) => !imageIdsToDelete.includes(image.public_id))

    product.images.push(...newImages)
    Object.assign(product, updates)

    await product.save()

    if (imageIdsToDelete.length > 0) {
      await deleteImages(imageIdsToDelete).catch((cleanupError) => {
        logger.error({
          message: 'Failed to delete old product images from Cloudinary',
          error: cleanupError,
          productId: id,
          imageIds: imageIdsToDelete,
        })
      })
    }

    res.status(HTTP_STATUS.OK).send(ApiResponse('Product updated successfully.', product))
  } catch (error) {
    if (uploadedImages.length > 0) {
      await deleteImages(uploadedImages.map((image) => image.publicId)).catch((cleanupError) => {
        logger.error({
          message: 'Failed to cleanup new product images',
          error: cleanupError,
        })
      })
    }
    throw error
  }
})

////////////////////////////////////////////////////////////////////////
// DELETE PRODUCT (Admin Only)
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params
  validateObjectId(id)

  const product = await Product.findById(id).exec()
  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
  }

  await product.deleteOne()

  const imageIds = product.images.map((image) => image.public_id)
  if (imageIds.length > 0) {
    await deleteImages(imageIds).catch((cleanupError) => {
      logger.error({
        message: 'Product deleted but Cloudinary cleanup failed',
        error: cleanupError,
        productId: id,
        imageIds,
      })
    })
  }

  res.status(HTTP_STATUS.OK).send(ApiResponse('Product deleted successfully.'))
})

////////////////////////////////////////////////////////////////////////
// ADD REVIEW
export const addReview = asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = getUserId(req)
  validateObjectId(id)

  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const product = await Product.findOne({ _id: id, isActive: true }).exec()
  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
  }

  const alreadyReviewed = product.reviews.some(
    (review) => review.user.toString() === userId.toString(),
  )

  if (alreadyReviewed) {
    throw new AppError('You have already reviewed this product', HTTP_STATUS.CONFLICT)
  }

  product.reviews.push({
    user: userId,
    rating: Number(req.body.rating),
    comment: req.body.comment,
  })

  product.calcAverageRating()
  await product.save()

  const review = product.reviews[product.reviews.length - 1]

  res.status(HTTP_STATUS.CREATED).send(
    ApiResponse('Review added successfully.', {
      review,
      averageRating: product.averageRating,
      numReviews: product.numReviews,
    }),
  )
})

////////////////////////////////////////////////////////////////////////
// DELETE REVIEW
export const deleteReview = asyncHandler(async (req, res) => {
  const { id, reviewId } = req.params
  const userId = getUserId(req)

  validateObjectId(id)
  validateObjectId(reviewId)

  if (!userId) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const product = await Product.findById(id).exec()
  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
  }

  const review = product.reviews.id(reviewId)
  if (!review) {
    throw new AppError('Review not found', HTTP_STATUS.NOT_FOUND)
  }

  const isOwner = review.user.toString() === userId.toString()
  const isAdmin = req.user?.role === 'admin'

  if (!isOwner && !isAdmin) {
    throw new AppError('You are not allowed to delete this review', HTTP_STATUS.FORBIDDEN)
  }

  review.deleteOne()
  product.calcAverageRating()
  await product.save()

  res.status(HTTP_STATUS.OK).send(
    ApiResponse('Review deleted successfully.', {
      averageRating: product.averageRating,
      numReviews: product.numReviews,
    }),
  )
})

////////////////////////////////////////////////////////////////////////
// GET REVIEWS (WITH PAGINATION)
export const getReviews = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 10 } = req.query
  validateObjectId(id)

  const parsedLimit = Number(limit)
  const skip = (Number(page) - 1) * parsedLimit

  const product = await Product.findOne({ _id: id, isActive: true })
    .select({
      numReviews: 1, //العدد الإجمالي للتقييمات.
      reviews: { $slice: [skip, parsedLimit] },
    })
    .populate('reviews.user', 'username avatar')
    .lean()
    .exec()

  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND)
  }

  const total = product.numReviews || 0

  res.status(HTTP_STATUS.OK).send(
    ApiResponse('Reviews retrieved successfully.', {
      data: product.reviews,
      pagination: {
        page: Number(page),
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      },
    }),
  )
})
