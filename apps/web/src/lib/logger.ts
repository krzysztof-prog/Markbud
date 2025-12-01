/**
 * Logger utility for the application
 *
 * Provides different log levels that are controlled by environment.
 * In production, only errors and warnings are logged to console.
 * In development, all log levels are active.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = { enabled: true }) {
    this.config = config;
  }

  private formatMessage(level: LogLevel, args: unknown[]): unknown[] {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix || '';
    const prefixStr = prefix ? `[${prefix}]` : '';

    return [`[${timestamp}]${prefixStr}[${level.toUpperCase()}]`, ...args];
  }

  /**
   * Debug level logging - only in development
   * Use for detailed debugging information
   */
  debug(...args: unknown[]): void {
    if (!this.config.enabled || !isDevelopment) return;
    console.debug(...this.formatMessage('debug', args));
  }

  /**
   * Info level logging - only in development
   * Use for general information
   */
  log(...args: unknown[]): void {
    if (!this.config.enabled || !isDevelopment) return;
    console.log(...this.formatMessage('log', args));
  }

  /**
   * Info level logging - only in development
   * Use for informational messages
   */
  info(...args: unknown[]): void {
    if (!this.config.enabled || !isDevelopment) return;
    console.info(...this.formatMessage('info', args));
  }

  /**
   * Warning level logging - always enabled
   * Use for warnings that don't prevent execution
   */
  warn(...args: unknown[]): void {
    if (!this.config.enabled) return;
    console.warn(...this.formatMessage('warn', args));
  }

  /**
   * Error level logging - always enabled
   * Use for errors and exceptions
   */
  error(...args: unknown[]): void {
    if (!this.config.enabled) return;
    console.error(...this.formatMessage('error', args));
  }

  /**
   * Create a new logger instance with a prefix
   * Useful for creating module-specific loggers
   */
  createLogger(prefix: string): Logger {
    return new Logger({ ...this.config, prefix });
  }
}

// Default logger instance
export const logger = new Logger();

// Specialized loggers for different modules
export const wsLogger = logger.createLogger('WebSocket');
export const apiLogger = logger.createLogger('API');
export const dbLogger = logger.createLogger('DB');

// Export the Logger class for custom instances
export { Logger };
