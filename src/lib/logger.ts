/**
 * Centralized error logging utility.
 *
 * In production, replace console.error with your preferred logging service
 * (Sentry, Datadog, Logtail, etc.). This module provides a single place
 * to swap out the logging implementation.
 */

type LogLevel = "error" | "warn" | "info";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  timestamp: string;
}

function formatEntry(entry: LogEntry): string {
  const parts = [`[${entry.timestamp}]`, entry.level.toUpperCase(), entry.message];
  if (entry.context) {
    parts.push(JSON.stringify(entry.context));
  }
  return parts.join(" ");
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    error,
    timestamp: new Date().toISOString(),
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted, error ?? "");
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
  }

  // TODO: In production, send to your logging service:
  // if (process.env.NODE_ENV === "production") {
  //   sendToLoggingService(entry);
  // }
}

export const logger = {
  error(message: string, context?: Record<string, unknown>, error?: Error) {
    log("error", message, context, error);
  },
  warn(message: string, context?: Record<string, unknown>) {
    log("warn", message, context);
  },
  info(message: string, context?: Record<string, unknown>) {
    log("info", message, context);
  },
};

/**
 * Wraps an API route handler with consistent error logging.
 * Usage:
 *   export const GET = withErrorLogging(async (request) => { ... });
 */
export function withErrorLogging<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
  routeName: string,
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error(
        `Unhandled error in ${routeName}`,
        { route: routeName },
        error instanceof Error ? error : new Error(String(error)),
      );
      const { serverError } = await import("@/lib/api-response");
      return serverError();
    }
  };
}