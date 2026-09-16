import { HTTP_STATUS } from '../config/constants.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { User } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'
import { deleteImages, uploadImages } from '../utils/cloudinary.js'

////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////

export const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, phone, role, addresses, isVerified } = req.body

  const exists = await User.findOne({ email }).lean().exec()
  if (exists) throw new AppError('User already exists.', HTTP_STATUS.CONFLICT)

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
    role: role || 'customer',
    addresses: addresses || [],
    isVerified: isVerified ?? true,
    ...(avatarUrl && { avatar: avatarUrl }),
  })

  const result = user.toObject()
  delete result.password

  res.status(HTTP_STATUS.CREATED).send(ApiResponse('User created successfully.', result))
})

////////////////////////////////////////////////////////

export const getUsers = asyncHandler(async (_, res) => {
  const users = await User.find().select('-password').lean().exec()
  if (!users || users.length === 0) {
    throw new AppError('No users found in the system.', HTTP_STATUS.NOT_FOUND)
  }
  res.status(HTTP_STATUS.OK).send(ApiResponse('Users retrieved successfully.', users))
})

////////////////////////////////////////////////////////

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').lean().exec()
  if (!user) throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND)

  res.status(HTTP_STATUS.OK).send(ApiResponse('User retrieved successfully.', user))
})

////////////////////////////////////////////////////////

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { username, email, phone, addresses, role, isVerified } = req.body
  const isAdmin = req.user.role === 'admin'
  const isSelf = req.user._id.toString() === id

  if (!isAdmin && !isSelf) {
    throw new AppError('Not authorized to update this user.', HTTP_STATUS.FORBIDDEN)
  }

  const user = await User.findById(id).exec()
  if (!user) throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND)

  if (username !== undefined) user.username = username
  if (email !== undefined) user.email = email
  if (phone !== undefined) user.phone = phone
  if (addresses !== undefined) user.addresses = addresses

  if (isAdmin) {
    if (role !== undefined) user.role = role
    if (isVerified !== undefined) user.isVerified = isVerified
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

////////////////////////////////////////////////////////

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean().exec()
  if (!user) throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND)

  const oldId = getPublicId(user.avatar)
  if (oldId) await deleteImages([oldId]).catch(() => {})

  await User.findByIdAndDelete(req.params.id).exec()

  res.status(HTTP_STATUS.OK).send(ApiResponse('User deleted successfully.'))
})
