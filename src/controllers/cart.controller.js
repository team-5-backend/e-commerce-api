// Temporary Cart controller.
// Product stock and authenticated user integration will be added later.

export const getCart = (req, res) => {
  res.status(200).json({ message: "Get cart route" });
};

export const addCartItem = (req, res) => {
  res.status(201).json({ message: "Add item route", data: req.body });
};

export const updateCartItem = (req, res) => {
  res.status(200).json({ message: "Update item route", data: req.body });
};

export const removeCartItem = (req, res) => {
  res.status(200).json({
    message: "Remove item route",
    productId: req.params.productId
  });
};

export const applyCoupon = (req, res) => {
  res.status(200).json({ message: "Apply coupon route", data: req.body });
};

export const removeCoupon = (req, res) => {
  res.status(200).json({ message: "Remove coupon route" });
};

export const clearCart = (req, res) => {
  res.status(200).json({ message: "Clear cart route" });
};
