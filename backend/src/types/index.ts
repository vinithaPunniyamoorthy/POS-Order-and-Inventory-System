export type UserRole = 'ADMIN' | 'CASHIER';
export type CartStatus = 'ACTIVE' | 'CHECKOUT' | 'CONVERTED' | 'EXPIRED';
export type OrderStatus = 'PENDING' | 'RESERVED' | 'PAYMENT_PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'EXPIRED';
export type ReservationStatus = 'ACTIVE' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
export type StockMovementType = 'RESTOCK' | 'RESERVATION' | 'RELEASE' | 'SALE';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  errors?: string[];
}
