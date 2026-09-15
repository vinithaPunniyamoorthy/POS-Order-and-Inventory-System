# Architecture

The system uses React/Vite for the operator UI and an Express/TypeScript API backed by PostgreSQL through Prisma.

Routes authenticate and validate requests, services own checkout, inventory, payment, expiry, and order transitions, and Prisma owns persistence. PostgreSQL is authoritative for inventory. The frontend displays API values and uses countdowns only as visual information.

Critical operations run in transactions. Checkout locks the cart and reserves each product with a conditional update. Payment and expiry serialize on the order row so only one can complete the active reservation.
