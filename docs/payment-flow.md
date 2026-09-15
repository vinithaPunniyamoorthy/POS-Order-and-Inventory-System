# Payment Flow

`POST /api/orders/:id/payment` accepts `SUCCESS`, `FAILED`, or `TIMEOUT`.

- `SUCCESS`: confirms reservations, decrements permanent stock, records `SALE`, and changes the order to `PAID`.
- `FAILED`: releases reservations, records `RELEASE`, leaves permanent stock unchanged, and changes the order to `FAILED`.
- `TIMEOUT`: releases reservations, records `RELEASE`, leaves permanent stock unchanged, and changes the order to `EXPIRED`.

The order row is locked during payment. One payment row is allowed per order, so duplicate simultaneous submissions receive a conflict. This implementation intentionally does not retry a failed payment on the same order; the cashier starts a new order.
