// Centralized logging utility
// Replace console statements with this for better control

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Create logger instance
const loggerInstance = new Logger(
  import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO
);

// Export logger instance
export const logger = loggerInstance;

// Export individual methods for convenience (avoid destructuring to prevent initialization issues)
export const error = loggerInstance.error.bind(loggerInstance);
export const warn = loggerInstance.warn.bind(loggerInstance);
export const info = loggerInstance.info.bind(loggerInstance);
export const debug = loggerInstance.debug.bind(loggerInstance);

