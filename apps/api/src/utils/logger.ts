/**
 * Structured logging utility
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = process.env.NODE_ENV !== 'production';

  log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'debug':
        if (this.isDev) console.log(output);
        break;
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>) {
    const errorMeta = {
      ...meta,
      ...(error instanceof Error && {
        errorMessage: error.message,
        errorStack: this.isDev ? error.stack : undefined,
      }),
    };
    this.log('error', message, Object.keys(errorMeta).length > 0 ? errorMeta : undefined);
  }
}

export const logger = new Logger();
