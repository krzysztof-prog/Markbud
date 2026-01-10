/**
 * Structured logging utility using pino
 * Maintains backwards-compatible interface with custom logger methods
 */

import pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV !== 'production';

// Create pino logger with pretty printing in development
const pinoLogger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

/**
 * Logger wrapper that maintains backwards-compatible interface
 * while using pino under the hood
 */
class Logger {
  private pino = pinoLogger;

  /**
   * Log with specific level (for backwards compatibility)
   */
  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    switch (level) {
      case 'debug':
        this.debug(message, meta);
        break;
      case 'info':
        this.info(message, meta);
        break;
      case 'warn':
        this.warn(message, meta);
        break;
      case 'error':
        this.error(message, undefined, meta);
        break;
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.pino.debug(meta, message);
    } else {
      this.pino.debug(message);
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.pino.info(meta, message);
    } else {
      this.pino.info(message);
    }
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.pino.warn(meta, message);
    } else {
      this.pino.warn(message);
    }
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorMeta = {
      ...meta,
      ...(error instanceof Error && {
        err: {
          message: error.message,
          stack: isDev ? error.stack : undefined,
          name: error.name,
        },
      }),
    };

    if (Object.keys(errorMeta).length > 0) {
      this.pino.error(errorMeta, message);
    } else {
      this.pino.error(message);
    }
  }

  /**
   * Create a child logger with bound context
   */
  child(bindings: Record<string, unknown>) {
    return this.pino.child(bindings);
  }

  /**
   * Get the underlying pino instance for advanced use cases
   */
  get pinoInstance() {
    return this.pino;
  }
}

export const logger = new Logger();

// Export pino instance for direct access if needed
export { pinoLogger };
