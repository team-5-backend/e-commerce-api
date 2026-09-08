import mongoose from "mongoose";
import Stripe from "stripe";

import { Order } from "../models/Order.model.js";
import { Cart } from "../models/Cart.model.js";
import { Product } from "../models/Product.model.js";
import { User } from "../models/User.model.js";

import { AppError } from "../utils/appError.js";
import sendEmail from "../utils/sendEmail.js";

import { HTTP_STATUS } from "../config/constants.js";
import environment from "../config/environment.js";
import logger from "../utils/logger.js";

/*
|--------------------------------------------------------------------------
| Stripe Client
|--------------------------------------------------------------------------
| We create the Stripe client only when the secret key exists.
| This prevents the application from crashing for cash orders
| when Stripe is not configured yet.
|--------------------------------------------------------------------------
*/
const stripe = environment?.stripe?.secretKey
  ? new Stripe(environment.stripe.secretKey)
  : null;
/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

/*
 * Shipping is free when subtotal is 1000 EGP or more.
 * Otherwise, shipping costs 50 EGP.
 */
const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_FEE = 50;
 // VAT percentage required by the documentation.
const TAX_RATE = 0.14;

/*
|--------------------------------------------------------------------------
| Helper: Build Order Query Pagination
|--------------------------------------------------------------------------
| We keep pagination logic in one place instead of repeating it
| in every controller method.
|--------------------------------------------------------------------------
*/
const getPagination = (page, limit) => {
   // Convert query string values into numbers.
  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
   // Calculate how many documents MongoDB should skip.
  const skip = (currentPage - 1) * currentLimit;
  return {
    currentPage,
    currentLimit,
    skip,
  };
};

/*
|--------------------------------------------------------------------------
| Helper: Calculate Order Financials
|--------------------------------------------------------------------------
| We calculate all financial fields in one place so the calculation
| remains consistent between createOrder and other future operations.
|--------------------------------------------------------------------------
*/
const calculateOrderTotals = (cart) => {
   // Calculate the subtotal from the actual cart items.
  const subtotal = cart.items.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0,
  );
   // Apply the shipping rule from the documentation.
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
   // Calculate the 14% VAT on the subtotal.
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  /*
   * The Cart model already calculates the coupon discount
   * through its virtual field.
   */
  const discount = Number((cart.discountAmount || 0).toFixed(2));
   // Calculate the final order price.
  const totalPrice = Number(
    (subtotal + shippingFee + tax - discount).toFixed(2),
  );
  return {
    subtotal: Number(subtotal.toFixed(2)),
    shippingFee,
    tax,
    discount,
    totalPrice,
  };
};

/*
|--------------------------------------------------------------------------
| Helper: Build Email Items Table
|--------------------------------------------------------------------------
| This converts order items into an HTML table used by the
| order confirmation email.
|--------------------------------------------------------------------------
*/
const buildOrderItemsHtml = (items) => {
  return items
    .map((item) => {
      const itemTotal = Number((item.price * item.quantity).toFixed(2));
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${item.name}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${item.quantity}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${item.price.toFixed(2)} EGP
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${itemTotal.toFixed(2)} EGP
          </td>
        </tr>
      `;
    })
    .join("");
};

/*
|--------------------------------------------------------------------------
| Helper: Send Order Confirmation Email
|--------------------------------------------------------------------------
| The documentation requires an automated confirmation email
| containing itemized products and the complete price breakdown.
|--------------------------------------------------------------------------
*/
const sendOrderConfirmationEmail = async (order, user) => {
   // Build the products table.
  const itemsHtml = buildOrderItemsHtml(order.items);
   // Build the complete HTML email.
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order Confirmation</h2>
      <p>
        Hello ${user.username},
      </p>
      <p>
        Your order has been placed successfully.
      </p>
      <p>
        <strong>Order ID:</strong> ${order._id}
      </p>
      <p>
        <strong>Payment Method:</strong> ${order.paymentMethod}
      </p>
      <p>
        <strong>Order Status:</strong> ${order.status}
      </p>
      <h3>Order Items</h3>
      <table
        style="
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        "
      >
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd;">
              Product
            </th>
            <th style="padding: 8px; border: 1px solid #ddd;">
              Quantity
            </th>
            <th style="padding: 8px; border: 1px solid #ddd;">
              Price
            </th>
            <th style="padding: 8px; border: 1px solid #ddd;">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <h3>Price Breakdown</h3>
      <p>
        <strong>Subtotal:</strong>
        ${order.subtotal.toFixed(2)} EGP
      </p>
      <p>
        <strong>Shipping Fee:</strong>
        ${order.shippingFee.toFixed(2)} EGP
      </p>
      <p>
        <strong>Tax:</strong>
        ${order.tax.toFixed(2)} EGP
      </p>
      <p>
        <strong>Discount:</strong>
        ${order.discount.toFixed(2)} EGP
      </p>
      <h3>
        Total:
        ${order.totalPrice.toFixed(2)} EGP
      </h3>
      <p>
        Thank you for shopping with us.
      </p>
    </div>
  `;
   // Use the existing email utility exactly as provided.
  await sendEmail({
    to: user.email,
    subject: `Order Confirmation - ${order._id}`,
    html,
  });
};

/*
|--------------------------------------------------------------------------
| Helper: Send Order Status Email
|--------------------------------------------------------------------------
| The documentation requires an email whenever an admin changes
| the order status.
|--------------------------------------------------------------------------
*/
const sendOrderStatusEmail = async (order, user, previousStatus) => {
   // Build the email body.
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order Status Update</h2>
      <p>
        Hello ${user.username},
      </p>
      <p>
        Your order status has been updated.
      </p>
      <p>
        <strong>Order ID:</strong> ${order._id}
      </p>
      <p>
        <strong>Previous Status:</strong> ${previousStatus}
      </p>
      <p>
        <strong>Current Status:</strong> ${order.status}
      </p>
      <p>
        <strong>Total Price:</strong>
        ${order.totalPrice.toFixed(2)} EGP
      </p>
      <p>
        Thank you for shopping with us.
      </p>
    </div>
  `;
   // Send the email using the existing utility.
  await sendEmail({
    to: user.email,
    subject: `Order ${order._id} Status Updated`,
    html,
  });
};

/*
|--------------------------------------------------------------------------
| Helper: Validate Status Transition
|--------------------------------------------------------------------------
| This prevents invalid transitions such as:
| delivered -> processing
| cancelled -> shipped
|--------------------------------------------------------------------------
*/
const allowedStatusTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
const isValidStatusTransition = (currentStatus, nextStatus) => {
   // Read the allowed next statuses for the current state.
  const allowedStatuses = allowedStatusTransitions[currentStatus] || [];
   // Return true only when the requested transition is allowed.
  return allowedStatuses.includes(nextStatus);
};

/*
|--------------------------------------------------------------------------
| 1. CREATE ORDER
|--------------------------------------------------------------------------
| POST /orders
| Creates a new order using a Mongoose transaction.
| Important:
| The Cart model already deducts stock when products are added.
| Therefore, we DO NOT deduct stock again here.
|--------------------------------------------------------------------------
*/
export const createOrder = async (req, res, next) => {
   // Start a MongoDB session.
  const session = await mongoose.startSession();
  let createdOrder = null;
  let createdPaymentIntent = null;
  try {
     // Start a MongoDB transaction.
    await session.withTransaction(async () => {
       // Get the authenticated user's cart.
      const cart = await Cart.findOne({
        user: req.user._id,
      })
        .populate("items.product")
        .session(session);
       // Stop if the cart does not exist.
      if (!cart) {
        throw new AppError("Cart not found", HTTP_STATUS.NOT_FOUND);
      }
       // Stop if the cart is empty.
      if (!cart.items || cart.items.length === 0) {
        throw new AppError(
          "Cannot create an order from an empty cart",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
       // Make sure every cart product still exists and is active.
      for (const item of cart.items) {
         // The product is populated from MongoDB.
        const product = item.product;
         // Reject deleted/missing products.
        if (!product) {
          throw new AppError(
            `Product for cart item ${item._id} no longer exists`,
            HTTP_STATUS.NOT_FOUND,
          );
        }
         // Reject inactive products.
        if (!product.isActive) {
          throw new AppError(
            `Product "${product.name}" is no longer available`,
            HTTP_STATUS.BAD_REQUEST,
          );
        }
        /*
         * Because the cart reserves stock when adding the item,
         * we only make sure the current stored quantity is valid.
         */
        if (item.quantity < 1) {
          throw new AppError(
            `Invalid quantity for product "${product.name}"`,
            HTTP_STATUS.BAD_REQUEST,
          );
        }
      }
       // Calculate subtotal, shipping, tax, discount, and total.
      const totals = calculateOrderTotals(cart);
      /*
       * Build the order item snapshots.
       * We use the cart data instead of trusting client-sent prices.
       * This is important because prices coming directly from the
       * request body can be manipulated by the client.
       */
      const orderItems = cart.items.map((item) => ({
        /*
         * Preserve the product reference when the OrderItem schema
         * supports it.
         */
        product: item.product._id,
         // Store the product name as a snapshot.
        name: item.name || item.product.name,
         // Store the image as a snapshot.
        image: item.image || item.product.images?.[0]?.url || "",
         // Store the price that was reserved inside the cart.
        price: item.price,
         // Store the ordered quantity.
        quantity: item.quantity,
      }));
       // Create the order document.
      const [order] = await Order.create(
        [
          {
             // Attach the authenticated customer.
            user: req.user._id,
             // Save all purchased item snapshots.
            items: orderItems,
             // Save the shipping address from the validated request.
            shippingAddress: req.body.shippingAddress,
             // Save the selected payment method.
            paymentMethod: req.body.paymentMethod || "cash",
            // New orders start with a pending payment status.
            paymentStatus: "pending",
            // Save all calculated financial values.
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            tax: totals.tax,
            discount: totals.discount,
            totalPrice: totals.totalPrice,
            // Every newly created order starts as pending.
            status: "pending",
            // Save optional customer note.
            customerNote: req.body.customerNote,
          },
        ],
        { session },
      );
      /*
       * Keep the created order outside the transaction callback
       * so we can use it after the transaction is committed.
       */
      createdOrder = order;
      // Clear the cart only AFTER the order has been created.
      cart.items = [];
      // Remove the coupon together with the cart items.
      cart.coupon = undefined;
      // Save the updated cart inside the same transaction.
      await cart.save({ session });
    });
    // At this point the transaction has been committed successfully.
    /*
     * Handle Stripe orders separately.
     * We intentionally create the PaymentIntent AFTER the database
     * transaction because Stripe is an external service and cannot
     * participate in a MongoDB transaction.
     */
    if (createdOrder.paymentMethod === "stripe") {
      // Make sure Stripe is configured.
      if (!stripe) {
        // Mark the payment as failed because Stripe is not configured.
        await Order.findByIdAndUpdate(createdOrder._id, {
          paymentStatus: "failed",
        });

        throw new AppError(
          "Stripe payment is not configured",
          HTTP_STATUS.INTERNAL_ERROR,
        );
      }
      /*
       * Create Stripe PaymentIntent.
       * Stripe expects the amount in the smallest currency unit.
       * For EGP we multiply by 100.
       */
      createdPaymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(createdOrder.totalPrice * 100),
        currency: "egp",
        // Keep Stripe metadata linked to our Order document.
        metadata: {
          orderId: createdOrder._id.toString(),
          userId: req.user._id.toString(),
        },
      });
      // Save the Stripe PaymentIntent ID in our Order document.
      createdOrder.transactionId = createdPaymentIntent.id;
      // Save the updated transaction ID.
      await createdOrder.save();
    }
    // Get the user because the email address is stored in User.
    const user = await User.findById(req.user._id).select("username email");
    /*
     * Send confirmation email after the order transaction succeeds.
     * Email failure should not delete the successful order.
     */
    try {
      await sendOrderConfirmationEmail(createdOrder, user);
    } catch (emailError) {
      /*
       * Log the email error instead of rolling back the already
       * successful order.
       */
      logger.error({
        message: "Failed to send order confirmation email",
        error: emailError,
        orderId: createdOrder._id,
      });
    }
    // Return the created order to the client.
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Order created successfully",
      data: {
        order: createdOrder,
        /*
         * For Stripe, return clientSecret so the frontend can
         * continue with the payment flow.
         * For cash orders this value remains null.
         */
        clientSecret: createdPaymentIntent?.client_secret || null,
      },
    });
  } catch (error) {
    // Pass the error to the global error handler.
    return next(error);
  } finally {
    // Always close the MongoDB session.
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| 2. GET MY ORDERS
|--------------------------------------------------------------------------
| GET /orders/my
|
| Supports:
| ?page=1&limit=10&status=pending
|--------------------------------------------------------------------------
*/

export const getMyOrders = async (req, res, next) => {
  try {
    // Extract pagination values from query parameters.
    const { currentPage, currentLimit, skip } = getPagination(
      req.query.page,
      req.query.limit,
    );
    // Start with the authenticated user's ID.
    const filter = {
      user: req.user._id,
    };
    // Apply the optional status filter.
    if (req.query.status) {
      filter.status = req.query.status;
    }
    // Fetch orders and count the total records in parallel.
    const [orders, totalOrders] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(currentLimit),
      Order.countDocuments(filter),
    ]);
    // Calculate total pages.
    const totalPages = Math.ceil(totalOrders / currentLimit);
    // Return paginated results.
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          totalOrders,
          totalPages,
        },
      },
    });
  } catch (error) {
    // Pass errors to the global error handler.
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 3. GET MY ORDER BY ID
|--------------------------------------------------------------------------
| GET /orders/my/:id
|--------------------------------------------------------------------------
*/
export const getMyOrderById = async (req, res, next) => {
  try {
    // Validate MongoDB ObjectId before querying the database.
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("Invalid order ID", HTTP_STATUS.BAD_REQUEST);
    }
    /*
     * Find the order by both ID and owner.
     * This prevents one customer from opening another customer's order.
     */
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    // Return 404 if no order belongs to the current user.
    if (!order) {
      throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
    }
    // Return the order details.
    return res.status(HTTP_STATUS.OK).json({
      success: true,

      data: {
        order,
      },
    });
  } catch (error) {
    // Pass errors to the global error handler.
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 4. CANCEL MY ORDER
|--------------------------------------------------------------------------
| PATCH /orders/my/:id/cancel
|
| Allowed only when:
| pending
| confirmed
|
| On cancellation, stock is restored.
|--------------------------------------------------------------------------
*/

export const cancelOrder = async (req, res, next) => {
  /*
   * Start a transaction because we update both:
   * 1. Order
   * 2. Product stock
   */
  const session = await mongoose.startSession();
  let cancelledOrder = null;
  try {
    // Start the transaction.
    await session.withTransaction(async () => {
      // Validate order ID before database work.
      if (!mongoose.isValidObjectId(req.params.id)) {
        throw new AppError("Invalid order ID", HTTP_STATUS.BAD_REQUEST);
      }
      // Find the order and verify ownership.
      const order = await Order.findOne({
        _id: req.params.id,
        user: req.user._id,
      }).session(session);
      // Stop when the order doesn't exist.
      if (!order) {
        throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
      }
      // Only pending and confirmed orders may be cancelled.
      if (order.status !== "pending" && order.status !== "confirmed") {
        throw new AppError(
          "Order can only be cancelled while pending or confirmed",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      // Restore the reserved quantity of every ordered product.
      for (const item of order.items) {
        // Use atomic increment to safely restore stock.
        await Product.updateOne(
          {
            _id: item.product,
          },

          {
            $inc: {
              stock: item.quantity,
            },
          },

          {
            session,
          },
        );
      }
      // Change the order status.
      order.status = "cancelled";
      // Save the cancellation timestamp.
      order.cancelledAt = new Date();
      // Save the order inside the transaction.
      await order.save({ session });
      // Expose the updated order outside the transaction callback.
      cancelledOrder = order;
    });
    // Get the customer information for email notification.
    const user = await User.findById(req.user._id).select("username email");
    // Send cancellation notification.
    try {
      await sendOrderStatusEmail(cancelledOrder, user, "pending/confirmed");
    } catch (emailError) {
      /*
       * The order has already been cancelled successfully,
       * so email failure should not undo the database operation.
       */
      logger.error({
        message: "Failed to send cancellation email",
        error: emailError,
        orderId: cancelledOrder._id,
      });
    }
    // Return the cancelled order.
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        order: cancelledOrder,
      },
    });
  } catch (error) {
    // Pass errors to the global error handler.
    return next(error);
  } finally {
    // Always close the transaction session.
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| 5. GET ALL ORDERS - ADMIN
|--------------------------------------------------------------------------
| GET /orders/admin
|
| Supports:
| ?page=1
| ?limit=10
| ?status=pending
| ?paymentMethod=cash
| ?paymentStatus=paid
| ?fromDate=2026-01-01
| ?toDate=2026-01-31
| ?sort=-createdAt
|--------------------------------------------------------------------------
*/

export const getAllOrders = async (req, res, next) => {
  try {
    // Get pagination information.
    const { currentPage, currentLimit, skip } = getPagination(
      req.query.page,
      req.query.limit,
    );
    // Create the base filter.
    const filter = {};
    // Filter by order status.
    if (req.query.status) {
      filter.status = req.query.status;
    }
     // Filter by payment method.
    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }
    // Filter by payment status.
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    // Add date range filtering when provided.
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      // Start date.
      if (req.query.fromDate) {
        filter.createdAt.$gte = new Date(req.query.fromDate);
      }
      // End date.
      if (req.query.toDate) {
        /*
         * Add one day so the provided date includes
         * the full day until 23:59:59.
         */
        const endDate = new Date(req.query.toDate);
        endDate.setDate(endDate.getDate() + 1);
        filter.createdAt.$lt = endDate;
      }
    }
    // Allow only safe sorting fields.
    const allowedSortFields = ["createdAt", "totalPrice", "status"];
    // Get requested sort value.
    let sort = req.query.sort || "-createdAt";
    // Extract the actual field name without "-" sign.
    const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
    // Fallback to createdAt when the field is not allowed.
    if (!allowedSortFields.includes(sortField)) {
      sort = "-createdAt";
    }
    // Fetch orders and count records in parallel.
    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate("user", "username email phone")
        .sort(sort)
        .skip(skip)
        .limit(currentLimit),
      Order.countDocuments(filter),
    ]);
    // Calculate total pages.
    const totalPages = Math.ceil(totalOrders / currentLimit);
    // Return admin order list.
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          totalOrders,
          totalPages,
        },
      },
    });
  } catch (error) {
    // Pass errors to the global error handler.
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 6. GET ADMIN ORDER BY ID
|--------------------------------------------------------------------------
| GET /orders/admin/:id
|--------------------------------------------------------------------------
*/
export const getAdminOrderById = async (req, res, next) => {
  try {
     // Validate the order ID.
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("Invalid order ID", HTTP_STATUS.BAD_REQUEST);
    }
     // Fetch the requested order.
    const order = await Order.findById(req.params.id).populate(
      "user",
      "username email phone",
    );
    // Return 404 if the order does not exist.
    if (!order) {
      throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
    }
    // Return the complete order details.
    return res.status(HTTP_STATUS.OK).json({
      success: true,

      data: {
        order,
      },
    });
  } catch (error) {
    // Pass errors to the global error handler.
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 7. UPDATE ORDER STATUS - ADMIN
|--------------------------------------------------------------------------
| PATCH /orders/admin/:id/status
| Body:
| {
|   "status": "confirmed"
| }
| Every status change sends an automated email.
|--------------------------------------------------------------------------
*/
export const updateOrderStatus = async (req, res, next) => {
  try {
     // Validate the order ID.
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("Invalid order ID", HTTP_STATUS.BAD_REQUEST);
    }
     // Extract the new status from the request.
    const { status } = req.body;
     // Define all allowed order statuses.
    const allowedStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ];
     // Reject unsupported status values.
    if (!allowedStatuses.includes(status)) {
      throw new AppError("Invalid order status", HTTP_STATUS.BAD_REQUEST);
    }
     // Find the order.
    const order = await Order.findById(req.params.id);
     // Return 404 when the order doesn't exist.
    if (!order) {
      throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
    }
     // Keep the old status so we can use it in the email.
    const previousStatus = order.status;
     // Prevent unnecessary duplicate status updates.
    if (previousStatus === status) {
      throw new AppError(
        "Order already has this status",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
     // Validate the lifecycle transition.
    if (!isValidStatusTransition(previousStatus, status)) {
      throw new AppError(
        `Cannot change order status from "${previousStatus}" to "${status}"`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
     // Update the order status. 
    order.status = status;
     // Save delivery timestamp when the order becomes delivered.
    if (status === "delivered") {
      order.deliveredAt = new Date();
    }
     // Save cancellation timestamp when the order is cancelled.
    if (status === "cancelled") {
      order.cancelledAt = new Date();
    }
     // Save the updated order.
    await order.save();
     // Load the customer email information.
    const user = await User.findById(order.user).select("username email");
       // Send status update email.
    try {
      await sendOrderStatusEmail(order, user, previousStatus);
    } catch (emailError) {
       // Keep the status update successful even if email delivery fails.
      logger.error({
        message: "Failed to send order status email",
        error: emailError,
        orderId: order._id,
      });
    }   
     // Return the updated order.
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Order status updated successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    // Pass errors to the global error handler.
    return next(error);
  }
};
