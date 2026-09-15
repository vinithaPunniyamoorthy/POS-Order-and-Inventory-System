# Concurrency

A read/check/write flow can oversell when two requests read the same availability before either writes. Reservation uses PostgreSQL's atomic conditional update:

```sql
UPDATE "Product"
SET "reservedQuantity" = "reservedQuantity" + $quantity
WHERE id = $productId
  AND ("stockQuantity" - "reservedQuantity") >= $quantity;
```

A zero-row update is an insufficient-stock conflict. Checkout runs in a serializable transaction and locks the cart. Payment and expiry lock the order row. Product checks enforce nonnegative stock and `reservedQuantity <= stockQuantity`.

The required production verification is a real PostgreSQL test with ten simultaneous quantity-two requests against stock ten, plus two simultaneous quantity-three requests against stock five. The repository includes the test harness contract in `backend/tests/concurrency.test.ts`; it must be run with PostgreSQL available.
