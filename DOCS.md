# E-commerce API

REST API for product browsing, account authentication, cart management, wishlists, and order processing for the e-commerce service.

## Base URL and versioning

The server mounts all routes under `/api/v1` in `src/app.js` and `src/routes/index.js`.

- Local default: `http://localhost:5000/api/v1`
- Production host: configured by `HOST` and `PORT` in the environment; no separate API version header is used.
- Versioning is URL-based (`/api/v1/...`), not header-based.

Example:

```bash
curl http://localhost:5000/api/v1/health
```

## Authentication

Authentication is implemented with JWTs:

- Access token: sent in the `Authorization` header as `Bearer <accessToken>`.
- Refresh token: stored in an HTTP-only cookie named `refreshToken`.
- The `authenticate` middleware in `src/middlewares/auth.middleware.js` accepts either a bearer token or a valid refresh cookie. If the access token expires, it automatically refreshes it and reissues a new access token.
- Admin-only routes also require `authorize('admin')`.

Example authentication flow:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
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
  http://localhost:5000/api/v1/auth/me
```

## Quick start

### 1) Register a new customer

```bash
curl -X POST http://localhost:5000/api/v1/auth/register/send-otp \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "jane doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "phone": "+15551234567",
    "role": "customer"
  }'
```

Returns a success message and sends a one-time password to the email address.

### 2) Verify the OTP and complete registration

```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
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
  'http://localhost:5000/api/v1/products?page=1&limit=10&sort=newest'
```

Example response:

```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "data": [
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

### Authentication

| Method   | Path                              | Description                                             | Auth              |
| -------- | --------------------------------- | ------------------------------------------------------- | ----------------- |
| `POST`   | `/auth/login`                     | Sign in and return an access token                      | No                |
| `POST`   | `/auth/register/send-otp`         | Send registration OTP to an email                       | No                |
| `POST`   | `/auth/verify-otp`                | Verify registration OTP and create the account          | No                |
| `POST`   | `/auth/forgotpassword/send-otp`   | Send reset-password OTP                                 | No                |
| `POST`   | `/auth/forgotpassword/verify-otp` | Reset the password after OTP verification               | No                |
| `POST`   | `/auth/logout`                    | Revoke the current session and clear the refresh cookie | Yes               |
| `POST`   | `/auth/logout-all`                | Revoke all sessions for the current user                | Yes               |
| `POST`   | `/auth/refresh`                   | Exchange the refresh cookie for a new access token      | No (cookie-based) |
| `GET`    | `/auth/sessions`                  | List active sessions for the current user               | Yes               |
| `GET`    | `/auth/me`                        | Get the current user profile                            | Yes               |
| `DELETE` | `/auth/sessions/:sessionId`       | Revoke one user session                                 | Yes               |

Request body for login:

```json
{
  "email": "customer@example.com",
  "password": "Password123!"
}
```

Request body for registration OTP:

```json
{
  "username": "jane doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "phone": "+15551234567",
  "role": "customer"
}
```

### Products

| Method   | Path                              | Description                                        | Auth          |
| -------- | --------------------------------- | -------------------------------------------------- | ------------- |
| `GET`    | `/products/search`                | Search active products                             | No            |
| `GET`    | `/products`                       | List active products with filtering and pagination | No            |
| `GET`    | `/products/:id`                   | Get a single active product by ID                  | No            |
| `GET`    | `/products/:id/reviews`           | List reviews on a product                          | No            |
| `POST`   | `/products`                       | Create a product                                   | Admin         |
| `PATCH`  | `/products/:id`                   | Update a product                                   | Admin         |
| `DELETE` | `/products/:id`                   | Delete a product                                   | Admin         |
| `POST`   | `/products/:id/reviews`           | Add a customer review                              | Authenticated |
| `DELETE` | `/products/:id/reviews/:reviewId` | Delete a product review                            | Authenticated |

Allowed query parameters for `GET /products`:

| Name       | Type    | Required | Description                                      |
| ---------- | ------- | -------- | ------------------------------------------------ |
| `page`     | integer | No       | Page number, default `1`                         |
| `limit`    | integer | No       | Results per page, default `10`, max `100`        |
| `category` | string  | No       | Product category                                 |
| `brand`    | string  | No       | Brand filter                                     |
| `minPrice` | number  | No       | Minimum price                                    |
| `maxPrice` | number  | No       | Maximum price                                    |
| `sort`     | string  | No       | `price-asc`, `price-desc`, `rating`, or `newest` |

Example product creation request:

```json
{
  "name": "Wireless Headphones",
  "shortDescription": "Noise cancelling bluetooth headphones",
  "description": "Premium wireless headphones with a 30-hour battery life.",
  "price": 129.99,
  "discountPrice": 99.99,
  "stock": 25,
  "sku": "WH-2201",
  "category": "electronics",
  "subcategory": "audio",
  "brand": "AudioMax",
  "tags": ["bluetooth", "audio", "wireless"],
  "featured": true,
  "isActive": true,
  "images": [
    {
      "public_id": "products/abc123",
      "url": "https://example.com/images/headphones.jpg"
    }
  ]
}
```

### Carts

| Method   | Path               | Description                 | Auth |
| -------- | ------------------ | --------------------------- | ---- |
| `GET`    | `/carts`           | Get the current user's cart | Yes  |
| `POST`   | `/carts/items`     | Add an item to the cart     | Yes  |
| `PATCH`  | `/carts/items`     | Update a cart item          | Yes  |
| `DELETE` | `/carts/items/:id` | Remove one cart item        | Yes  |
| `DELETE` | `/carts/clear`     | Clear the cart              | Yes  |
| `POST`   | `/carts/coupon`    | Apply a coupon              | Yes  |
| `DELETE` | `/carts/coupon`    | Remove the active coupon    | Yes  |

Example add-to-cart payload:

```json
{
  "productId": "67d5e2b3d9a711c43b1d9a4d",
  "quantity": 1
}
```

### Wishlists

| Method   | Path                    | Description                        | Auth |
| -------- | ----------------------- | ---------------------------------- | ---- |
| `GET`    | `/wishlists/my`         | Get the current user's wishlist    | Yes  |
| `POST`   | `/wishlists/add/:id`    | Add a product to the wishlist      | Yes  |
| `DELETE` | `/wishlists/remove/:id` | Remove a product from the wishlist | Yes  |
| `DELETE` | `/wishlists/clear`      | Clear the wishlist                 | Yes  |

### Orders

| Method  | Path                       | Description                        | Auth         |
| ------- | -------------------------- | ---------------------------------- | ------------ |
| `POST`  | `/orders`                  | Create an order                    | Yes          |
| `GET`   | `/orders/my`               | List current user's orders         | Yes          |
| `GET`   | `/orders/my/:id`           | Get one order for the current user | Yes          |
| `PATCH` | `/orders/my/:id/cancel`    | Cancel an order                    | Yes          |
| `GET`   | `/orders/admin`            | List all orders (admin)            | Admin        |
| `GET`   | `/orders/admin/:id`        | Get order details by ID (admin)    | Admin        |
| `PATCH` | `/orders/admin/:id/status` | Update order status (admin)        | Admin        |
| `GET`   | `/orders/admin/dashboard`  | Get admin order dashboard summary  | Admin        |
| `GET`   | `/orders/admin/carts`      | Get active carts (admin)           | Admin        |
| `POST`  | `/orders/webhook/stripe`   | Stripe webhook endpoint            | No / webhook |
| `POST`  | `/orders/webhook/paypal`   | PayPal webhook endpoint            | No / webhook |
| `POST`  | `/orders/webhook/paymob`   | Paymob webhook endpoint            | No / webhook |

Create-order request body:

```json
{
  "shippingAddress": {
    "country": "United Arab Emirates",
    "city": "Dubai",
    "address": "Business Bay, Tower 1",
    "postalCode": "12345"
  },
  "paymentMethod": "cash"
}
```

Supported payment methods from validation: `cash`, `stripe`, `paypal`, `paymob`.

### Users

| Method   | Path         | Description                  | Auth          |
| -------- | ------------ | ---------------------------- | ------------- |
| `GET`    | `/users/all` | List all users (admin)       | Admin         |
| `POST`   | `/users/add` | Create a user record (admin) | Admin         |
| `GET`    | `/users/:id` | Get a user by ID (admin)     | Admin         |
| `PATCH`  | `/users/:id` | Update a user                | Authenticated |
| `DELETE` | `/users/:id` | Delete a user (admin)        | Admin         |

Create user payload:

```json
{
  "username": "jane doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "phone": "+15551234567",
  "role": "customer",
  "addresses": {
    "country": "United Arab Emirates",
    "city": "Dubai",
    "address": "Downtown Road 7",
    "postalCode": "00000"
  }
}
```

### Admin summaries

| Method | Path                     | Description                     | Auth  |
| ------ | ------------------------ | ------------------------------- | ----- |
| `GET`  | `/admin/dashboard`       | Admin dashboard analytics       | Admin |
| `GET`  | `/admin/carts`           | List active carts               | Admin |
| `GET`  | `/admin/wishlists`       | List user wishlists             | Admin |
| `GET`  | `/admin/wishlists/stats` | Top wishlisted products summary | Admin |

## Error format and common status codes

The API responds with either a success envelope or an error envelope:

Success:

```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "data": [],
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
