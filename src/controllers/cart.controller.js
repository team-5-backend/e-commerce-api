import Cart from "../models/cart.model.js";
import { Product } from "../models/product.model.js";

const COUPONS = {
  SAVE10: { discountType: "percentage", discountValue: 10 },
  SAVE20: { discountType: "percentage", discountValue: 20 },
  SAVE50: { discountType: "percentage", discountValue: 50 },
  SAVE80: { discountType: "percentage", discountValue: 80 },
  OFF50: { discountType: "fixed", discountValue: 50 }
};

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId;

const ensureUser = (req, res) => {
  if (getUserId(req)) return true;
  res.status(401).json({ message: "Authentication is required" });
  return false;
};

const getFinalPrice = (product) =>
  product.discountPrice > 0 ? product.discountPrice : product.price;

const getImageUrl = (product) => {
  const image = product.images?.[0];
  return typeof image === "string" ? image : image?.url;
};

export const getCart = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return;
    let cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) cart = await Cart.create({ user: getUserId(req) });
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

export const addCartItem = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return;
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);

    if (!product || product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ message: "Insufficient product stock" });
    }

    let cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) cart = new Cart({ user: getUserId(req), items: [] });

    const item = cart.items.find(
      (cartItem) => cartItem.product.toString() === productId
    );

    if (item) item.quantity += quantity;
    else {
      cart.items.push({
        product: product._id,
        name: product.name,
        image: getImageUrl(product),
        price: getFinalPrice(product),
        quantity
      });
    }

    product.stock -= quantity;
    await Promise.all([cart.save(), product.save()]);
    res.status(201).json({ cart });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return;
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (cartItem) => cartItem.product.toString() === productId
    );
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const difference = quantity - item.quantity;
    if (difference > 0 && product.stock < difference) {
      return res.status(400).json({ message: "Insufficient product stock" });
    }

    item.quantity = quantity;
    product.stock -= difference;
    await Promise.all([cart.save(), product.save()]);
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return;
    const cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (cartItem) => cartItem.product.toString() === req.params.productId
    );
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity }
    });
    cart.items = cart.items.filter(
      (cartItem) => cartItem.product.toString() !== req.params.productId
    );
    await cart.save();
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

export const applyCoupon = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return;
    const coupon = COUPONS[req.body.code];
    if (!coupon) return res.status(400).json({ message: "Invalid coupon code" });

    const cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.coupon = { code: req.body.code, ...coupon };
    await cart.save();
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

export const removeCoupon = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return;
    const cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.coupon = undefined;
    await cart.save();
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    if (!ensureUser(req, res)) return;
    const cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    await Promise.all(
      cart.items.map((item) =>
        Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
      )
    );
    cart.items = [];
    cart.coupon = undefined;
    await cart.save();
    res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
};
