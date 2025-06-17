/**
 * Global test setup and utilities
 */

// Suppress console output during tests unless explicitly testing logging
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

export function suppressConsole() {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

export function restoreConsole() {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}

// Helper to capture stderr output for testing logging
export function captureStderr(fn: () => void | Promise<void>): string[] {
  const originalWrite = process.stderr.write;
  const captured: string[] = [];
  
  process.stderr.write = function(chunk: any): boolean {
    captured.push(chunk.toString());
    return true;
  };
  
  try {
    fn();
    return captured;
  } finally {
    process.stderr.write = originalWrite;
  }
}

// Helper to capture stderr output for async functions
export async function captureStderrAsync(fn: () => Promise<void>): Promise<string[]> {
  const originalWrite = process.stderr.write;
  const captured: string[] = [];
  
  process.stderr.write = function(chunk: any): boolean {
    captured.push(chunk.toString());
    return true;
  };
  
  try {
    await fn();
    return captured;
  } finally {
    process.stderr.write = originalWrite;
  }
}

// Test data factories
export const testFactories = {
  validContactArgs: () => ({
    name: "John Doe",
    limit: 10
  }),
  
  validCalendarArgs: () => ({
    searchText: "meeting",
    limit: 5
  }),
  
  validMessageArgs: () => ({
    phoneNumber: "+1234567890",
    message: "Test message"
  }),
  
  invalidArgs: () => ({
    // Missing required fields
  }),
  
  malformedArgs: () => ({
    name: 123, // Wrong type
    limit: "invalid" // Wrong type
  })
};

// Mock external dependencies
export const mockExternalDeps = {
  // Mock JXA run function
  mockJXASuccess: (returnValue: any = {}) => {
    return jest.fn().mockResolvedValue(returnValue);
  },
  
  mockJXAFailure: (error: string = "Mock JXA error") => {
    return jest.fn().mockRejectedValue(new Error(error));
  },
  
  // Mock AppleScript
  mockAppleScriptSuccess: (returnValue: string = "success") => {
    return jest.fn().mockResolvedValue(returnValue);
  },
  
  mockAppleScriptFailure: (error: string = "Mock AppleScript error") => {
    return jest.fn().mockRejectedValue(new Error(error));
  }
};

// Test timeout for async operations
export const TEST_TIMEOUT = 5000;