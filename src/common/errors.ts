export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: any[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', errors?: any[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors?: any[]) {
    super(message, 400, 'BAD_REQUEST', errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized: Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: Insufficient permissions for this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict: Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service failure', errors?: any[]) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', errors);
  }
}
