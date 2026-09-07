// import { Constants } from '../config/constants'
// import { userService } from '../services'

// export const getAllUsers = async (_req, res, next) => {
//   try {
//     const users = await userService.fetchUsers()
//     res.status(Constants.HTTP_STATUS.OK).json({
//       success: true,
//       count: users.length,
//       data: users,
//     })
//   } catch (err) {
//     next(err)
//   }
// }

// export const getUserById = async (req, res, next) => {
//   try {
//     const user = await userService.fetchUserById(req.params.id)
//     if (!user) {
//       return res
//         .status(Constants.HTTP_STATUS.NOT_FOUND)
//         .json({ success: false, message: 'User not found' })
//     }
//     res.status(Constants.HTTP_STATUS.OK).json({
//       success: true,
//       data: user,
//     })
//   } catch (err) {
//     next(err)
//   }
// }

// export const createUser = async (req, res, next) => {
//   try {
//     const user = await userService.createUser(req.body)
//     res.status(Constants.HTTP_STATUS.CREATED).json({
//       success: true,
//       data: user,
//     })
//   } catch (err) {
//     next(err)
//   }
// }

// export const deleteUser = async (req, res, next) => {
//   try {
//     const user = await userService.deleteUser(req.params.id)
//     if (!user) {
//       return res
//         .status(Constants.HTTP_STATUS.NOT_FOUND)
//         .json({ success: false, message: 'User not found' })
//     }
//     res.status(Constants.HTTP_STATUS.OK).json({
//       success: true,
//       message: 'User deleted successfully',
//     })
//   } catch (err) {
//     next(err)
//   }
// }

////////////////////////////////////////////////////////////////////////////////////////

import { User } from '../models/user.model.js'

// Create
export const createUser = async (req, res, next) => {
  try {
    const { username, email, password, phone } = req.body

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(409).json({
        message: 'Email already exists',
      })
    }

    const user = await User.create({
      username,
      email,
      password,
      phone,
    })

    res.status(201).json({
      message: 'User created successfully',
      user,
    })
  } catch (error) {
    next(error)
  }
}

// Get All
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()

    res.status(200).json({
      users,
    })
  } catch (error) {
    next(error)
  }
}

// Get By ID
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    res.status(200).json({
      user,
    })
  } catch (error) {
    next(error)
  }
}

// Update
export const updateUser = async (req, res, next) => {
  try {
    const { username, email, phone, avatar } = req.body

    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    // User can update himself only
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        message: 'You are not allowed to update this user',
      })
    }

    if (username !== undefined) user.username = username
    if (email !== undefined) user.email = email
    if (phone !== undefined) user.phone = phone
    if (avatar !== undefined) user.avatar = avatar

    await user.save()

    res.status(200).json({
      message: 'User updated successfully',
      user,
    })
  } catch (error) {
    next(error)
  }
}

// Delete
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    res.status(200).json({
      message: 'User deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}
