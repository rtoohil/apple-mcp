import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { BaseToolHandler } from "../../handlers/BaseToolHandler.js";
import { HandlerRegistry } from "../../handlers/HandlerRegistry.js";
import { ResponseBuilder } from "../../handlers/ResponseBuilder.js";
import { ContactsHandler } from "../../handlers/ContactsHandler.js";
import { ToolSchemas } from "../../validation/ToolSchemas.js";
import { suppressConsole, restoreConsole } from "../test-setup.js";

// Mock module for testing
const mockContactsModule = {
  searchContacts: mock().mockResolvedValue([
    {
      name: "John Doe",
      phones: ["+1234567890"],
      emails: ["john@example.com"],
      organization: "Acme Corp"
    }
  ])
};

// Test implementation of BaseToolHandler
class TestHandler extends BaseToolHandler<any, any> {
  constructor(
    private mockModule: any = {},
    private shouldValidate: boolean = true
  ) {
    super("test");
  }

  validateArgs(args: unknown): args is any {
    return this.shouldValidate;
  }

  async loadModule(): Promise<any> {
    return this.mockModule;
  }

  async handleOperation(args: any, module: any): Promise<any> {
    const result = await module.testMethod(args);
    return this.createSuccessResponse(`Test result: ${result}`);
  }
}

describe("BaseToolHandler", () => {
  beforeEach(() => {
    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe("handle method", () => {
    test("should successfully handle valid arguments", async () => {
      const mockModule = {
        testMethod: mock().mockResolvedValue("test result")
      };
      
      const handler = new TestHandler(mockModule, true);
      const args = { test: "value" };

      const result = await handler.handle(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("test result");
      expect(mockModule.testMethod).toHaveBeenCalledWith(args);
    });

    test("should return error for invalid arguments", async () => {
      const handler = new TestHandler({}, false); // Will fail validation
      const args = { invalid: "args" };

      const result = await handler.handle(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid arguments");
    });

    test("should handle module loading errors", async () => {
      class FailingHandler extends TestHandler {
        async loadModule(): Promise<any> {
          throw new Error("Module loading failed");
        }
      }

      const handler = new FailingHandler({}, true);
      const args = { test: "value" };

      const result = await handler.handle(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Module loading failed");
    });

    test("should handle operation execution errors", async () => {
      const mockModule = {
        testMethod: mock().mockRejectedValue(new Error("Operation failed"))
      };

      const handler = new TestHandler(mockModule, true);
      const args = { test: "value" };

      const result = await handler.handle(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Operation failed");
    });

    test("should handle unexpected errors gracefully", async () => {
      class ErrorHandler extends TestHandler {
        async handleOperation(): Promise<any> {
          throw "String error"; // Non-Error object
        }
      }

      const handler = new ErrorHandler({}, true);
      const args = { test: "value" };

      const result = await handler.handle(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBeDefined();
    });
  });
});

describe("ContactsHandler", () => {
  beforeEach(() => {
    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  test("should validate correct contacts arguments", () => {
    const handler = new ContactsHandler();
    const validArgs = {
      name: "John Doe",
      maxResults: 10
    };

    expect(handler.validateArgs(validArgs)).toBe(true);
  });

  test("should reject invalid contacts arguments", () => {
    const handler = new ContactsHandler();
    const invalidArgs = {
      limit: 10
      // Missing required 'name' field
    };

    expect(handler.validateArgs(invalidArgs)).toBe(false);
  });

  test("should handle contacts search successfully", async () => {
    const handler = new ContactsHandler();
    
    // Mock the loadModule method directly on the instance
    handler.loadModule = mock().mockResolvedValue(mockContactsModule);

    const args = {
      name: "John Doe",
      maxResults: 10
    };

    const result = await handler.handle(args);

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBeDefined();
    expect(mockContactsModule.searchContacts).toHaveBeenCalledWith("John Doe");
  });
});

describe("HandlerRegistry", () => {
  beforeEach(() => {
    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  test("should handle registered tools", async () => {
    const registry = new HandlerRegistry();
    
    // Mock a successful handler
    const mockHandler = {
      handle: mock().mockResolvedValue({
        content: [{ type: "text", text: "test result" }],
        isError: false
      })
    };

    // Temporarily replace the contacts handler
    const originalHandler = registry.handlers.get("contacts");
    registry.handlers.set("contacts", mockHandler as any);

    const result = await registry.handle("contacts", { name: "John" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe("test result");
    expect(mockHandler.handle).toHaveBeenCalledWith({ name: "John" });

    // Restore original handler
    if (originalHandler) {
      registry.handlers.set("contacts", originalHandler);
    }
  });

  test("should return error for unknown tools", async () => {
    const registry = new HandlerRegistry();

    const result = await registry.handle("unknownTool", {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool: unknownTool");
  });

  test("should handle handler errors gracefully", async () => {
    const registry = new HandlerRegistry();
    
    // Mock a failing handler that returns proper error format
    const mockHandler = {
      handle: mock().mockResolvedValue({
        content: [{ type: "text", text: "❌ Handler error" }],
        isError: true
      })
    };

    // Temporarily replace the contacts handler
    const originalHandler = registry.handlers.get("contacts");
    registry.handlers.set("contacts", mockHandler as any);

    const result = await registry.handle("contacts", { name: "John" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Handler error");

    // Restore original handler
    if (originalHandler) {
      registry.handlers.set("contacts", originalHandler);
    }
  });

  test("should have all expected handlers registered", () => {
    const registry = new HandlerRegistry();
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

    for (const tool of expectedTools) {
      expect(registry.handlers.has(tool)).toBe(true);
    }
  });
});

describe("ResponseBuilder", () => {
  describe("formatContact", () => {
    test("should format complete contact information", () => {
      const contact = {
        name: "John Doe",
        phones: ["+1234567890", "+0987654321"],
        emails: ["john@example.com", "john.doe@work.com"],
        organization: "Acme Corp",
        jobTitle: "Software Engineer",
        addresses: ["123 Main St, Anytown"],
        birthday: "1990-01-15",
        notes: "Important client contact"
      };

      const formatted = ResponseBuilder.formatContact(contact);

      expect(formatted).toContain("**John Doe**");
      expect(formatted).toContain("📞 +1234567890, +0987654321");
      expect(formatted).toContain("✉️ john@example.com, john.doe@work.com");
      expect(formatted).toContain("🏢 Acme Corp");
      expect(formatted).toContain("💼 Software Engineer");
      expect(formatted).toContain("🏠 123 Main St, Anytown");
      expect(formatted).toContain("🎂 1990-01-15");
      expect(formatted).toContain("📝 Important client contact");
    });

    test("should format contact with minimal information", () => {
      const contact = {
        name: "Jane Smith",
        phones: [],
        emails: []
      };

      const formatted = ResponseBuilder.formatContact(contact);

      expect(formatted).toContain("**Jane Smith**");
      expect(formatted).toContain("📞 No phone numbers");
      expect(formatted).toContain("✉️ No email addresses");
    });

    test("should include confidence score when requested", () => {
      const contact = {
        name: "John Doe",
        phones: ["+1234567890"],
        emails: ["john@example.com"],
        confidence: 0.95
      };

      const formatted = ResponseBuilder.formatContact(contact, true);

      expect(formatted).toContain("**John Doe**");
      expect(formatted).toContain("🎯 Confidence: 95%");
    });
  });

  describe("formatCalendarEvent", () => {
    test("should format complete calendar event", () => {
      const event = {
        title: "Team Meeting",
        startDate: "2024-06-20T10:00:00Z",
        endDate: "2024-06-20T11:00:00Z",
        location: "Conference Room A",
        notes: "Quarterly review meeting",
        calendarName: "Work",
        isAllDay: false,
        url: "https://calendar.example.com/event/123"
      };

      const formatted = ResponseBuilder.formatCalendarEvent(event);

      expect(formatted).toContain("**Team Meeting**");
      expect(formatted).toContain("📅 June 20, 2024 at 10:00 AM - 11:00 AM");
      expect(formatted).toContain("📍 Conference Room A");
      expect(formatted).toContain("📝 Quarterly review meeting");
      expect(formatted).toContain("📚 Work");
      expect(formatted).toContain("🔗 https://calendar.example.com/event/123");
    });

    test("should format all-day event", () => {
      const event = {
        title: "Holiday",
        startDate: "2024-07-04T00:00:00Z",
        endDate: "2024-07-04T23:59:59Z",
        isAllDay: true
      };

      const formatted = ResponseBuilder.formatCalendarEvent(event);

      expect(formatted).toContain("**Holiday**");
      expect(formatted).toContain("📅 July 4, 2024 (All day)");
    });
  });

  describe("formatMessage", () => {
    test("should format message with all fields", () => {
      const message = {
        content: "Hello, how are you?",
        date: "2024-06-17T14:30:00Z",
        sender: "+1234567890",
        is_from_me: false,
        url: "https://example.com/link"
      };

      const formatted = ResponseBuilder.formatMessage(message);

      expect(formatted).toContain("**From: +1234567890**");
      expect(formatted).toContain("🕐 June 17, 2024 at 2:30 PM");
      expect(formatted).toContain("💬 Hello, how are you?");
      expect(formatted).toContain("🔗 https://example.com/link");
    });

    test("should format message from user", () => {
      const message = {
        content: "This is my message",
        date: "2024-06-17T14:30:00Z",
        sender: "+1234567890",
        is_from_me: true
      };

      const formatted = ResponseBuilder.formatMessage(message);

      expect(formatted).toContain("**From: You**");
    });
  });

  describe("formatEmailMessage", () => {
    test("should format complete email", () => {
      const email = {
        subject: "Important Meeting",
        sender: "boss@company.com",
        date: "2024-06-17T09:00:00Z",
        snippet: "Please join us for the quarterly review...",
        messageId: "12345",
        url: "mail://message/12345"
      };

      const formatted = ResponseBuilder.formatEmailMessage(email);

      expect(formatted).toContain("**Important Meeting**");
      expect(formatted).toContain("👤 boss@company.com");
      expect(formatted).toContain("🕐 June 17, 2024 at 9:00 AM");
      expect(formatted).toContain("📧 Please join us for the quarterly review...");
      expect(formatted).toContain("🔗 mail://message/12345");
    });
  });

  describe("success and error methods", () => {
    test("should create success response", () => {
      const data = { result: "test" };
      const response = ResponseBuilder.legacySuccess(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
    });

    test("should create error response", () => {
      const message = "Test error";
      const details = "Additional details";
      const response = ResponseBuilder.legacyError(message, details);

      expect(response.success).toBe(false);
      expect(response.error).toBe(message);
      expect(response.details).toBe(details);
      expect(response.data).toBeUndefined();
    });
  });
});