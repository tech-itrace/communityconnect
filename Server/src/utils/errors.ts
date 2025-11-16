/**
 * Standardized Error Handling
 *
 * Provides consistent error responses across the application
 */

import { Request, Response, NextFunction } from 'express';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants';

/**
 * Custom Application Error
 * Extends Error with HTTP status code and structured error info
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert to JSON response format
     */
    toJSON() {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && { details: this.details })
            }
        };
    }
}

/**
 * Predefined Error Factories
 * Quick helpers to create common errors
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message, details);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} not found: ${identifier}`
            : `${resource} not found`;
        super(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, message);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: any) {
        super(HTTP_STATUS.CONFLICT, ERROR_CODES.ALREADY_EXISTS, message, details);
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, details?: any) {
        super(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ERROR_CODES.DATABASE_ERROR,
            message,
            details
        );
    }
}

/**
 * Async Handler Wrapper
 * Catches async errors and passes to error middleware
 * Eliminates need for try-catch in every controller
 *
 * @example
 * export const getMemberHandler = asyncHandler(async (req, res) => {
 *   const member = await getMemberById(req.params.id);
 *   if (!member) throw new NotFoundError('Member', req.params.id);
 *   res.json({ success: true, member });
 * });
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Global Error Handler Middleware
 * Catches all errors and formats consistent responses
 *
 * Usage: Add at the end of middleware chain in app.ts
 * app.use(errorHandler);
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    // Log error
    console.error('[Error Handler]', {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });

    // Handle known AppError
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === 'development';

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: isDevelopment ? err.message : 'An unexpected error occurred',
            ...(isDevelopment && { stack: err.stack })
        }
    });
};

/**
 * Not Found Handler
 * Catches 404 errors for undefined routes
 *
 * Usage: Add before error handler in app.ts
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = new NotFoundError('Route', `${req.method} ${req.path}`);
    next(error);
};

/**
 * Success Response Helper
 * Standardizes successful API responses
 */
export function successResponse(
    res: Response,
    data: any,
    statusCode: number = HTTP_STATUS.OK
) {
    return res.status(statusCode).json({
        success: true,
        ...data
    });
}

/**
 * Created Response Helper
 * For successful POST requests (201)
 */
export function createdResponse(res: Response, data: any) {
    return successResponse(res, data, HTTP_STATUS.CREATED);
}

/**
 * Validation Helper
 * Throws ValidationError if condition is false
 *
 * @example
 * validate(phone.length === 12, 'Phone number must be 12 digits');
 * validate(email.includes('@'), 'Invalid email format');
 */
export function validate(condition: boolean, message: string, details?: any): asserts condition {
    if (!condition) {
        throw new ValidationError(message, details);
    }
}

/**
 * Assert Not Null Helper
 * Throws NotFoundError if value is null/undefined
 *
 * @example
 * const member = await getMemberById(id);
 * assertFound(member, 'Member', id);
 * // Now TypeScript knows member is not null
 */
export function assertFound<T>(
    value: T | null | undefined,
    resource: string,
    identifier?: string
): asserts value is T {
    if (value === null || value === undefined) {
        throw new NotFoundError(resource, identifier);
    }
}
