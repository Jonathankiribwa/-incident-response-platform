import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction // Renamed to _next to indicate it's unused
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode
  });

  // Don't leak error details in production
  const errorResponse = {
    error: statusCode === 500 ? 'Internal Server Error' : message,
    ...(process.env['NODE_ENV'] === 'development' && {
      stack: error.stack,
      details: error.message
    })
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error: AppError = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  error.isOperational = true;
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
};

type ExpressAsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export const asyncHandler = (fn: ExpressAsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 