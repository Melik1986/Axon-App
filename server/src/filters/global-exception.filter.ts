import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { AppLogger } from "../utils/logger";
import {
  isLlmProviderError,
  getLlmProviderErrorBody,
} from "./llm-provider-exception.filter";

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  code?: string;
  details?: string;
  timestamp: string;
  path?: string;
}

/**
 * Error codes for different types of errors
 */
export enum ErrorCode {
  // LLM Provider errors
  LLM_PROVIDER_ERROR = "LLM_PROVIDER_ERROR",
  LLM_INVALID_API_KEY = "LLM_INVALID_API_KEY",
  LLM_RATE_LIMIT = "LLM_RATE_LIMIT",
  LLM_QUOTA_EXCEEDED = "LLM_QUOTA_EXCEEDED",
  LLM_CONTEXT_LENGTH = "LLM_CONTEXT_LENGTH",

  // ERP errors
  ERP_CONNECTION_ERROR = "ERP_CONNECTION_ERROR",
  ERP_AUTHENTICATION_ERROR = "ERP_AUTHENTICATION_ERROR",
  ERP_INVALID_RESPONSE = "ERP_INVALID_RESPONSE",

  // RAG errors
  RAG_VECTOR_STORE_ERROR = "RAG_VECTOR_STORE_ERROR",
  RAG_EMBEDDING_ERROR = "RAG_EMBEDDING_ERROR",

  // Auth errors
  AUTH_INVALID_TOKEN = "AUTH_INVALID_TOKEN",
  AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_INSUFFICIENT_PERMISSIONS",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // MCP errors
  MCP_CONNECTION_ERROR = "MCP_CONNECTION_ERROR",
  MCP_TOOL_EXECUTION_ERROR = "MCP_TOOL_EXECUTION_ERROR",

  // Guardian errors
  GUARDIAN_RULE_VIOLATION = "GUARDIAN_RULE_VIOLATION",
  GUARDIAN_VALIDATION_FAILED = "GUARDIAN_VALIDATION_FAILED",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Generic errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_FOUND = "NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
}

/**
 * Global exception filter with standardized error handling
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log full error on server for debugging
    AppLogger.error("Exception caught by GlobalExceptionFilter", exception);

    // Check if it's an LLM provider error (high priority)
    if (isLlmProviderError(exception)) {
      const llmError = getLlmProviderErrorBody(exception);
      const errorResponse: ErrorResponse = {
        statusCode: llmError.statusCode,
        message: llmError.message,
        code: llmError.code,
        details: llmError.details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      if (!response.headersSent) {
        response.status(llmError.statusCode).json(errorResponse);
      }
      return;
    }

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = exception.message;
      let code = this.getErrorCodeFromStatus(status);
      let details: string | undefined;

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as {
          message?: string | string[];
          error?: string;
          code?: string;
          details?: string;
        };

        if (resp.message) {
          message = Array.isArray(resp.message)
            ? resp.message.join(", ")
            : resp.message;
        }

        if (resp.code) {
          code = resp.code;
        }

        if (resp.details) {
          details = resp.details;
        }

        if (resp.error && !details) {
          details = resp.error;
        }
      }

      const errorResponse: ErrorResponse = {
        statusCode: status,
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      if (!response.headersSent) {
        response.status(status).json(errorResponse);
      }
      return;
    }

    // Handle custom business logic errors
    const customError = this.tryParseCustomError(exception);
    if (customError) {
      const errorResponse: ErrorResponse = {
        statusCode: customError.statusCode,
        message: customError.message,
        code: customError.code,
        details: customError.details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      if (!response.headersSent) {
        response.status(customError.statusCode).json(errorResponse);
      }
      return;
    }

    // Fallback: generic internal server error
    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
      details:
        exception instanceof Error ? exception.message : String(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (!response.headersSent) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  /**
   * Map HTTP status to error code
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }

  /**
   * Try to parse custom business error from exception
   */
  private tryParseCustomError(exception: unknown): {
    statusCode: number;
    message: string;
    code: string;
    details?: string;
  } | null {
    if (!exception || typeof exception !== "object") {
      return null;
    }

    const err = exception as Record<string, unknown>;

    // ERP errors
    if (
      err.code === ErrorCode.ERP_CONNECTION_ERROR ||
      err.code === ErrorCode.ERP_AUTHENTICATION_ERROR ||
      err.code === ErrorCode.ERP_INVALID_RESPONSE
    ) {
      return {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: "ERP system error",
        code: String(err.code),
        details: String(err.message ?? ""),
      };
    }

    // RAG errors
    if (
      err.code === ErrorCode.RAG_VECTOR_STORE_ERROR ||
      err.code === ErrorCode.RAG_EMBEDDING_ERROR
    ) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: "Knowledge base error",
        code: String(err.code),
        details: String(err.message ?? ""),
      };
    }

    // MCP errors
    if (
      err.code === ErrorCode.MCP_CONNECTION_ERROR ||
      err.code === ErrorCode.MCP_TOOL_EXECUTION_ERROR
    ) {
      return {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: "MCP server error",
        code: String(err.code),
        details: String(err.message ?? ""),
      };
    }

    // Guardian errors
    if (
      err.code === ErrorCode.GUARDIAN_RULE_VIOLATION ||
      err.code === ErrorCode.GUARDIAN_VALIDATION_FAILED
    ) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: "Action blocked by rules",
        code: String(err.code),
        details: String(err.message ?? ""),
      };
    }

    return null;
  }
}
