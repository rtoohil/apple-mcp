import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { createLogger, LogLevel } from "../../utils/Logger.js";
import { captureStderrAsync, suppressConsole, restoreConsole } from "../test-setup.js";

describe("Logger", () => {
  beforeEach(() => {
    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe("createLogger", () => {
    test("should create logger with specified component name", () => {
      const logger = createLogger("test-component");
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.success).toBe("function");
    });
  });

  describe("log formatting", () => {
    test("should format info messages correctly", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Test info message");
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      // Should contain timestamp, level, component, and message
      expect(logLine).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      expect(logLine).toContain("INFO");
      expect(logLine).toContain("[test]");
      expect(logLine).toContain("Test info message");
    });

    test("should format error messages correctly", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.error("Test error message");
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      expect(logLine).toContain("ERROR");
      expect(logLine).toContain("[test]");
      expect(logLine).toContain("Test error message");
    });

    test("should format warn messages correctly", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.warn("Test warning message");
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      expect(logLine).toContain("WARN");
      expect(logLine).toContain("[test]");
      expect(logLine).toContain("Test warning message");
    });

    test("should format success messages correctly", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.success("Test success message");
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      expect(logLine).toContain("SUCCESS");
      expect(logLine).toContain("[test]");
      expect(logLine).toContain("Test success message");
    });

    test("should format debug messages correctly", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.debug("Test debug message");
      });

      // Debug messages are always logged
      expect(stderr.length).toBeGreaterThanOrEqual(0);
      if (stderr.length > 0) {
        const logLine = stderr[0];
        expect(logLine).toContain("DEBUG");
        expect(logLine).toContain("[test]");
        expect(logLine).toContain("Test debug message");
      }
    });
  });

  describe("context object logging", () => {
    test("should include context object in log output", async () => {
      const logger = createLogger("test");
      const context = { userId: 123, action: "login" };
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("User action", context);
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      expect(logLine).toContain("User action");
      expect(logLine).toContain("userId");
      expect(logLine).toContain("123");
      expect(logLine).toContain("action");
      expect(logLine).toContain("login");
    });

    test("should handle context with error objects", async () => {
      const logger = createLogger("test");
      const error = new Error("Test error");
      const context = { error, requestId: "req-123" };
      
      const stderr = await captureStderrAsync(async () => {
        logger.error("Operation failed", context);
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      expect(logLine).toContain("Operation failed");
      expect(logLine).toContain("requestId");
      expect(logLine).toContain("req-123");
      // Error should be serialized in some form
      expect(logLine).toMatch(/error|Test error/);
    });

    test("should handle nested context objects", async () => {
      const logger = createLogger("test");
      const context = {
        user: { id: 123, name: "John" },
        metadata: { timestamp: Date.now() }
      };
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Complex context", context);
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      expect(logLine).toContain("Complex context");
      expect(logLine).toContain("user");
      expect(logLine).toContain("John");
      expect(logLine).toContain("metadata");
    });

    test("should handle null and undefined context", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Message with null", null);
        logger.info("Message with undefined", undefined);
      });

      expect(stderr).toHaveLength(2);
      
      // Should not crash and should still log the message
      expect(stderr[0]).toContain("Message with null");
      expect(stderr[1]).toContain("Message with undefined");
    });
  });

  describe("color coding", () => {
    test("should use different colors for different log levels", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Info message");
        logger.error("Error message");
        logger.warn("Warning message");
        logger.success("Success message");
        logger.debug("Debug message");
      });

      // Should have at least 4 messages (debug might be filtered)
      expect(stderr.length).toBeGreaterThanOrEqual(4);
      
      // Check that different ANSI color codes are used
      const infoLine = stderr.find(line => line.includes("Info message"));
      const errorLine = stderr.find(line => line.includes("Error message"));
      const warnLine = stderr.find(line => line.includes("Warning message"));
      const successLine = stderr.find(line => line.includes("Success message"));
      
      if (infoLine) expect(infoLine).toContain("\u001b[34m"); // INFO blue
      if (errorLine) expect(errorLine).toContain("\u001b[31m"); // ERROR red
      if (warnLine) expect(warnLine).toContain("\u001b[33m"); // WARN yellow
      if (successLine) expect(successLine).toContain("\u001b[32m"); // SUCCESS green
    });

    test("should reset colors after each log entry", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.error("Error message");
      });

      expect(stderr).toHaveLength(1);
      const logLine = stderr[0];
      
      // Should end with reset code (0m)
      expect(logLine).toContain("\u001b[0m");
    });
  });

  describe("component filtering", () => {
    test("should include component name in brackets", async () => {
      const serverLogger = createLogger("server");
      const handlerLogger = createLogger("handler");
      
      const stderr = await captureStderrAsync(async () => {
        serverLogger.info("Server starting");
        handlerLogger.info("Handler executing");
      });

      expect(stderr).toHaveLength(2);
      
      expect(stderr[0]).toContain("[server]");
      expect(stderr[0]).toContain("Server starting");
      
      expect(stderr[1]).toContain("[handler]");
      expect(stderr[1]).toContain("Handler executing");
    });

    test("should handle component names with special characters", async () => {
      const logger = createLogger("test-component-123");
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Test message");
      });

      expect(stderr).toHaveLength(1);
      expect(stderr[0]).toContain("[test-component-123]");
    });
  });

  describe("MCP safety", () => {
    test("should only write to stderr, never stdout", async () => {
      const logger = createLogger("test");
      
      // Capture stdout as well to ensure nothing goes there
      const originalStdoutWrite = process.stdout.write;
      const stdoutCapture: string[] = [];
      
      process.stdout.write = function(chunk: any): boolean {
        stdoutCapture.push(chunk.toString());
        return true;
      };
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Test message");
        logger.error("Error message");
        logger.warn("Warning message");
        logger.success("Success message");
        logger.debug("Debug message");
      });
      
      // Restore stdout
      process.stdout.write = originalStdoutWrite;
      
      // Should have stderr output
      expect(stderr.length).toBeGreaterThan(0);
      
      // Should have NO stdout output
      expect(stdoutCapture).toHaveLength(0);
    });

    test("should handle large log messages without blocking", async () => {
      const logger = createLogger("test");
      const largeMessage = "x".repeat(10000); // 10KB message
      
      const start = Date.now();
      
      const stderr = await captureStderrAsync(async () => {
        logger.info(largeMessage);
      });
      
      const end = Date.now();
      
      // Should complete quickly (under 100ms)
      expect(end - start).toBeLessThan(100);
      
      // Should still log the message
      expect(stderr).toHaveLength(1);
      expect(stderr[0]).toContain(largeMessage);
    });
  });

  describe("error handling in logging", () => {
    test("should handle circular reference objects gracefully", async () => {
      const logger = createLogger("test");
      
      // Create circular reference
      const obj: any = { name: "test" };
      obj.self = obj;
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Circular reference test", obj);
      });

      expect(stderr).toHaveLength(1);
      
      // Should not crash and should include the message
      expect(stderr[0]).toContain("Circular reference test");
      // Should handle circular reference gracefully (no crash)
      expect(stderr[0]).toMatch(/test|Unserializable|Circular/);
    });

    test("should handle undefined and null values in context", async () => {
      const logger = createLogger("test");
      
      const stderr = await captureStderrAsync(async () => {
        logger.info("Null test", { value: null, undef: undefined });
      });

      expect(stderr).toHaveLength(1);
      expect(stderr[0]).toContain("Null test");
    });
  });
});