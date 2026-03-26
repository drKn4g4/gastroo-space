import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Global Error Handler for API Routes
 * Wraps all responses with consistent error format
 */

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof ZodError) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.issues.reduce((acc: Record<string, any>, e) => {
          const path = e.path.join('.');
          acc[path] = e.message;
          return acc;
        }, {}),
      },
    };
  }

  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred' 
          : error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
    },
  };
}

export async function handleApiRoute<T>(
  handler: (req: NextRequest) => Promise<T>,
  req: NextRequest
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const data = await handler(req);
    return NextResponse.json(createSuccessResponse(data));
  } catch (error) {
    const errorResponse = createErrorResponse(error);
    const statusCode = error instanceof ApiError ? error.statusCode : 400;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

/**
 * Specific Error Classes
 */

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super('CONFLICT', message, 409);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super('INTERNAL_ERROR', message, 500, details);
  }
}
