# Deployment

Docker Compose runs PostgreSQL, the backend, and the Vite frontend. For a hosted deployment, provide a managed PostgreSQL connection and set `DATABASE_URL`, a strong `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, and `NODE_ENV` through the platform secret store. No live URL is configured in this repository.

Run `docker compose up --build`, then open `http://localhost:5173` and `http://localhost:4000/api-docs`.
