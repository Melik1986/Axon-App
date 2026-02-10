/**
 * Client-side error handling utilities
 * Provides standardized error parsing and user-friendly messages
 */

import { AppLogger } from "./logger";

/**
 * Standardized error response from API
 * Matches ErrorResponse from shared/types.ts
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  code?: string;
  details?: string;
  timestamp: string;
  path?: string;
}

/**
 * User-friendly error messages mapped by error code
 */
const ERROR_MESSAGES: Record<string, string> = {
  // LLM Provider errors
  LLM_PROVIDER_ERROR: "AI provider unavailable. Please check your settings.",
  LLM_INVALID_API_KEY: "Invalid API key. Please update your LLM settings.",
  LLM_RATE_LIMIT: "Rate limit exceeded. Please try again in a few moments.",
  LLM_QUOTA_EXCEEDED:
    "API quota exceeded. Please check your billing at provider dashboard.",
  LLM_CONTEXT_LENGTH:
    "Message too long. Try a shorter message or remove attachments.",

  // ERP errors
  ERP_CONNECTION_ERROR:
    "Cannot connect to ERP system. Please check your connection settings.",
  ERP_AUTHENTICATION_ERROR:
    "ERP authentication failed. Please verify your credentials.",
  ERP_INVALID_RESPONSE: "Received invalid data from ERP system.",

  // RAG errors
  RAG_VECTOR_STORE_ERROR:
    "Knowledge base temporarily unavailable. Please try again later.",
  RAG_EMBEDDING_ERROR: "Failed to process knowledge base query.",

  // Auth errors
  AUTH_INVALID_TOKEN: "Session expired. Please log in again.",
  AUTH_TOKEN_EXPIRED: "Session expired. Please log in again.",
  AUTH_INSUFFICIENT_PERMISSIONS:
    "You don't have permission to perform this action.",

  // Validation errors
  VALIDATION_ERROR: "Invalid input. Please check your data.",
  INVALID_INPUT: "Invalid input. Please check your data.",

  // MCP errors
  MCP_CONNECTION_ERROR: "MCP server connection failed.",
  MCP_TOOL_EXECUTION_ERROR: "MCP tool execution failed.",

  // Guardian errors
  GUARDIAN_RULE_VIOLATION:
    "Action blocked by business rules. Please review and try again.",
  GUARDIAN_VALIDATION_FAILED: "Validation failed. Please check your input.",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "Too many requests. Please slow down and try again.",

  // Generic errors
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  NOT_FOUND: "Resource not found.",
  BAD_REQUEST: "Invalid request.",
  UNAUTHORIZED: "Authentication required.",
  FORBIDDEN: "Access denied.",
};

/**
 * Parse API error response
 */
export function parseApiError(error: unknown): ApiErrorResponse {
  // Default error
  const defaultError: ApiErrorResponse = {
    statusCode: 500,
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
  };

  if (!error) {
    return defaultError;
  }

  // If it's already a parsed error response
  if (typeof error === "object" && "statusCode" in error) {
    const err = error as Partial<ApiErrorResponse>;
    return {
      statusCode: err.statusCode ?? 500,
      message: err.message ?? "An unexpected error occurred",
      code: err.code,
      details: err.details,
      error: err.error,
      timestamp: err.timestamp ?? new Date().toISOString(),
      path: err.path,
    };
  }

  // If it's a fetch Response
  if (typeof error === "object" && "status" in error && "json" in error) {
    // This is handled by the caller (authenticatedFetch)
    return defaultError;
  }

  // If it's an Error object
  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: error.message,
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    };
  }

  // If it's a string
  if (typeof error === "string") {
    return {
      statusCode: 500,
      message: error,
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    };
  }

  return defaultError;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(
  error: ApiErrorResponse | unknown,
): string {
  const parsed = parseApiError(error);

  // If we have a custom message from server, use it
  if (parsed.message && parsed.message !== "Internal server error") {
    return parsed.message;
  }

  // Try to get user-friendly message by code
  if (parsed.code && ERROR_MESSAGES[parsed.code]) {
    return ERROR_MESSAGES[parsed.code]!;
  }

  // If we have details, append them
  if (parsed.details) {
    return `${parsed.message}. ${parsed.details}`;
  }

  // parsed.message is guaranteed to be a string from parseApiError
  return parsed.message;
}

/**
 * Get full error message with details (for error screens)
 */
export function getDetailedErrorMessage(error: ApiErrorResponse | unknown): {
  title: string;
  message: string;
  details?: string;
  code?: string;
} {
  const parsed = parseApiError(error);

  return {
    title: getErrorTitle(parsed),
    message: getUserFriendlyMessage(parsed),
    details: parsed.details,
    code: parsed.code ?? undefined,
  };
}

/**
 * Get error title based on status code
 */
function getErrorTitle(error: ApiErrorResponse): string {
  if (error.statusCode >= 500) {
    return "Server Error";
  }

  if (error.statusCode === 429) {
    return "Rate Limit Exceeded";
  }

  if (error.statusCode === 404) {
    return "Not Found";
  }

  if (error.statusCode === 403) {
    return "Access Denied";
  }

  if (error.statusCode === 401) {
    return "Authentication Required";
  }

  if (error.statusCode >= 400) {
    return "Request Error";
  }

  return "Error";
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error: ApiErrorResponse | unknown): boolean {
  const parsed = parseApiError(error);

  // Network errors are recoverable
  if (parsed.code?.includes("CONNECTION") || parsed.code?.includes("TIMEOUT")) {
    return true;
  }

  // Rate limits are recoverable after waiting
  if (parsed.code === "RATE_LIMIT_EXCEEDED" || parsed.statusCode === 429) {
    return true;
  }

  // 5xx errors are recoverable (temporary server issues)
  if (parsed.statusCode >= 500) {
    return true;
  }

  // Auth errors require re-login, not retry
  if (parsed.code?.startsWith("AUTH_") || parsed.statusCode === 401) {
    return false;
  }

  // 4xx errors (client errors) are usually not recoverable
  if (parsed.statusCode >= 400 && parsed.statusCode < 500) {
    return false;
  }

  return true;
}

/**
 * Check if error requires user to log in again
 */
export function requiresReauthentication(
  error: ApiErrorResponse | unknown,
): boolean {
  const parsed = parseApiError(error);

  if (parsed.statusCode === 401) {
    return true;
  }

  if (
    parsed.code === "AUTH_INVALID_TOKEN" ||
    parsed.code === "AUTH_TOKEN_EXPIRED"
  ) {
    return true;
  }

  return false;
}

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>,
): void {
  const parsed = parseApiError(error);

  AppLogger.error(`${context} error`, {
    code: parsed.code,
    statusCode: parsed.statusCode,
    message: parsed.message,
    details: parsed.details,
    ...metadata,
  });
}

/**
 * Handle error globally (show alert, navigate, etc.)
 */
export async function handleError(
  error: unknown,
  context: string,
  options?: {
    showAlert?: boolean;
    logError?: boolean;
    onReauthRequired?: () => void;
  },
): Promise<void> {
  const parsed = parseApiError(error);

  // Log error
  if (options?.logError !== false) {
    logError(error, context);
  }

  // Check if reauth required
  if (requiresReauthentication(parsed) && options?.onReauthRequired) {
    options.onReauthRequired();
    return;
  }

  // Show alert if requested (note: Alert is React Native specific)
  // Implementation depends on your UI framework
  if (options?.showAlert) {
    // This would be implemented in the consuming code
    // Alert.alert(getErrorTitle(parsed), getUserFriendlyMessage(parsed));
  }
}

/**
 * Extract error from fetch response
 */
export async function extractErrorFromResponse(
  response: Response,
): Promise<ApiErrorResponse> {
  try {
    const body = await response.json();

    return {
      statusCode: response.status,
      message: body.message || response.statusText || "Request failed",
      code: body.code,
      details: body.details,
      timestamp: body.timestamp || new Date().toISOString(),
      path: body.path,
    };
  } catch {
    // If response is not JSON
    return {
      statusCode: response.status,
      message: response.statusText || "Request failed",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    };
  }
}
