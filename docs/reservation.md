# Reservations

Checkout starts the reservation. Cart editing never changes inventory. Each reservation expires exactly five minutes after checkout using backend server time. `expiresAt` is authoritative; the frontend countdown is informational.

The expiry worker runs every 30 seconds and can also be invoked through `POST /api/reservations/release-expired` by an administrator. Expiry locks the order, releases reserved quantity, records a `RELEASE` movement, marks the reservation `EXPIRED`, and expires the order when no active reservations remain. The active-state check makes repeated cleanup idempotent.
