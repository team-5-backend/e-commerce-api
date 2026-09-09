// import { Router } from 'express'

// import * as userController from '../controllers'

// const router = Router()

// router.get('/', userController.getAllUsers)
// router.get('/:id', userController.getUserById)

// export default router

// import express from 'express';
// import auth from '../middlewares/auth.js';
// import admin from '../middlewares/admin.js';

// import {
//     createUser,
//     getUsers,
//     getUserById,
//     updateUser,
//     deleteUser,
// } from '../controllers/user.controller.js';

// const router = express.Router();

// router.post('/add', auth, admin, createUser);

// router.get('/all', auth, admin, getUsers);

// router.get('/:id', auth, admin, getUserById);

// router.patch('/:id', auth, updateUser);

// router.delete('/:id', auth, admin, deleteUser);

// export default router;

import express from 'express';

import {
    createUser,
    deleteUser,
    getUserById,
    getUsers,
    updateUser,
} from '../controllers/user.controller.js';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';

import { cache } from '../middlewares/cache.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = express.Router();

router.post(
    '/add',
    authenticate,
    authorize('admin'),
    upload.single('avatar'),
    createUser,
);

router.get('/all', authenticate, authorize('admin'), cache(), getUsers);

router.get('/:id', authenticate, authorize('admin'), cache(), getUserById);

router.patch('/:id', authenticate, upload.single('avatar'), updateUser);

router.delete('/:id', authenticate, authorize('admin'), deleteUser);

export default router;
