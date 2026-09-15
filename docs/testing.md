# Testing

Backend tests use Jest and Supertest. Behavioral coverage should run against PostgreSQL and includes authentication, product CRUD, cart checkout, reservation expiry, payment outcomes, cancellation, invalid transitions, rollback, duplicate checkout/payment, and concurrent checkout/payment cases.

The concurrency tests must use `Promise.all` against separate HTTP requests and assert final database stock and reservation values. A test run is only submission-ready when PostgreSQL is available and both `npm run build` and `npm test` pass.
