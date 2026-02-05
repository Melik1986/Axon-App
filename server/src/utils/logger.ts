/**
 * Interface for Supabase errors
 */
import { sanitizeForLogging } from "./logger-sanitizer";

interface SupabaseError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Logging levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Logging options
 */
interface LogOptions {
  timestamp?: boolean;
  prefix?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Universal utility for application logging (Server)
 * Extended version with logging levels and timestamps
 */
export class AppLogger {
  // In Node.js use process.env.NODE_ENV
  private static isDevelopment = process.env.NODE_ENV !== "production";
  private static currentLevel: LogLevel =
    process.env.NODE_ENV !== "production" ? LogLevel.DEBUG : LogLevel.WARN;

  /**
   * Set logging level
   */
  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get current logging level
   */
  static getLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * Message formatting with timestamp
   */
  private static formatMessage(
    level: string,
    message: string,
    options?: LogOptions,
  ): string {
    const timestamp =
      options?.timestamp !== false ? new Date().toISOString() : "";
    const prefix = options?.prefix ? `[${options.prefix}]` : "[Server]";

    return timestamp
      ? `${timestamp} ${prefix} [${level}] ${message}`
      : `${prefix} [${level}] ${message}`;
  }

  /**
   * Check if logging is needed for current level
   */
  private static shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  static log(message: string, data?: unknown, prefix?: string): void {
    if (this.isDevelopment && this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage("INFO", message, {
        prefix,
        timestamp: true,
      });
      const sanitized = data ? sanitizeForLogging(data) : "";
      // eslint-disable-next-line no-console
      console.log(formatted, sanitized);
    }
  }

  static error(message: string, error?: unknown, prefix?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const formatted = this.formatMessage("ERROR", message, {
      prefix,
      timestamp: true,
    });

    if (error) {
      if (error instanceof Error) {
        const sanitized = sanitizeForLogging({
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: (error as { cause?: unknown }).cause,
        });
        // eslint-disable-next-line no-console
        console.error(formatted, sanitized);
      } else if (typeof error === "object" && error !== null) {
        const supabaseError = error as SupabaseError;
        if (
          supabaseError.message ||
          supabaseError.details ||
          supabaseError.hint
        ) {
          const sanitized = sanitizeForLogging({
            message: supabaseError.message,
            details: supabaseError.details,
            hint: supabaseError.hint,
            code: supabaseError.code,
          });
          // eslint-disable-next-line no-console
          console.error(formatted, sanitized);
        } else if (Object.keys(error).length > 0) {
          const sanitized = sanitizeForLogging(error);
          // eslint-disable-next-line no-console
          console.error(formatted, sanitized);
        } else {
          // eslint-disable-next-line no-console
          console.error(formatted, "Empty error object");
        }
      } else {
        const sanitized = sanitizeForLogging(error);
        // eslint-disable-next-line no-console
        console.error(formatted, sanitized);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error(formatted);
    }
  }

  static warn(message: string, data?: unknown, prefix?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formatted = this.formatMessage("WARN", message, {
      prefix,
      timestamp: true,
    });
    const sanitized = data ? sanitizeForLogging(data) : "";
    // eslint-disable-next-line no-console
    console.warn(formatted, sanitized);
  }

  static info(message: string, data?: unknown, prefix?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formatted = this.formatMessage("INFO", message, {
      prefix,
      timestamp: true,
    });
    const sanitized = data ? sanitizeForLogging(data) : "";
    // eslint-disable-next-line no-console
    console.info(formatted, sanitized);
  }

  static debug(message: string, data?: unknown, prefix?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const formatted = this.formatMessage("DEBUG", message, {
      prefix,
      timestamp: true,
    });
    const sanitized = data ? sanitizeForLogging(data) : "";
    // eslint-disable-next-line no-console
    console.debug(formatted, sanitized);
  }

  /**
   * Group logs (for debugging)
   */
  static group(label: string): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.group(label);
    }
  }

  static groupEnd(): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  /**
   * Timer for performance measurement
   */
  static time(label: string): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.time(label);
    }
  }

  static timeEnd(label: string): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.timeEnd(label);
    }
  }

  /**
   * Table output (for debugging)
   */
  static table(data: unknown): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.table(data);
    }
  }
}
