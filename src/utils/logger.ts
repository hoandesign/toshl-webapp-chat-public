/**
 * Production-ready logging utility
 * Replaces console.log statements with configurable logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// LogEntry interface for future use (e.g., log storage, filtering)
// interface LogEntry {
//   level: LogLevel;
//   message: string;
//   data?: any;
//   timestamp: string;
//   component?: string;
// }

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.isDevelopment ? 'debug' : 'error';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, component?: string): string {
    const timestamp = new Date().toISOString();
    const componentPrefix = component ? `[${component}] ` : '';
    return `${timestamp} [${level.toUpperCase()}] ${componentPrefix}${message}`;
  }

  debug(message: string, data?: unknown, component?: string): void {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, component);
      console.log(formatted, data || '');
    }
  }

  info(message: string, data?: unknown, component?: string): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, component);
      console.info(formatted, data || '');
    }
  }

  warn(message: string, data?: unknown, component?: string): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, component);
      console.warn(formatted, data || '');
    }
  }

  error(message: string, error?: unknown, component?: string): void {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, component);
      console.error(formatted, error || '');
    }
  }

  // API-specific logging methods
  apiRequest(method: string, endpoint: string, component: string): void {
    this.debug(`API Request: ${method} ${endpoint}`, undefined, component);
  }

  apiResponse(method: string, endpoint: string, status: number, duration?: number, component?: string): void {
    const durationText = duration ? ` (${duration}ms)` : '';
    this.debug(`API Response: ${method} ${endpoint} - ${status}${durationText}`, undefined, component);
  }

  apiError(method: string, endpoint: string, error: unknown, component?: string): void {
    this.error(`API Error: ${method} ${endpoint}`, error, component);
  }

  // Cache-specific logging
  cacheHit(key: string, component?: string): void {
    this.debug(`Cache hit: ${key}`, undefined, component);
  }

  cacheMiss(key: string, component?: string): void {
    this.debug(`Cache miss: ${key}`, undefined, component);
  }

  cacheSet(key: string, component?: string): void {
    this.debug(`Cache set: ${key}`, undefined, component);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods for common use cases
export const logApiRequest = (method: string, endpoint: string, component: string) => 
  logger.apiRequest(method, endpoint, component);

export const logApiResponse = (method: string, endpoint: string, status: number, duration?: number, component?: string) => 
  logger.apiResponse(method, endpoint, status, duration, component);

export const logApiError = (method: string, endpoint: string, error: unknown, component?: string) => 
  logger.apiError(method, endpoint, error, component);
