import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import cartRoutes from './routes/cartRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import reservationRoutes from './routes/reservationRoutes';
import { rateLimit } from './middleware/rateLimit';

const app = express();
const allowedOrigins = env.corsOrigin;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'POS Order & Inventory System API',
      version: '1.0.0',
      description: 'Production-grade POS and inventory management API.',
    },
    servers: [{ url: process.env.PUBLIC_BACKEND_URL || `http://localhost:${env.port}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: {
      '/health': { get: { summary: 'Health check', responses: { '200': { description: 'Service is healthy' } } } },
      '/api/auth/register': { post: { summary: 'Register a cashier account', responses: { '201': { description: 'Registered' } } } },
      '/api/auth/login': { post: { summary: 'Authenticate a user', responses: { '200': { description: 'Authenticated' } } } },
      '/api/auth/me': { get: { summary: 'Get the current user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'User profile' } } } },
      '/api/products': { get: { summary: 'List products', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Products' } } }, post: { summary: 'Create a product', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created' } } } },
      '/api/products/{id}': { get: { summary: 'Get a product', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Product' } } }, put: { summary: 'Update a product', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated' } } }, delete: { summary: 'Delete a product', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Deleted' } } } },
      '/api/products/{id}/restock': { post: { summary: 'Restock a product', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Restocked' } } } },
      '/api/inventory': { get: { summary: 'Get current inventory', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Inventory' } } } },
      '/api/carts': { post: { summary: 'Create a cart', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Cart' } } } },
      '/api/carts/{id}': { get: { summary: 'Get a cart', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Cart' } } } },
      '/api/carts/{id}/items': { post: { summary: 'Add a cart item', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Item added' } } } },
      '/api/carts/{id}/checkout': { post: { summary: 'Checkout and reserve stock', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Order created' }, '200': { description: 'Existing checkout returned' } } } },
      '/api/orders': { get: { summary: 'List orders', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Orders' } } } },
      '/api/orders/{id}': { get: { summary: 'Get an order', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Order' } } } },
      '/api/orders/{id}/payment': { post: { summary: 'Process mock payment', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Payment processed' } } } },
      '/api/orders/{id}/cancel': { post: { summary: 'Cancel an order', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Cancelled' } } } },
      '/api/orders/{id}/history': { get: { summary: 'Get order history', security: [{ bearerAuth: [] }], responses: { '200': { description: 'History' } } } },
      '/api/orders/{id}/process': { post: { summary: 'Move an order to processing', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Processing' } } } },
      '/api/orders/{id}/complete': { post: { summary: 'Complete an order', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Completed' } } } },
      '/api/reservations/release-expired': { post: { summary: 'Release expired reservations', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Expired reservations released' } } } },
      '/api/reservations/{id}': { get: { summary: 'Get a reservation', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Reservation' } } } },
    },
  },
  apis: [
    `${process.cwd()}/src/routes/*.ts`,
    `${process.cwd()}/dist/routes/*.js`,
  ],
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimit);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reservations', reservationRoutes);

const specs = swaggerJsdoc(swaggerOptions);
app.get('/api-docs.json', (_req, res) => res.json(specs));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
