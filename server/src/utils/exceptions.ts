import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Base application exception with standardized error codes.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly details?: string,
  ) {
    super({ statusCode, message, code, details }, statusCode);
  }
}

/**
 * Business logic errors (4xx range)
 */
export class BusinessException extends AppException {
  constructor(code: string, message: string, details?: string) {
    super(code, message, HttpStatus.BAD_REQUEST, details);
  }
}

/**
 * Resource not found (404)
 */
export class NotFoundException extends AppException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationException extends AppException {
  constructor(message = "Authentication failed", details?: string) {
    super("AUTHENTICATION_FAILED", message, HttpStatus.UNAUTHORIZED, details);
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationException extends AppException {
  constructor(
    message = "You do not have permission to perform this action",
    details?: string,
  ) {
    super("AUTHORIZATION_FAILED", message, HttpStatus.FORBIDDEN, details);
  }
}

/**
 * Validation errors (400)
 */
export class ValidationException extends AppException {
  constructor(message: string, details?: string) {
    super("VALIDATION_FAILED", message, HttpStatus.BAD_REQUEST, details);
  }
}

/**
 * External service errors (502)
 */
export class ExternalServiceException extends AppException {
  constructor(
    public readonly serviceName: string,
    message: string,
    details?: string,
  ) {
    super("EXTERNAL_SERVICE_ERROR", message, HttpStatus.BAD_GATEWAY, details);
  }
}

/**
 * LLM Provider specific errors (502)
 */
export class LlmProviderException extends AppException {
  constructor(provider: string, message: string, details?: string) {
    super("LLM_PROVIDER_ERROR", message, HttpStatus.BAD_GATEWAY, details);
  }
}

/**
 * ERP system errors (502)
 */
export class ErpException extends AppException {
  constructor(message: string, details?: string) {
    super("ERP_ERROR", message, HttpStatus.BAD_GATEWAY, details);
  }
}

/**
 * RAG/Vector store errors (502)
 */
export class RagException extends AppException {
  constructor(message: string, details?: string) {
    super("RAG_ERROR", message, HttpStatus.BAD_GATEWAY, details);
  }
}

/**
 * Database errors (500)
 */
export class DatabaseException extends AppException {
  constructor(message: string, details?: string) {
    super("DATABASE_ERROR", message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}

/**
 * Rate limit exceeded (429)
 */
export class RateLimitException extends AppException {
  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(
      "RATE_LIMIT_EXCEEDED",
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfter ? `Retry after ${retryAfter} seconds` : undefined,
    );
  }
}

/**
 * Configuration errors (500)
 */
export class ConfigurationException extends AppException {
  constructor(message: string, details?: string) {
    super(
      "CONFIGURATION_ERROR",
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
    );
  }
}

/**
 * MCP server errors (502)
 */
export class McpException extends AppException {
  constructor(serverName: string, message: string, details?: string) {
    super("MCP_ERROR", message, HttpStatus.BAD_GATEWAY, details);
  }
}

/**
 * Timeout errors (504)
 */
export class TimeoutException extends AppException {
  constructor(operation: string, timeoutMs: number) {
    super(
      "TIMEOUT",
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}

/**
 * Error code constants for consistency
 */
export const ErrorCodes = {
  // Business logic
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",

  // Auth
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  AUTHORIZATION_FAILED: "AUTHORIZATION_FAILED",
  INVALID_TOKEN: "INVALID_TOKEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // External services
  LLM_PROVIDER_ERROR: "LLM_PROVIDER_ERROR",
  ERP_ERROR: "ERP_ERROR",
  RAG_ERROR: "RAG_ERROR",
  MCP_ERROR: "MCP_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // System
  DATABASE_ERROR: "DATABASE_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TIMEOUT: "TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * Helper to check if error is a known AppException
 */
export function isAppException(error: unknown): error is AppException {
  return error instanceof AppException;
}

/**
 * Helper to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Unknown error";
}

/**
 * Helper to convert unknown error to AppException
 */
export function toAppException(error: unknown): AppException {
  if (isAppException(error)) return error;

  const message = getErrorMessage(error);

  // Detect external service errors
  if (
    message.toLowerCase().includes("fetch failed") ||
    message.toLowerCase().includes("econnrefused") ||
    message.toLowerCase().includes("timeout")
  ) {
    return new ExternalServiceException("External Service", message);
  }

  // Detect auth errors
  if (
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("authentication")
  ) {
    return new AuthenticationException(message);
  }

  // Default to generic internal error
  return new AppException(
    ErrorCodes.INTERNAL_ERROR,
    message,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
