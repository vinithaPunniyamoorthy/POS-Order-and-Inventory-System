# POS Order & Inventory System

A full-stack point-of-sale and inventory management application built with a React frontend, an Express + TypeScript backend, and PostgreSQL. The application covers product browsing, cart checkout, reservation-based inventory control, payment simulation, cancellation, refunds, and order history.

## Live Demo

Frontend: Not deployed in this environment yet. No public URL has been verified.

Backend: Not deployed in this environment yet. No public API URL has been verified.

Swagger / API docs: Not deployed in this environment yet.

> This repository does not contain a verified live deployment URL. A URL was not added as a placeholder.

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Axios
- React Router DOM

### Backend

- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- JWT authentication
- Zod validation
- Helmet and CORS
- Swagger UI

### Database

- PostgreSQL 16
- Prisma migrations

### DevOps

- Docker
- Docker Compose
- Jest
- Supertest

## Architecture

Frontend
↓
React app
↓
REST API (Express + TypeScript)
↓
Prisma + PostgreSQL

Key behaviors in this project:

- Authentication is JWT-based using `Authorization: Bearer <token>`.
- Roles are `ADMIN` and `CASHIER`.
- Inventory reservations are created on checkout and expire after 5 minutes.
- Payment simulation supports `SUCCESS`, `FAILED`, and `TIMEOUT` outcomes.
- Stock movements track reservation, release, sale, and restock actions.
- Orders maintain status history so lifecycle changes are auditable.

## Features

- Product catalog and listing
- Search by product name or SKU
- Inventory availability calculation
- Cart creation and item management
- Checkout with stock reservation
- Reservation expiry and automatic release
- Mock payment processing
- Payment failure handling
- Payment timeout handling
- Duplicate payment protection
- Order cancellation
- Refund flow and duplicate refund protection
- Order history tracking
- JWT-based login and role checks
- PostgreSQL integrity constraints for stock and pricing

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 16
- Docker and Docker Compose
- Git

## Clone Repository

```bash
git clone <repository-url>
cd "POS Order and Inventory System"
```

## Environment Variables

Create a local environment file before running the app.

### Backend

Copy `backend/.env.example` to `backend/.env` and fill in values.

| Variable | Description | Required |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret used for JWT signing | Yes |
| `PORT` | Backend HTTP port | Yes |
| `CORS_ORIGIN` | Allowed frontend origin | Yes |
| `NODE_ENV` | Runtime mode (`development` or `production`) | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | No |
| `RATE_LIMIT_MAX` | Max requests per window | No |

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_inventory?schema=public"
JWT_SECRET="change-this-secret-key"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

### Frontend

Copy `frontend/.env.example` to `frontend/.env`.

```env
VITE_API_URL="http://localhost:4000/api"
```

## Run with Docker

From the project root:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs backend
```

Then open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Swagger: http://localhost:4000/api-docs

To stop the stack:

```bash
docker compose down
```

To remove volumes:

```bash
docker compose down -v
```

## Run Without Docker

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Database Setup

This project uses PostgreSQL and Prisma migrations.

1. Start PostgreSQL.
2. Create a database named `pos_inventory`.
3. Set `DATABASE_URL` in `backend/.env`.
4. Run migrations:

```bash
cd backend
npx prisma migrate deploy
```

5. Seed the database if needed:

```bash
cd backend
npm run seed
```

The seed data provides demo users and products for local evaluation. Seed credentials are:

- `cashier@example.com / password123`
- `admin@example.com / password123`

## Testing

### Backend

```bash
cd backend
npm install
npm run build
npm test
```

This project includes integration tests for authentication, product actions, order states, and concurrency protection.

### Frontend

```bash
cd frontend
npm install
npm run build
```

### Docker validation

```bash
docker compose build
docker compose up -d
```

## How to Test Each Feature

### 1. Search

1. Open the application.
2. Enter a keyword in the search box.
3. Confirm only matching products are shown.

Expected result: Relevant products appear; non-matching products are hidden.

### 2. Filtering

1. Use the category or filter controls if available.
2. Apply a filter.
3. Verify results update.

Expected result: Results match the selected filter.

### 3. Checkout

1. Sign in as a cashier.
2. Add a product to the cart.
3. Click checkout.

Expected result: The cart is converted into a reserved order and inventory is reserved.

### 4. Payment Success

1. Create a reserved order.
2. Submit a payment with result `SUCCESS`.

Expected result: Order status becomes `PAID` and stock is decremented permanently.

### 5. Payment Failure

1. Start a checkout and trigger payment `FAILED`.

Expected result: Stock reservation is released and the order is marked as `FAILED`.

### 6. Payment Timeout

1. Start a checkout and trigger payment `TIMEOUT`.

Expected result: Reservation expires or is released, and the order is marked as `EXPIRED`.

### 7. Duplicate Payment

1. Submit the same payment request twice with the same idempotency key.

Expected result: The second attempt is rejected as a duplicate.

### 8. Cancellation

1. Open an eligible order.
2. Trigger cancellation.

Expected result: The order is cancelled and reserved inventory is released.

### 9. Refund

1. Open a paid order.
2. Trigger a refund flow.

Expected result: Refund is processed and the order state updates correctly.

### 10. Order History

1. Open a completed or paid order.
2. Review the history.

Expected result: Previous state transitions and payment results are visible.

## Deployment

| Service | Platform | URL | Status |
| --- | --- | --- | --- |
| Frontend | Not deployed | None | Not verified |
| Backend | Not deployed | None | Not verified |
| Database | Not deployed | None | Not verified |

## Troubleshooting

### CORS error

- Check `CORS_ORIGIN` matches the deployed frontend origin exactly.
- Ensure the backend allows the frontend URL in production.

### Database connection failure

- Confirm `DATABASE_URL` is correct.
- Verify the PostgreSQL service is reachable.
- Confirm the user, password, database name, and SSL settings are valid.

### Environment variable missing

- Copy `.env.example` files and fill in all required values.
- Restart the service after updating environment variables.

### Backend unavailable

- Check whether the app started on the configured `PORT`.
- Confirm `npm run dev` or Docker Compose is running.

### Frontend API URL incorrect

- Update `VITE_API_URL` in the frontend environment file.
- Use the public backend URL without localhost in production.

### Docker startup failure

- Verify Docker Desktop or the Docker engine is running.
- Check `docker compose logs` for startup errors.

### Migration failure

- Ensure the database is reachable.
- Run `npx prisma migrate deploy` after setting `DATABASE_URL`.
- Check Prisma migration logs for schema mismatch or permission issues.

## Final Verification Checklist

This checklist reflects the current repository state and the current environment. Public deployment has not been completed because the required platform credentials and local Node/Docker runtime validation are not available in this session.

- [ ] Backend builds successfully
- [ ] Backend tests pass
- [ ] Frontend builds successfully
- [ ] Docker build passes
- [ ] Docker Compose starts successfully
- [ ] Database starts successfully
- [ ] Database migrations pass
- [ ] Backend health endpoint works
- [ ] Backend live URL works
- [ ] Frontend live URL works
- [ ] Frontend connects to live backend
- [ ] CORS works
- [ ] Search works
- [ ] Filtering works
- [ ] Checkout works
- [ ] Stock reservation works
- [ ] Payment success works
- [ ] Payment failure works
- [ ] Payment timeout works
- [ ] Duplicate payment protection works
- [ ] Reservation expiration works
- [ ] Cancellation works
- [ ] Refund works
- [ ] Duplicate refund protection works
- [ ] Order history works
- [ ] README contains actual live URLs
- [ ] README contains tech stack
- [ ] README contains setup steps
- [ ] README contains environment variables
- [ ] README contains testing instructions
- [ ] README explains how to test every major feature

## Final Status

Not PASS. This repository is prepared for deployment, but a verified public deployment could not be completed in this environment because the required Node.js toolchain and Docker daemon are unavailable, and no cloud hosting credentials were provided.

The exact remaining manual step is:

1. Install Node.js and npm on the machine or use a CI environment with Node installed.
2. Ensure Docker Desktop / Docker Engine is running.
3. Run `docker compose up --build` locally to validate the app.
4. Provision a managed PostgreSQL database and deploy the backend to a hosting platform such as Render or Railway.
5. Deploy the frontend to Vercel or Netlify with the deployed backend URL assigned to `VITE_API_URL`.
6. Verify the production frontend, backend, database, and CORS end-to-end before adding the actual live URLs to the README.
