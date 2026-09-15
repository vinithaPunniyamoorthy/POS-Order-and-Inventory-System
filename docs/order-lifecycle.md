# Order Lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> RESERVED
  RESERVED --> PAYMENT_PENDING
  PAYMENT_PENDING --> PAID
  PAYMENT_PENDING --> FAILED
  PAYMENT_PENDING --> EXPIRED
  RESERVED --> CANCELLED
  PAYMENT_PENDING --> CANCELLED
  PAID --> PROCESSING
  PROCESSING --> COMPLETED
```

Invalid transitions return `409 Conflict`. Active reservations are released when an order is cancelled. Completed orders cannot be cancelled. Every transition is recorded in `OrderStatusHistory`.
