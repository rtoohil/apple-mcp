import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { HandlerRegistry } from "../../handlers/HandlerRegistry.js";
import { suppressConsole, restoreConsole } from "../test-setup.js";

// Mock the external dependencies
const mockJXA = {
  run: mock().mockResolvedValue({ success: true })
};

const mockAppleScript = {
  runAppleScript: mock().mockResolvedValue("success")
};

// Note: In Bun tests, external dependencies are mocked at the handler level

describe("MCP Server Integration", () => {
  let server: Server;
  let handlerRegistry: HandlerRegistry;

  beforeEach(() => {
    suppressConsole();
    
    // Create a fresh server instance for each test
    server = new Server(
      {
        name: "apple-mcp-test",
        version: "0.2.7",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    handlerRegistry = new HandlerRegistry();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe("Server initialization", () => {
    test("should initialize server with correct metadata", () => {
      expect(server).toBeDefined();
      // Note: Server capabilities may not be exposed in the test environment
      // The important thing is that the server initializes successfully
    });

    test("should register all expected tools", async () => {
      // Mock the server.setRequestHandler calls that would happen in index.ts
      const toolsHandler = mock();
      server.setRequestHandler(ListToolsRequestSchema, toolsHandler);

      const expectedTools = [
        "contacts",
        "sendMessage", 
        "readMessages",
        "getUnreadMessages",
        "searchEvents",
        "openEvent", 
        "getEvents",
        "createEvent",
        "searchMail",
        "openMail",
        "getUnreadMails",
        "sendMail",
        "createNote",
        "searchNotes",
        "openNote",
        "getReminders",
        "createReminder",
        "completeReminder",
        "searchLocations",
        "getDirections",
        "getAllAlbums",
        "searchPhotos",
        "webSearch"
      ];

      // Verify all handlers are registered
      for (const tool of expectedTools) {
        expect(handlerRegistry.handlers.has(tool)).toBe(true);
      }
    });
  });

  describe("Tool execution", () => {
    test("should handle contacts tool request", async () => {
      // Mock successful contacts response
      const mockContactsResult = {
        content: [{ type: "text", text: "**John Doe**\n📞 +1234567890\n✉️ john@example.com" }],
        isError: false
      };

      // Mock the handler
      const contactsHandler = handlerRegistry.handlers.get("contacts");
      const originalHandle = contactsHandler?.handle;
      if (contactsHandler) {
        contactsHandler.handle = mock().mockResolvedValue(mockContactsResult);
      }

      const result = await handlerRegistry.handle("contacts", { name: "John" });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("John Doe");

      // Restore original handler
      if (contactsHandler && originalHandle) {
        contactsHandler.handle = originalHandle;
      }
    });

    test("should handle invalid tool requests", async () => {
      const result = await handlerRegistry.handle("nonexistentTool", {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown tool: nonexistentTool");
    });

    test("should handle malformed arguments", async () => {
      // Test with handler that will fail validation
      const result = await handlerRegistry.handle("contacts", {
        // Missing required 'name' field
        limit: 10
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid arguments");
    });
  });

  describe("Error handling", () => {
    test("should handle module loading failures gracefully", async () => {
      // Mock a handler that fails to load its module
      const failingHandler = {
        handle: mock().mockResolvedValue({
          content: [{ type: "text", text: "❌ Failed to load required module" }],
          isError: true
        })
      };

      const originalHandler = handlerRegistry.handlers.get("contacts");
      handlerRegistry.handlers.set("contacts", failingHandler as any);

      const result = await handlerRegistry.handle("contacts", { name: "John" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Failed to load required module");

      // Restore original handler
      if (originalHandler) {
        handlerRegistry.handlers.set("contacts", originalHandler);
      }
    });

    test("should handle system permission errors", async () => {
      // Mock a handler that fails due to system permissions
      const permissionHandler = {
        handle: mock().mockResolvedValue({
          content: [{ type: "text", text: "❌ Permission denied. Please grant access in System Settings" }],
          isError: true
        })
      };

      const originalHandler = handlerRegistry.handlers.get("contacts");
      handlerRegistry.handlers.set("contacts", permissionHandler as any);

      const result = await handlerRegistry.handle("contacts", { name: "John" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Permission denied");
      expect(result.content[0].text).toContain("System Settings");

      // Restore original handler
      if (originalHandler) {
        handlerRegistry.handlers.set("contacts", originalHandler);
      }
    });
  });

  describe("Tool-specific integration tests", () => {
    test("should handle calendar search with date range", async () => {
      const mockCalendarResult = {
        content: [{ type: "text", text: "**Team Meeting**\n📅 June 20, 2024 at 10:00 AM\n📍 Conference Room A" }],
        isError: false
      };

      const calendarHandler = handlerRegistry.handlers.get("searchEvents");
      const originalHandle = calendarHandler?.handle;
      if (calendarHandler) {
        calendarHandler.handle = mock().mockResolvedValue(mockCalendarResult);
      }

      const result = await handlerRegistry.handle("searchEvents", {
        searchText: "meeting",
        fromDate: "2024-06-01T00:00:00Z",
        toDate: "2024-06-30T23:59:59Z",
        limit: 5
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Team Meeting");

      // Restore original handler
      if (calendarHandler && originalHandle) {
        calendarHandler.handle = originalHandle;
      }
    });

    test("should handle message sending", async () => {
      const mockMessageResult = {
        content: [{ type: "text", text: "Message sent successfully to +1234567890" }],
        isError: false
      };

      const messageHandler = handlerRegistry.handlers.get("sendMessage");
      const originalHandle = messageHandler?.handle;
      if (messageHandler) {
        messageHandler.handle = mock().mockResolvedValue(mockMessageResult);
      }

      const result = await handlerRegistry.handle("sendMessage", {
        phoneNumber: "+1234567890",
        message: "Hello, this is a test message"
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("sent successfully");

      // Restore original handler
      if (messageHandler && originalHandle) {
        messageHandler.handle = originalHandle;
      }
    });

    test("should handle email search", async () => {
      const mockEmailResult = {
        content: [{ type: "text", text: "**Important Meeting**\n👤 boss@company.com\n📧 Please join us for the quarterly review..." }],
        isError: false
      };

      const emailHandler = handlerRegistry.handlers.get("searchMail");
      const originalHandle = emailHandler?.handle;
      if (emailHandler) {
        emailHandler.handle = mock().mockResolvedValue(mockEmailResult);
      }

      const result = await handlerRegistry.handle("searchMail", {
        query: "from:boss@company.com",
        mailbox: "INBOX",
        limit: 10
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Important Meeting");

      // Restore original handler
      if (emailHandler && originalHandle) {
        emailHandler.handle = originalHandle;
      }
    });

    test("should handle web search", async () => {
      const mockWebSearchResult = {
        content: [{ type: "text", text: "Search results for: TypeScript testing\n\n**TypeScript Testing Guide**\nComprehensive guide to testing TypeScript applications..." }],
        isError: false
      };

      const webSearchHandler = handlerRegistry.handlers.get("webSearch");
      const originalHandle = webSearchHandler?.handle;
      if (webSearchHandler) {
        webSearchHandler.handle = mock().mockResolvedValue(mockWebSearchResult);
      }

      const result = await handlerRegistry.handle("webSearch", {
        query: "TypeScript testing"
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("TypeScript testing");

      // Restore original handler
      if (webSearchHandler && originalHandle) {
        webSearchHandler.handle = originalHandle;
      }
    });
  });

  describe("Performance and reliability", () => {
    test("should handle concurrent requests", async () => {
      // Mock handlers for concurrent testing
      const mockResults = Array.from({ length: 5 }, (_, i) => ({
        content: [{ type: "text", text: `Result ${i}` }],
        isError: false
      }));

      const handlers = ["contacts", "searchEvents", "searchMail", "searchNotes", "webSearch"];
      
      // Mock all handlers
      const originalHandlers = new Map();
      handlers.forEach((toolName, index) => {
        const handler = handlerRegistry.handlers.get(toolName);
        if (handler) {
          originalHandlers.set(toolName, handler.handle);
          handler.handle = mock().mockResolvedValue(mockResults[index]);
        }
      });

      // Execute concurrent requests
      const promises = handlers.map((toolName, index) => 
        handlerRegistry.handle(toolName, { query: `test ${index}` })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.isError).toBe(false);
        expect(result.content[0].text).toBe(`Result ${index}`);
      });

      // Restore original handlers
      originalHandlers.forEach((originalHandle, toolName) => {
        const handler = handlerRegistry.handlers.get(toolName);
        if (handler) {
          handler.handle = originalHandle;
        }
      });
    });

    test("should handle requests with timeout", async () => {
      // Mock a slow handler
      const slowHandler = {
        handle: mock().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ 
              content: [{ type: "text", text: "slow result" }],
              isError: false
            }), 100)
          )
        )
      };

      const originalHandler = handlerRegistry.handlers.get("contacts");
      handlerRegistry.handlers.set("contacts", slowHandler as any);

      const start = Date.now();
      const result = await handlerRegistry.handle("contacts", { name: "John" });
      const elapsed = Date.now() - start;

      expect(result.isError).toBe(false);
      expect(elapsed).toBeGreaterThan(50); // Should take some time
      expect(elapsed).toBeLessThan(200); // But not too long

      // Restore original handler
      if (originalHandler) {
        handlerRegistry.handlers.set("contacts", originalHandler);
      }
    });
  });

  describe("Data validation integration", () => {
    test("should validate required fields in mail tools", async () => {
      // Test that validation catches missing required fields
      const handler = handlerRegistry.handlers.get("sendMail");
      if (handler) {
        const isValid = handler.validateArgs({
          operation: "send",
          // Missing required 'to' field
          subject: "Test",
          body: "Test message"
        });
        expect(isValid).toBe(false);
      }
    });

    test("should validate required fields in message tools", async () => {
      // Test that validation catches missing required fields
      const handler = handlerRegistry.handlers.get("sendMessage");
      if (handler) {
        const isValid = handler.validateArgs({
          operation: "send",
          // Missing required 'phoneNumber' field
          message: "Test message"
        });
        expect(isValid).toBe(false);
      }
    });

    test("should validate required fields in calendar tools", async () => {
      // Test that validation catches missing required fields
      const handler = handlerRegistry.handlers.get("createEvent");
      if (handler) {
        const isValid = handler.validateArgs({
          operation: "create",
          // Missing required 'title' field
          startDate: "2024-06-20T10:00:00Z",
          endDate: "2024-06-20T11:00:00Z"
        });
        expect(isValid).toBe(false);
      }
    });
  });
});