# E-commerce API

Express-based backend for a commerce platform with product catalog management, user authentication, cart and wishlist features, order processing, and admin analytics.

## What it does

This project exposes a REST API for an e-commerce storefront. It handles authentication and session management, product search/listing, cart operations, order creation and status tracking, and administrative dashboards for store management.

The service is built with Express, MongoDB via Mongoose, Redis for session/token support, and payment integrations for Stripe, PayPal, and Paymob.

## Why it's useful

- Secure customer auth with JWT access tokens and refresh-token cookies
- Product browsing with filtering, search, reviews, and image uploads
- Cart management with coupon support and item updates
- Wishlist and user account workflows
- Order lifecycle handling and admin-only analytics endpoints
- Rate limiting, security headers, compressed responses, and request validation

## Getting started

### Prerequisites

- Node.js and npm
- MongoDB instance
- Redis instance
- Cloudinary account for product image uploads
- Payment provider credentials for Stripe, PayPal, and Paymob
- Email provider credentials for OTP and account emails

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a `.env` file in the project root and set the variables used by `src/config/environment.js`.

Required variables include:

```env
NODE_ENV=development
PORT=3000
HOST=localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXP=15m
JWT_REFRESH_EXP_DAYS=7
OTP_TTL=300
CORS_MAX_AGE=86400
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
BREVO_API_KEY=your_brevo_key
BREVO_SENDER_NAME=your_sender_name
BREVO_SENDER_EMAIL=your_sender_email
STRIPE_SECRET_KEY=your_stripe_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID=your_paymob_integration_id
FREE_SHIPPING_THRESHOLD=1000
SHIPPING_FEE=50
TAX_RATE=0.14
```

### Run the app

For local development:

```bash
npm run dev
```

For production:

```bash
npm start
```

The app listens on the configured `PORT` and connects to MongoDB and Redis at startup.

### Health check

```bash
curl http://localhost:3000/api/v1/health
```

Example response:

```json
{
  "status": "OK",
  "timestamp": "2026-09-16T00:00:00.000Z"
}
```

## Project structure

```text
.
├── public/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middlewares/
│   ├── models/
│   ├── redis/
│   ├── routes/
│   ├── utils/
│   ├── validations/
│   ├── views/
│   └── app.js
├── server.js
├── package.json
├── package-lock.json
├── DOCS.md
├── .env
├── docker-compose.yml
├── Dockerfile.yml
└── .dockerignore.yml
```

## API documentation

The repository includes a detailed API reference in [`DOCS.md`](DOCS.md). You can also access the interactive developer portal while the server is running by navigating to /api/v1/docs in your browser.

## Where to get help

- GitHub issues: https://github.com/team-5-backend/e-commerce-api/issues
- API reference: [`DOCS.md`](DOCS.md)
- Source routes: [`src/routes`](src/routes)
- Middleware and auth: [`src/middlewares`](src/middlewares)

## Contributing and maintainers

This repository currently does not include a `CONTRIBUTING.md` or `LICENSE` file, so there is no formal contribution guide or license text checked in yet.

If you want to contribute, start by opening an issue or pull request in the repository and coordinate with the current maintainers through the project’s GitHub issues page.
