# E-commerce API

REST API for product browsing, account authentication, cart management, wishlists, and order processing for the e-commerce service.

## Base URL and versioning

The server mounts all routes under `/api/v1` in `src/app.js` and `src/routes/index.js`.

- Local default: `http://localhost:3000/api/v1`
- Production host: configured by `HOST` and `PORT` in the environment; no separate API version header is used.
- Versioning is URL-based (`/api/v1/...`), not header-based.

Example:

```bash
curl http://localhost:3000/api/v1/health
```

## Authentication

Authentication is implemented with JWTs:

- Access token: sent in the `Authorization` header as `Bearer <accessToken>`.
- Refresh token: stored in an HTTP-only cookie named `refreshToken`.
- The `authenticate` middleware in `src/middlewares/auth.middleware.js` accepts either a bearer token or a valid refresh cookie. If the access token expires, it automatically refreshes it and reissues a new access token.
- Admin-only routes also require `authorize('admin')`.

Example authentication flow:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "customer@example.com",
    "password": "Password123!"
  }'
```

Successful login response:

```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

Then use the token on protected routes:

```bash
curl -H 'Authorization: Bearer <accessToken>' \
  http://localhost:3000/api/v1/auth/me
```

## Quick start

### 1) Register a new customer

```bash
curl -X POST http://localhost:3000/api/v1/auth/register/send-otp \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "jane doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "phone": "+15551234567"
  }'
```

Returns a success message and sends a one-time password to the email address.

### 2) Verify the OTP and complete registration

```bash
curl -X POST http://localhost:3000/api/v1/auth/register/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "jane@example.com",
    "otp": "123456"
  }'
```

Example response:

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "_id": "67a8a6f4a1b23d441b1dd1d0",
    "username": "jane doe",
    "email": "jane@example.com"
  }
}
```

### 3) List products

```bash
curl -H 'Authorization: Bearer <accessToken>' \
  'http://localhost:3000/api/v1/products?page=1&limit=10&sort=newest'
```

Example response:

```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "products": [
      {
        "_id": "67d5e2b3d9a711c43b1d9a4d",
        "name": "Wireless Headphones",
        "slug": "wireless-headphones",
        "shortDescription": "Noise cancelling bluetooth headphones",
        "description": "Premium wireless headphones with 30-hour battery life.",
        "price": 129.99,
        "discountPrice": 99.99,
        "stock": 25,
        "sku": "WH-2201",
        "category": "electronics",
        "brand": "AudioMax",
        "tags": ["bluetooth", "audio"],
        "images": [
          {
            "public_id": "products/abc123",
            "url": "https://example.com/images/headphones.jpg"
          }
        ],
        "averageRating": 4.8,
        "numReviews": 21,
        "featured": true,
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "pages": 5
    }
  }
}
```

## Endpoint reference

All paths below are relative to `/api/v1`. Every JSON response uses the common envelope
`{ "success": true, "message": "...", "data": ... }` unless noted otherwise. MongoDB IDs
are 24-character hexadecimal strings.

### Health

#### `GET /health`

No authentication or parameters.

Response `200`:

```json
{
  "status": "OK",
  "timestamp": "2026-09-16T19:00:00.000Z"
}
```

### Authentication

#### `POST /auth/login`

Authentication: none. Sets the HTTP-only `refreshToken` cookie.

Body:

| Field      | Type   | Required | Description   |
| ---------- | ------ | -------: | ------------- |
| `email`    | string |      Yes | User email    |
| `password` | string |      Yes | User password |

```json
{ "email": "customer@example.com", "password": "Password123!" }
```

Response `200`:

```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": { "accessToken": "<JWT_ACCESS_TOKEN>" }
}
```

#### `POST /auth/register/send-otp`

Authentication: none. Sends a registration OTP by email.

Body: `username` (string, required), `email` (string, required), `password` (string, required),
`phone` (string, required), optional `role` (`admin` or `customer`, default `customer`),
optional `addresses` (object), and optional `isVerified` (boolean).

```json
{
  "username": "jane doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "phone": "+15551234567"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "If an account exists, a password reset code has been sent to the email address provided."
}
```

#### `POST /auth/register/verify-otp`

Authentication: none. Verifies the registration OTP, creates the account, and sets
`refreshToken`.

Body: `email` (string, required) and `otp` (string, required).

```json
{ "email": "jane@example.com", "otp": "123456" }
```

Response `201`:

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "accessToken": "<JWT_ACCESS_TOKEN>",
    "_id": "67a8a6f4a1b23d441b1dd1d0",
    "username": "jane doe",
    "email": "jane@example.com"
  }
}
```

#### `POST /auth/forgotpassword/send-otp`

Authentication: none. Sends a password-reset OTP when the email exists.

Body: `email` (string, required).

```json
{ "email": "jane@example.com" }
```

Response `200`:

```json
{
  "success": true,
  "message": "If an account exists, a password reset code has been sent to the email address provided."
}
```

#### `POST /auth/forgotpassword/verify-otp`

Authentication: none. Resets the password, revokes prior sessions, and sets a new
`refreshToken`.

Body: `email` (string, required), `otp` (string, required), and `newPassword` (string, required).

```json
{
  "email": "jane@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123!"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Password reset successfully.",
  "data": {
    "_id": "67a8a6f4a1b23d441b1dd1d0",
    "username": "jane doe",
    "email": "jane@example.com",
    "accessToken": "<JWT_ACCESS_TOKEN>"
  }
}
```

#### `POST /auth/logout`

Authentication: bearer access token or refresh cookie. No body or query parameters.

Response `200`:

```json
{ "success": true, "message": "Logged out successfully." }
```

#### `POST /auth/logout-all`

Authentication: bearer access token or refresh cookie. No body or query parameters.

Response `200`:

```json
{ "success": true, "message": "Logged out from all devices successfully." }
```

#### `POST /auth/refresh`

Authentication: refresh cookie named `refreshToken`; no body or query parameters.

Response `200`:

```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": { "accessToken": "<NEW_JWT_ACCESS_TOKEN>" }
}
```

#### `GET /auth/sessions`

Authentication: bearer access token or refresh cookie. No inputs.

Response `200`:

```json
{
  "success": true,
  "message": "Active sessions retrieved successfully.",
  "data": [
    {
      "sessionId": "6f1d2d2a-3c3a-4f5e-8c1d-123456789abc",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0",
      "createdAt": "2026-09-16T19:00:00.000Z"
    }
  ]
}
```

#### `GET /auth/me`

Authentication: bearer access token or refresh cookie. No inputs.

Response `200`:

```json
{
  "success": true,
  "message": "User profile retrieved successfully.",
  "data": {
    "_id": "67a8a6f4a1b23d441b1dd1d0",
    "username": "jane doe",
    "email": "jane@example.com",
    "role": "customer",
    "isVerified": true
  }
}
```

#### `DELETE /auth/sessions/:sessionId`

Authentication: bearer access token or refresh cookie.

Path parameter: `sessionId` (UUID v4, required).

Response `200`:

```json
{ "success": true, "message": "Session revoked successfully." }
```

### Products

#### `GET /products` and `GET /products/search`

Authentication: none.

Query parameters (all optional):

- `page` (integer, default `1`)
- `limit` (integer `1-100`, default `10`)
- `query` (string)
- `tags` (comma-separated string)
- `category` (string)
- `subcategory` (string)
- `brand` (string)
- `minPrice` (number)
- `maxPrice` (number)
- `sort` (`newest`, `oldest`, `price-asc`, `price-desc`, `rating-asc`, `rating-desc`, default `newest`)

Example: `GET /products/search?query=headphones&category=electronics&tags=bluetooth,audio&minPrice=50&sort=price-asc`

Response `200`:

```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "products": [
      {
        "_id": "67d5e2b3d9a711c43b1d9a4d",
        "name": "Wireless Headphones",
        "slug": "wireless-headphones",
        "shortDescription": "Noise cancelling bluetooth headphones",
        "description": "Premium wireless headphones.",
        "price": 129.99,
        "discountPrice": 99.99,
        "stock": 25,
        "sku": "WH-2201",
        "images": [
          {
            "public_id": "products/abc123",
            "url": "[https://example.com/image.jpg](https://example.com/image.jpg)"
          }
        ],
        "category": "electronics",
        "subcategory": "audio",
        "brand": "AudioMax",
        "tags": ["bluetooth", "audio"],
        "averageRating": 4.8,
        "numReviews": 21,
        "featured": true,
        "isActive": true
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
  }
}
```

#### `GET /products/:id`

Authentication: none. Path parameter `id` (MongoDB ObjectId, required).

Response `200`:

```json
{
  "success": true,
  "message": "Product retrieved successfully.",
  "data": {
    "_id": "67d5e2b3d9a711c43b1d9a4d",
    "name": "Wireless Headphones",
    "price": 129.99,
    "discountPrice": 99.99,
    "stock": 25,
    "category": "electronics",
    "images": [{ "public_id": "products/abc123", "url": "https://example.com/image.jpg" }],
    "averageRating": 4.8,
    "numReviews": 21,
    "isActive": true
  }
}
```

#### `GET /products/:id/reviews`

Authentication: none. Path parameter `id` (MongoDB ObjectId, required). Query parameters:
optional `page` (integer, default `1`) and `limit` (integer, default `10`).

Response `200`:

```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "reviews": [
      {
        "_id": "67d5e2b3d9a711c43b1d9a50",
        "user": { "_id": "67a8a6f4a1b23d441b1dd1d0", "username": "jane doe" },
        "rating": 5,
        "comment": "Great sound quality."
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
  }
}
```

#### `POST /products`

Authentication: admin bearer token. Content type may be `multipart/form-data` with up to five
`images` files, or JSON with an `images` array. Body fields: required `name`, `shortDescription`,
`description`, `price`, `stock`, `category`, and `images`; optional `discountPrice`, `sku`,
`subcategory`, `brand`, `tags` (array or comma-separated string), `featured`, and `isActive`.

Response `201`:

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "67d5e2b3d9a711c43b1d9a4d",
    "name": "Wireless Headphones",
    "price": 129.99,
    "stock": 25,
    "category": "electronics",
    "images": [{ "public_id": "products/abc123", "url": "https://example.com/image.jpg" }]
  }
}
```

#### `PATCH /products/:id`

Authentication: admin bearer token. Path parameter `id` (MongoDB ObjectId, required).
Content type may be `multipart/form-data` with up to five new `images` files, or JSON.
At least one product field, new image, or `deleteImageIds` is required. `deleteImageIds` is an
array or comma-separated string of existing Cloudinary public IDs; the product must retain an
image. The other body fields match `POST /products`, but are optional.

Response `200`:

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "67d5e2b3d9a711c43b1d9a4d",
    "name": "Wireless Headphones - Updated",
    "price": 119.99,
    "images": [{ "public_id": "products/abc123", "url": "https://example.com/image.jpg" }]
  }
}
```

#### `DELETE /products/:id`

Authentication: admin bearer token. Path parameter `id` (MongoDB ObjectId, required). No body.

Response `200`:

```json
{ "success": true, "message": "Product deleted successfully" }
```

#### `POST /products/:id/reviews`

Authentication: bearer access token or refresh cookie. Path parameter `id` (MongoDB ObjectId).
Body: `rating` (integer `1-5`, required) and `comment` (string, 1-1000 characters, required).

```json
{ "rating": 5, "comment": "Great sound quality." }
```

Response `201`:

```json
{
  "success": true,
  "message": "Review added successfully",
  "data": {
    "review": {
      "_id": "67d5e2b3d9a711c43b1d9a50",
      "rating": 5,
      "comment": "Great sound quality."
    },
    "averageRating": 5,
    "numReviews": 1
  }
}
```

#### `DELETE /products/:id/reviews/:reviewId`

Authentication: bearer access token or refresh cookie. Path parameters `id` and `reviewId`
(MongoDB ObjectIds). No body.

Response `200`:

```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": { "averageRating": 4.5, "numReviews": 2 }
}
```

### Carts

All cart routes require authentication.

#### `GET /carts`

No inputs.

Response `200`:

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "_id": "67d5e2b3d9a711c43b1da00",
    "user": "67a8a6f4a1b23d441b1dd1d0",
    "items": [],
    "discountAmount": 0
  }
}
```

#### `POST /carts/items`

Body: `items` (non-empty array, required). Each item contains `productId` (MongoDB ObjectId,
required) and `quantity` (integer >= 1, required).

```json
{ "items": [{ "productId": "67d5e2b3d9a711c43b1d9a4d", "quantity": 2 }] }
```

Response `201`: `{ "success": true, "message": "Items added to cart successfully", "data": { "_id": "67d5e2b3d9a711c43b1da00", "items": [{ "product": "67d5e2b3d9a711c43b1d9a4d", "quantity": 2, "price": 99.99 }], "discountAmount": 0 } }`.

#### `PATCH /carts/items`

Body has the same `items` shape as `POST /carts/items`; each item replaces the current quantity.

Response `200`: `{ "success": true, "message": "Cart items updated successfully", "data": { "_id": "67d5e2b3d9a711c43b1da00", "items": [{ "product": "67d5e2b3d9a711c43b1d9a4d", "quantity": 2, "price": 99.99 }], "discountAmount": 0 } }`.

#### `DELETE /carts/items/:id`

Path parameter `id` is the product MongoDB ObjectId. No body or query parameters.

Response `200`: `{ "success": true, "message": "Cart item removed successfully", "data": { "_id": "67d5e2b3d9a711c43b1da00", "items": [], "discountAmount": 0 } }`.

#### `DELETE /carts/clear`

No body or query parameters.

Response `200`: `{ "success": true, "message": "Cart cleared successfully", "data": { "_id": "67d5e2b3d9a711c43b1da00", "items": [], "discountAmount": 0 } }`.

#### `POST /carts/coupon`

Body: `code` (required enum: `SAVE10`, `SAVE20`, `SAVE50`, `SAVE80`, or `OFF50`).

```json
{ "code": "SAVE10" }
```

Response `200`: `{ "success": true, "message": "Coupon applied successfully", "data": { "_id": "67d5e2b3d9a711c43b1da00", "items": [], "coupon": { "code": "SAVE10", "discountType": "percentage", "discountValue": 10 }, "discountAmount": 0 } }`.

#### `DELETE /carts/coupon`

No body or query parameters.

Response `200`: `{ "success": true, "message": "Coupon removed successfully", "data": { "_id": "67d5e2b3d9a711c43b1da00", "items": [], "discountAmount": 0 } }`.

### Wishlists

All wishlist routes require authentication.

#### `GET /wishlists/my`

No inputs. Response `200`:

```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": {
    "_id": "67d5e2b3d9a711c43b1da10",
    "user": "67a8a6f4a1b23d441b1dd1d0",
    "products": [{ "_id": "67d5e2b3d9a711c43b1d9a4d", "name": "Wireless Headphones" }]
  }
}
```

#### `POST /wishlists/add/:id`

Path parameter `id` is the product MongoDB ObjectId. No body.

Response `200`: `{ "success": true, "message": "Product added to wishlist successfully", "data": { "_id": "67d5e2b3d9a711c43b1da10", "products": [{ "_id": "67d5e2b3d9a711c43b1d9a4d", "name": "Wireless Headphones" }] } }`.

#### `DELETE /wishlists/remove/:id`

Path parameter `id` is the product MongoDB ObjectId. No body.

Response `200`: `{ "success": true, "message": "Product removed from wishlist successfully", "data": { "_id": "67d5e2b3d9a711c43b1da10", "products": [] } }`.

#### `DELETE /wishlists/clear`

No body or query parameters.

Response `200`: `{ "success": true, "message": "Wishlist cleared successfully", "data": { "_id": "67d5e2b3d9a711c43b1da10", "products": [] } }`.

### Orders

#### `POST /orders`

Authentication: bearer access token or refresh cookie.

Body: required `shippingAddress` object containing `country`, `city`, `address`, and
`postalCode` strings. Optional `paymentMethod` is `cash`, `stripe`, `paypal`, or `paymob`
(default `cash`). The optional `customerNote` is also stored by the controller.

```json
{
  "shippingAddress": {
    "country": "Egypt",
    "city": "Cairo",
    "address": "10 Example Street",
    "postalCode": "11511"
  },
  "paymentMethod": "cash",
  "customerNote": "Please call on delivery."
}
```

Response `201` for cash:

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "_id": "67d5e2b3d9a711c43b1da20",
      "paymentMethod": "cash",
      "paymentStatus": "pending",
      "status": "pending",
      "subtotal": 199.98,
      "shippingFee": 50,
      "tax": 28,
      "discount": 0,
      "totalPrice": 277.98,
      "items": []
    }
  }
}
```

For `stripe`, `paypal`, or `paymob`, the same response also contains one gateway field:
`clientSecret`, `paypalApprovalUrl`, or `paymobPaymentToken`, and the message is
`"Payment initialization successful"`.

#### `GET /orders/my`

Authentication: bearer access token or refresh cookie. Query parameters: optional `page`
(integer, default `1`), `limit` (integer, default `10`, maximum `100`), and `status` (order
status string).

Response `200`:

```json
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": {
    "orders": [{ "_id": "67d5e2b3d9a711c43b1da20", "status": "pending", "totalPrice": 277.98 }],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalOrders": 1,
      "totalPages": 1
    }
  }
}
```

#### `GET /orders/my/:id`

Authentication: bearer access token or refresh cookie. Path parameter `id` is an order
MongoDB ObjectId. No body or query parameters.

Response `200`: `{ "success": true, "message": "Order fetched successfully", "data": { "order": { "_id": "67d5e2b3d9a711c43b1da20", "status": "pending", "paymentMethod": "cash", "totalPrice": 277.98, "items": [] } } }`.

#### `PATCH /orders/my/:id/cancel`

Authentication: bearer access token or refresh cookie. Path parameter `id` is an order
MongoDB ObjectId. No body.

Response `200`: `{ "success": true, "message": "Order cancelled successfully", "data": { "order": { "_id": "67d5e2b3d9a711c43b1da20", "status": "cancelled", "cancelledAt": "2026-09-16T19:00:00.000Z" } } }`.

#### `GET /orders/admin`

Authentication: admin bearer token. Query parameters: optional `page`, `limit` (both default
to `1` and `10`, with limit capped at `100`), `status`, and `paymentMethod`.

Response `200`: `{ "success": true, "message": "All orders fetched successfully", "data": { "orders": [{ "_id": "67d5e2b3d9a711c43b1da20", "status": "pending", "totalPrice": 277.98 }], "pagination": { "page": 1, "limit": 10, "totalOrders": 1, "totalPages": 1 } } }`.

#### `GET /orders/admin/:id`

Authentication: admin bearer token. Path parameter `id` is an order MongoDB ObjectId. No body.

Response `200`: `{ "success": true, "message": "Order details fetched successfully", "data": { "order": { "_id": "67d5e2b3d9a711c43b1da20", "status": "pending", "user": { "_id": "67a8a6f4a1b23d441b1dd1d0", "username": "jane doe", "email": "jane@example.com" } } } }`.

#### `PATCH /orders/admin/:id/status`

Authentication: admin bearer token. Path parameter `id` is an order MongoDB ObjectId.
Body accepts optional `status` and `adminNote`. Valid forward status transitions are
`pending -> confirmed -> processing -> shipped -> delivered -> returned`; `cancelled` and
`returned` are terminal.

```json
{ "status": "confirmed", "adminNote": "Payment verified." }
```

Response `200`:

```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": { "order": { "_id": "67d5e2b3d9a711c43b1da20", "status": "confirmed" } }
}
```

#### `GET /orders/admin/dashboard`

Authentication: admin bearer token. No inputs.

Response `200`:

```json
{
  "success": true,
  "message": "Dashboard stats fetched successfully",
  "data": {
    "totalOrders": 42,
    "totalRevenue": 12500,
    "statusCounts": [{ "_id": "pending", "count": 4 }]
  }
}
```

#### `GET /orders/admin/carts`

Authentication: admin bearer token. No inputs.

Response `200`: `{ "success": true, "message": "Carts fetched successfully", "data": { "carts": [{ "_id": "67d5e2b3d9a711c43b1da00", "items": [] }] } }`.

#### `POST /orders/webhook/stripe`

No application authentication. Send the Stripe event JSON as the raw request body. In
production, include the `stripe-signature` header. Response `200`:

```json
{ "received": true }
```

#### `POST /orders/webhook/paypal`

No application authentication. Send the PayPal event JSON as the request body. In production,
include the PayPal transmission signature headers. Response `200`:

```json
{ "received": true }
```

#### `POST /orders/webhook/paymob`

No application authentication. Send the Paymob event JSON as the request body and provide the
HMAC in the `hmac` query parameter or header when production verification is enabled.
Response `200`:

```json
{ "received": true }
```

### Users

All user routes require authentication. Admin authorization is noted per route.

#### `GET /users/all`

Authentication: admin bearer token. No inputs.

Response `200`:

```json
{
  "success": true,
  "message": "Users retrieved successfully.",
  "data": [
    {
      "_id": "67a8a6f4a1b23d441b1dd1d0",
      "username": "jane doe",
      "email": "jane@example.com",
      "role": "customer",
      "isVerified": true
    }
  ]
}
```

#### `POST /users/add`

Authentication: admin bearer token. Content type may be `multipart/form-data` with one
`avatar` file or JSON. Body fields: required `username`, `email`, `password`, and `phone`;
optional `role`, `addresses`, and `isVerified`.

```json
{
  "username": "jane doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "phone": "+15551234567",
  "role": "customer",
  "addresses": {
    "country": "Egypt",
    "city": "Cairo",
    "address": "10 Example Street",
    "postalCode": "11511"
  }
}
```

Response `201`: `{ "success": true, "message": "User created successfully.", "data": { "_id": "67a8a6f4a1b23d441b1dd1d0", "username": "jane doe", "email": "jane@example.com", "role": "customer" } }`.

#### `GET /users/:id`

Authentication: admin bearer token. Path parameter `id` is a user MongoDB ObjectId. No body.

Response `200`: `{ "success": true, "message": "User retrieved successfully.", "data": { "_id": "67a8a6f4a1b23d441b1dd1d0", "username": "jane doe", "email": "jane@example.com", "role": "customer" } }`.

#### `PATCH /users/:id`

Authentication: bearer access token or refresh cookie. The user may update their own record;
admins may update any user and may also change `role` and `isVerified`. Path parameter `id` is
a user MongoDB ObjectId. Content type may be `multipart/form-data` with one `avatar` file or
JSON. All body fields are optional: `username`, `email`, `password`, `phone`, `addresses`,
`role`, and `isVerified` (password is validated but is not applied by this controller).

Response `200`: `{ "success": true, "message": "User updated successfully.", "data": { "_id": "67a8a6f4a1b23d441b1dd1d0", "username": "jane doe", "email": "jane@example.com", "role": "customer" } }`.

#### `DELETE /users/:id`

Authentication: admin bearer token. Path parameter `id` is a user MongoDB ObjectId. No body.

Response `200`:

```json
{ "success": true, "message": "User deleted successfully." }
```

### Admin summaries

All admin summary routes require an admin bearer token.

#### `GET /admin/dashboard`

No inputs. Response `200`:

```json
{
  "success": true,
  "message": "Dashboard analytics retrieved successfully",
  "data": {
    "revenue": {
      "total": 12500,
      "currentMonth": 2000,
      "lastMonth": 1800,
      "growthPercentage": 11.11
    },
    "ordersByStatus": [{ "_id": "delivered", "count": 12 }],
    "topProducts": [{ "name": "Wireless Headphones", "unitsSold": 10, "revenue": 999.9 }],
    "last7Days": [{ "_id": "2026-09-16", "dailyRevenue": 200, "dailyOrders": 2 }],
    "recentOrders": [],
    "totalCustomers": 25
  }
}
```

#### `GET /admin/carts`

Query parameters: optional `page` (default `1`) and `limit` (default `10`, maximum `100`).

Response `200`:

```json
{
  "success": true,
  "message": "Active carts retrieved successfully",
  "data": {
    "carts": [],
    "pagination": { "page": 1, "limit": 10, "totalCarts": 0, "totalPages": 0 }
  }
}
```

#### `GET /admin/wishlists`

Query parameters: optional `page` (default `1`) and `limit` (default `10`, maximum `100`).

Response `200`:

```json
{
  "success": true,
  "message": "User wishlists retrieved successfully",
  "data": {
    "wishlists": [],
    "pagination": { "page": 1, "limit": 10, "totalWishlists": 0, "totalPages": 0 }
  }
}
```

#### `GET /admin/wishlists/stats`

No inputs. Response `200`:

```json
{
  "success": true,
  "message": "Top wishlisted products retrieved successfully",
  "data": {
    "topWishlisted": [
      {
        "wishlistCount": 8,
        "product": {
          "_id": "67d5e2b3d9a711c43b1d9a4d",
          "name": "Wireless Headphones",
          "price": 129.99,
          "images": [],
          "category": "electronics",
          "isActive": true
        }
      }
    ]
  }
}
```

## Error format and common status codes

The API responds with either a success envelope or an error envelope:

Success:

```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "products": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "pages": 0
    }
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Invalid token. Please log in."
}
```

Development mode additionally includes `stack` on errors.

Common status codes used by the project:

- `200 OK`: standard successful read/update response.
- `201 Created`: successful resource creation.
- `400 Bad Request`: invalid payload, invalid ID, or validation failure.
- `401 Unauthorized`: no token, expired token, or invalid refresh token.
- `403 Forbidden`: authenticated user lacks admin or role privileges.
- `404 Not Found`: resource missing.
- `409 Conflict`: duplicate resource/state conflict (where implemented by the app logic).
- `422 Unprocessable Entity`: data validation or request-shape issues (used by some app flows).
- `429 Too Many Requests`: rate-limit protection.
- `500 Internal Server Error`: server or upstream failure.

## Rate limits

The app uses `express-rate-limit` in two places:

- Global limiter: `100 requests / 15 minutes` per IP for the app as a whole.
- Auth-specific limiter: `5 requests / 15 minutes` per IP for login and OTP flows.

This is configured in `src/app.js` and `src/controllers/auth.controller.js`.

## Where to get help

- API route definitions: [`src/routes`](src/routes)
- Request handlers: [`src/controllers`](src/controllers)
- Authentication and authorization middleware: [`src/middlewares/auth.middleware.js`](src/middlewares/auth.middleware.js)
- Validation schemas: [`src/validations`](src/validations)
- Runtime config: [`src/config/environment.js`](src/config/environment.js)

If this is a local deployment, start the service with:

```bash
npm install
npm run dev
```

## Changelog and versioning reference

This project does not currently expose a separate changelog or generated OpenAPI/Swagger document in the repository. The active version is the URL-based `/api/v1` route group defined in the app source. For the latest contract, review the route files and validation schemas in the repository.
