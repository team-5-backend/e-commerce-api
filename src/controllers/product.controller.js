import mongoose from 'mongoose'

import { Product } from '../models/product.model.js'
import { HTTP_STATUS } from '../config/constants.js'
import { AppError } from '../utils/appError.js'
import { uploadImages, deleteImages } from '../utils/cloudinary.js'
import logger from '../utils/logger.js'
import { clearProductCache } from '../utils/productCache.js'

    const PUBLIC_PRODUCT_FIELDS = `
    name
    slug
    shortDescription
    description
    price
    discountPrice
    stock
    sku
    images
    category
    subcategory
    brand
    tags
    averageRating
    numReviews
    featured
    isActive
    createdAt
    updatedAt
    `

    const getUserId = (req) => {
    return req.user?.id || req.user?._id
    }

    const validateObjectId = (id) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(
        'Invalid product ID',
        HTTP_STATUS.BAD_REQUEST,
        )
    }
    }

    const normalizeDeleteImageIds = (value) => {
    if (!value) return []

    if (Array.isArray(value)) {
        return value.filter(Boolean)
    }

    if (typeof value !== 'string') {
        return []
    }

    try {
        const parsed = JSON.parse(value)

        if (Array.isArray(parsed)) {
        return parsed.filter(Boolean)
        }
    } catch {
        // Not JSON, continue with comma-separated values
    }

    return value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    }

    // GET ACTIVE PRODUCTS

    export const getActiveProducts = async (req, res, next) => {
    try {
        const {
        page = 1,
        limit = 10,
        category,
        brand,
        minPrice,
        maxPrice,
        sort = 'newest',
        } = req.query

        const query = {
        isActive: true,
        }

        if (category) {
        query.category = category
        }

        if (brand) {
        query.brand = brand
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {}

        if (minPrice !== undefined) {
            query.price.$gte = minPrice
        }

        if (maxPrice !== undefined) {
            query.price.$lte = maxPrice
        }
        }

        const skip = (page - 1) * limit

        const sortOptions = {
        newest: {
            createdAt: -1,
            _id: -1,
        },

        'price-asc': {
            price: 1,
            _id: 1,
        },

        'price-desc': {
            price: -1,
            _id: -1,
        },

        rating: {
            averageRating: -1,
            _id: -1,
        },
        }

        const [products, total] = await Promise.all([
        Product.find(query)
            .select(PUBLIC_PRODUCT_FIELDS)
            .sort(sortOptions[sort] || sortOptions.newest)
            .skip(skip)
            .limit(limit)
            .lean(),

        Product.countDocuments(query),
        ])

        return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
        })
    } catch (error) {
        return next(error)
    }
    }

    // SEARCH PRODUCTS

    export const searchProducts = async (req, res, next) => {
    try {
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

        const query = {
        isActive: true,
        }

        if (q) {
        query.$text = {
            $search: q,
        }
        }

        if (category) {
        query.category = category
        }

        if (subcategory) {
        query.subcategory = subcategory
        }

        if (brand) {
        query.brand = brand
        }

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

        if (minPrice !== undefined) {
            query.price.$gte = minPrice
        }

        if (maxPrice !== undefined) {
            query.price.$lte = maxPrice
        }
        }

        const skip = (page - 1) * limit

        const sort = q
        ? {
            score: {
                $meta: 'textScore',
            },
            _id: 1,
            }
        : {
            createdAt: -1,
            _id: -1,
            }

        const [products, total] = await Promise.all([
        Product.find(query)
            .select(PUBLIC_PRODUCT_FIELDS)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),

        Product.countDocuments(query),
        ])

        return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
        })
    } catch (error) {
        return next(error)
    }
    }

    // GET PRODUCT BY ID

    export const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params

        validateObjectId(id)

        const product = await Product.findOne({
        _id: id,
        isActive: true,
        })
        .select(PUBLIC_PRODUCT_FIELDS)
        .lean()

        if (!product) {
        return next(
            new AppError(
            'Product not found',
            HTTP_STATUS.NOT_FOUND,
            ),
        )
        }

        return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: product,
        })
    } catch (error) {
        return next(error)
    }
    }

    // CREATE PRODUCT

    export const createProduct = async (req, res, next) => {
    let uploadedImages = []

    try {
        const userId = getUserId(req)

        if (!userId) {
        return next(
            new AppError(
            'Unauthorized',
            HTTP_STATUS.UNAUTHORIZED,
            ),
        )
        }

        if (!req.files || req.files.length === 0) {
        return next(
            new AppError(
            'At least one product image is required',
            HTTP_STATUS.BAD_REQUEST,
            ),
        )
        }

        uploadedImages = await uploadImages(
        req.files.map((file) => file.buffer),
        'products',
        )

        if (!uploadedImages?.length) {
        return next(
            new AppError(
            'Failed to upload product images',
            HTTP_STATUS.INTERNAL_ERROR,
            ),
        )
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

        // Invalidate product cache after successful DB update
        await clearProductCache()

        return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Product created successfully',
        data: product,
        })
    } catch (error) {
        if (uploadedImages.length > 0) {
        await deleteImages(
            uploadedImages.map((image) => image.publicId),
        ).catch((cleanupError) => {
            logger.error({
            message: 'Failed to cleanup uploaded product images',
            error: cleanupError,
            })
        })
        }

        return next(error)
    }
    }

    // UPDATE PRODUCT

    export const updateProduct = async (req, res, next) => {
    let uploadedImages = []

    try {
        const { id } = req.params

        validateObjectId(id)

        const product = await Product.findById(id)

        if (!product) {
        return next(
            new AppError(
            'Product not found',
            HTTP_STATUS.NOT_FOUND,
            ),
        )
        }

        const {
        deleteImageIds,
        ...updates
        } = req.body

        const imageIdsToDelete =
        normalizeDeleteImageIds(deleteImageIds)

        const existingImageIds = new Set(
        product.images.map(
            (image) => image.public_id,
        ),
        )

        const invalidImageIds =
        imageIdsToDelete.filter(
            (imageId) =>
            !existingImageIds.has(imageId),
        )

        if (invalidImageIds.length > 0) {
        return next(
            new AppError(
            'One or more image IDs do not belong to this product',
            HTTP_STATUS.BAD_REQUEST,
            ),
        )
        }

        const newFiles = req.files || []

        if (
        Object.keys(updates).length === 0 &&
        imageIdsToDelete.length === 0 &&
        newFiles.length === 0
        ) {
        return next(
            new AppError(
            'No update data provided',
            HTTP_STATUS.BAD_REQUEST,
            ),
        )
        }

        const finalImageCount =
        product.images.length -
        imageIdsToDelete.length +
        newFiles.length

        if (finalImageCount < 1) {
        return next(
            new AppError(
            'Product must have at least one image',
            HTTP_STATUS.BAD_REQUEST,
            ),
        )
        }

        // Upload new images first
        if (newFiles.length > 0) {
        uploadedImages = await uploadImages(
            newFiles.map((file) => file.buffer),
            'products',
        )
        }

        const newImages = uploadedImages.map(
        (image) => ({
            public_id: image.publicId,
            url: image.url,
        }),
        )

        product.images = product.images.filter(
        (image) =>
            !imageIdsToDelete.includes(
            image.public_id,
            ),
        )

        product.images.push(...newImages)

        Object.assign(product, updates)

        await product.save()

        // Invalidate cache after successful DB update
        await clearProductCache()

        // Cleanup old Cloudinary images
        if (imageIdsToDelete.length > 0) {
        await deleteImages(
            imageIdsToDelete,
        ).catch((cleanupError) => {
            logger.error({
            message:
                'Failed to delete old product images from Cloudinary',
            error: cleanupError,
            productId: id,
            imageIds: imageIdsToDelete,
            })
        })
        }

        return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
        })
    } catch (error) {
        if (uploadedImages.length > 0) {
        await deleteImages(
            uploadedImages.map(
            (image) => image.publicId,
            ),
        ).catch((cleanupError) => {
            logger.error({
            message:
                'Failed to cleanup new product images',
            error: cleanupError,
            })
        })
        }

        return next(error)
    }
    }

    // DELETE PRODUCT

    export const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params

        validateObjectId(id)

        const product = await Product.findById(id)

        if (!product) {
        return next(
            new AppError(
            'Product not found',
            HTTP_STATUS.NOT_FOUND,
            ),
        )
        }

        await product.deleteOne()

        // Invalidate cache after successful DB delete
        await clearProductCache()

        const imageIds = product.images.map(
        (image) => image.public_id,
        )

        if (imageIds.length > 0) {
        await deleteImages(imageIds).catch(
            (cleanupError) => {
            logger.error({
                message:
                'Product deleted but Cloudinary cleanup failed',
                error: cleanupError,
                productId: id,
                imageIds,
            })
            },
        )
        }

        return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Product deleted successfully',
        })
    } catch (error) {
        return next(error)
    }
    }

    // ADD REVIEW

    export const addReview = async (req, res, next) => {
    try {
        const { id } = req.params
        const userId = getUserId(req)

        validateObjectId(id)

        if (!userId) {
        return next(
            new AppError(
            'Unauthorized',
            HTTP_STATUS.UNAUTHORIZED,
            ),
        )
        }

        const product = await Product.findOne({
        _id: id,
        isActive: true,
        })

        if (!product) {
        return next(
            new AppError(
            'Product not found',
            HTTP_STATUS.NOT_FOUND,
            ),
        )
        }

        const alreadyReviewed = product.reviews.some(
        (review) =>
            review.user.toString() ===
            userId.toString(),
        )

        if (alreadyReviewed) {
        return next(
            new AppError(
            'You have already reviewed this product',
            HTTP_STATUS.CONFLICT,
            ),
        )
        }

        product.reviews.push({
        user: userId,
        rating: req.body.rating,
        comment: req.body.comment,
        })

        product.calcAverageRating()

        await product.save()

        // Reviews affect averageRating and numReviews
        await clearProductCache()

        const review =
        product.reviews[
            product.reviews.length - 1
        ]

        return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Review added successfully',
        data: {
            review,
            averageRating:
            product.averageRating,
            numReviews:
            product.numReviews,
        },
        })
    } catch (error) {
        return next(error)
    }
    }

    // DELETE REVIEW

    export const deleteReview = async (req, res, next) => {
    try {
        const { id, reviewId } = req.params
        const userId = getUserId(req)

        validateObjectId(id)
        validateObjectId(reviewId)

        if (!userId) {
        return next(
            new AppError(
            'Unauthorized',
            HTTP_STATUS.UNAUTHORIZED,
            ),
        )
        }

        const product = await Product.findById(id)

        if (!product) {
        return next(
            new AppError(
            'Product not found',
            HTTP_STATUS.NOT_FOUND,
            ),
        )
        }

        const review = product.reviews.id(reviewId)

        if (!review) {
        return next(
            new AppError(
            'Review not found',
            HTTP_STATUS.NOT_FOUND,
            ),
        )
        }

        const isOwner =
        review.user.toString() ===
        userId.toString()

        const isAdmin =
        req.user?.role === 'admin'

        if (!isOwner && !isAdmin) {
        return next(
            new AppError(
            'You are not allowed to delete this review',
            HTTP_STATUS.FORBIDDEN,
            ),
        )
        }

        review.deleteOne()

        product.calcAverageRating()

        await product.save()

        // Reviews affect cached product data
        await clearProductCache()

        return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Review deleted successfully',
        data: {
            averageRating:
            product.averageRating,
            numReviews:
            product.numReviews,
        },
        })
    } catch (error) {
        return next(error)
    }
    }

    // GET REVIEWS

    export const getReviews = async (req, res, next) => {
    try {
        const { id } = req.params

        validateObjectId(id)

        const product = await Product.findOne({
        _id: id,
        isActive: true,
        })
        .select('reviews numReviews')
        .populate(
            'reviews.user',
            'username avatar',
        )
        .lean()

        if (!product) {
        return next(
            new AppError(
            'Product not found',
            HTTP_STATUS.NOT_FOUND,
            ),
        )
        }

        return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: product.reviews,
        total: product.numReviews,
        })
    } catch (error) {
        return next(error)
    }
}