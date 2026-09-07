// import { Router } from 'express'

// import * as userController from '../controllers'

// const router = Router()

// router.get('/', userController.getAllUsers)
// router.get('/:id', userController.getUserById)

// export default router

import express from 'express';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';

import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} from '../controllers/user.controller.js';

const router = express.Router();

router.post('/add', auth, admin, createUser);

router.get('/all', auth, admin, getUsers);

router.get('/:id', auth, admin, getUserById);

router.patch('/:id', auth, updateUser);

router.delete('/:id', auth, admin, deleteUser);

export default router;
