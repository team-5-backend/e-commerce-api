import express from 'express'

import { HTTP_STATUS } from '../config/constants.js'

import authRoutes from './auth.routes.js'

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(HTTP_STATUS.OK).send({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

router.use('/auth', authRoutes)

export default router
import { Router } from "express";
import cartRouter from "./cart.routes.js";
import wishlistRouter from "./wishlist.routes.js";

const router = Router();

router.use("/carts", cartRouter);
router.use("/wishlists", wishlistRouter);

export default router;
