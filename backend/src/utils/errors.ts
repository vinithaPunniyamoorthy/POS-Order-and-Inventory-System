export class ApiError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, message: string, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode || 'API_ERROR';
  }
}

export const throwIf = (condition: unknown, statusCode: number, message: string, errorCode?: string) => {
  if (condition) {
    throw new ApiError(statusCode, message, errorCode);
  }
};

export const formatSuccess = <T>(message: string, data: T) => ({
  success: true,
  message,
  data,
});

export const formatError = (message: string, errorCode: string) => ({
  success: false,
  message,
  errorCode,
});
