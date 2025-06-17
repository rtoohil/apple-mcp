/**
 * Structured logging system for apple-mcp
 * Designed to be safe for MCP protocol - only uses stderr for logging
 * Never interferes with stdout which is reserved for MCP JSON messages
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: any;
}

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamps: boolean;
  format: 'simple' | 'json';
}

class Logger {
  private config: LoggerConfig = {
    level: 'info',
    enableColors: true,
    enableTimestamps: true,
    format: 'simple'
  };

  private component: string;

  // Log level hierarchy for filtering
  private levelValues: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    success: 1, // Same as info
    warn: 2,
    error: 3
  };

  // ANSI color codes for different log levels
  private colors: Record<LogLevel, string> = {
    debug: '\x1b[36m',    // Cyan
    info: '\x1b[34m',     // Blue  
    success: '\x1b[32m',  // Green
    warn: '\x1b[33m',     // Yellow
    error: '\x1b[31m'     // Red
  };

  private reset = '\x1b[0m';

  constructor(component: string, config?: Partial<LoggerConfig>) {
    this.component = component;
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log level should be printed
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelValues[level] >= this.levelValues[this.config.level];
  }

  /**
   * Format a log entry for output
   */
  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = this.config.enableTimestamps 
      ? new Date().toISOString() 
      : '';

    const colorStart = this.config.enableColors ? this.colors[level] : '';
    const colorEnd = this.config.enableColors ? this.reset : '';

    if (this.config.format === 'json') {
      const entry: LogEntry = {
        timestamp,
        level,
        component: this.component,
        message,
        ...(context && { context })
      };
      return JSON.stringify(entry);
    }

    // Simple format for human readability
    const parts = [
      timestamp && `[${timestamp}]`,
      `${colorStart}${level.toUpperCase()}${colorEnd}`,
      `[${this.component}]`,
      message,
      context && `- ${this.safeStringify(context)}`
    ].filter(Boolean);

    return parts.join(' ');
  }

  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj, (key, value) => {
        // Handle Error objects
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
        
        return value;
      });
    } catch (error) {
      // Handle circular references and other serialization errors
      try {
        return JSON.stringify(obj, Object.getOwnPropertyNames(obj));
      } catch {
        return '[Unserializable Object]';
      }
    }
  }

  /**
   * Write log message to stderr (safe for MCP)
   * NEVER use stdout as it's reserved for MCP JSON protocol
   */
  private writeLog(level: LogLevel, message: string, context?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);
    
    // Always use stderr for logging to avoid interfering with MCP protocol
    process.stderr.write(formattedMessage + '\n');
  }

  // Log level methods
  debug(message: string, context?: any): void {
    this.writeLog('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.writeLog('info', message, context);
  }

  success(message: string, context?: any): void {
    this.writeLog('success', message, context);
  }

  warn(message: string, context?: any): void {
    this.writeLog('warn', message, context);
  }

  error(message: string, context?: any): void {
    this.writeLog('error', message, context);
  }

  /**
   * Log module loading events
   */
  moduleLoading(moduleName: string): void {
    this.debug(`Loading ${moduleName} module...`);
  }

  moduleLoaded(moduleName: string, duration?: number): void {
    const durationText = duration ? ` (${duration}ms)` : '';
    this.success(`${moduleName} module loaded successfully${durationText}`);
  }

  moduleError(moduleName: string, error: any): void {
    this.error(`Failed to load ${moduleName} module`, { error: error.message });
  }

  /**
   * Log server events
   */
  serverStarting(): void {
    this.info('Starting apple-mcp server...');
  }

  serverReady(): void {
    this.success('Server connected successfully!');
  }

  serverError(error: any): void {
    this.error('Failed to initialize MCP server', { error: error.message });
  }

  /**
   * Log tool operations
   */
  toolRequest(toolName: string, operation?: string): void {
    const opText = operation ? ` (${operation})` : '';
    this.debug(`Tool request: ${toolName}${opText}`);
  }

  toolError(toolName: string, error: any): void {
    this.error(`Error in ${toolName} tool`, { 
      error: error.message,
      tool: toolName 
    });
  }

  /**
   * Log validation events
   */
  validationError(toolName: string, reason: string): void {
    this.warn(`Validation failed for ${toolName}`, { reason });
  }

  /**
   * Create a child logger with a sub-component name
   */
  child(subComponent: string): Logger {
    return new Logger(`${this.component}:${subComponent}`, this.config);
  }
}

/**
 * Create a logger instance for a component
 */
export function createLogger(component: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(component, config);
}

/**
 * Global logger configuration
 */
const globalConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableColors: true,
  enableTimestamps: true,
  format: 'simple'
};

/**
 * Update global logger configuration
 */
export function configureLogging(config: Partial<LoggerConfig>): void {
  Object.assign(globalConfig, config);
}

/**
 * Get current global configuration
 */
export function getLoggingConfig(): LoggerConfig {
  return { ...globalConfig };
}

/**
 * Main application logger
 */
export const logger = createLogger('apple-mcp', globalConfig);

/**
 * Quick logger instances for common components
 */
export const loggers = {
  server: createLogger('server', globalConfig),
  modules: createLogger('modules', globalConfig),
  validation: createLogger('validation', globalConfig),
  handlers: createLogger('handlers', globalConfig)
};

/**
 * Silence all logging (useful for testing)
 */
export function silenceLogging(): void {
  configureLogging({ level: 'error' });
}

/**
 * Enable verbose logging (useful for debugging)
 */
export function enableVerboseLogging(): void {
  configureLogging({ level: 'debug' });
}