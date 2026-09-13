import { HTTP_STATUS } from '../config/constants.js'
import { User } from '../models/user.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { deleteImages, uploadImages } from '../utils/cloudinary.js'

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null
  try {
    const parts = url.split('/upload/')
    if (parts.length < 2) return null

    const file = parts[1].split('/').slice(1).join('/')

    return file.substring(0, file.lastIndexOf('.'))
  } catch {
    return null
  }
}

/*
|--------------------------------------------------------------------------
| Create User
|--------------------------------------------------------------------------
*/

export const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, phone, role, addresses, isVerified } = req.body

  const exists = await User.findOne({ email }).lean().exec()
  if (exists) throw new AppError('Email already exists.', HTTP_STATUS.CONFLICT)

  let avatarUrl
  if (req.file) {
    const uploaded = await uploadImages([req.file.buffer], 'user_avatars')
    if (uploaded?.[0]) avatarUrl = uploaded[0].url
  }

  const user = await User.create({
    username,
    email,
    password,
    phone,
    role: req.user.role === 'admin' && role ? role : 'customer',
    addresses: addresses || [],
    isVerified: isVerified ?? true,
    ...(avatarUrl && { avatar: avatarUrl }),
  })

  const result = user.toObject()
  delete result.password

  res.status(HTTP_STATUS.CREATED).send(ApiResponse('User created successfully.', result))
})

/*
|--------------------------------------------------------------------------
| Get All Users
|--------------------------------------------------------------------------
*/

export const getUsers = asyncHandler(async (req, res) => {
  const { currentPage, currentLimit, skip } = getPagination(req.query.page, req.query.limit)

  const [users, totalUsers] = await Promise.all([
    User.find().skip(skip).limit(currentLimit).lean().exec(),
    User.countDocuments(),
  ])

  res.status(HTTP_STATUS.OK).send(
    ApiResponse('Users retrieved successfully.', {
      users,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / currentLimit),
      },
    }),
  )
})

/*
|--------------------------------------------------------------------------
| Get User by Id
|--------------------------------------------------------------------------
*/

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean().exec()
  if (!user) throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND)

  res.status(HTTP_STATUS.OK).send(ApiResponse('User retrieved successfully.', user))
})

/*
|--------------------------------------------------------------------------
| Update User
|--------------------------------------------------------------------------
*/

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { username, email, phone, addresses, role } = req.body

  const isAdmin = req.user.role === 'admin'
  const isSelf = req.user._id.toString() === id

  if (!isAdmin && !isSelf) {
    throw new AppError('Not authorized to update this user.', HTTP_STATUS.FORBIDDEN)
  }

  const user = await User.findById(id).exec()
  if (!user) throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND)

  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email }).lean().exec()
    if (emailExists) throw new AppError('Email already in use.', HTTP_STATUS.CONFLICT)
  }

  if (username !== undefined) user.username = username
  if (email !== undefined) user.email = email
  if (phone !== undefined) user.phone = phone
  if (addresses !== undefined) user.addresses = addresses

  if (isAdmin && role !== undefined) {
    user.role = role
  }

  if (req.file) {
    const oldId = getPublicId(user.avatar)
    if (oldId) await deleteImages([oldId]).catch(() => {})

    const uploaded = await uploadImages([req.file.buffer], 'user_avatars')
    if (uploaded?.[0]) user.avatar = uploaded[0].url
  }

  await user.save()

  const result = user.toObject()
  delete result.password

  res.status(HTTP_STATUS.OK).send(ApiResponse('User updated successfully.', result))
})

/*
|--------------------------------------------------------------------------
| Delete User
|--------------------------------------------------------------------------
*/

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id).lean().exec()
  if (!user) throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND)

  const oldId = getPublicId(user.avatar)
  if (oldId) await deleteImages([oldId]).catch(() => {})

  res.status(HTTP_STATUS.OK).send(ApiResponse('User deleted successfully.'))
})
