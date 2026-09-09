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

import { User } from '../models/user.model.js';
import { uploadImages } from '../utils/cloudinary.js';

export const createUser = async (req, res, next) => {
    try {
        const { username, email, password, phone } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: 'Email already exists',
            });
        }

        let avatar;

        if (req.file) {
            const [uploadedImage] = await uploadImages(
                [req.file.buffer],
                'users/avatars',
            );

            avatar = uploadedImage.url;
        }

        const user = await User.create({
            username,
            email,
            password,
            phone,
            ...(avatar && { avatar }),
        });

        return res.status(201).json({
            message: 'User created successfully',
            user,
        });
    } catch (error) {
        next(error);
    }
};

export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select(
            '-resetPasswordToken -resetPasswordExpire',
        );

        return res.status(200).json({
            users,
        });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select(
            '-resetPasswordToken -resetPasswordExpire',
        );

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            user,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { username, email, phone } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (
            req.user.role !== 'admin' &&
            req.user._id.toString() !== req.params.id
        ) {
            return res.status(403).json({
                message: 'You are not allowed to update this user',
            });
        }

        if (email !== undefined && email !== user.email) {
            const existingUser = await User.findOne({
                email,
                _id: { $ne: user._id },
            });

            if (existingUser) {
                return res.status(409).json({
                    message: 'Email already exists',
                });
            }

            user.email = email;
        }

        if (username !== undefined) {
            user.username = username;
        }

        if (phone !== undefined) {
            user.phone = phone;
        }

        // عشان لو هنضيف صورة جديدة، لازم نحذف الصورة القديمة من Cloudinary
        if (req.file) {
            const [uploadedImage] = await uploadImages(
                [req.file.buffer],
                'users/avatars',
            );

            user.avatar = uploadedImage.url;
        }

        await user.save();

        return res.status(200).json({
            message: 'User updated successfully',
            user,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        await User.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: 'User deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
