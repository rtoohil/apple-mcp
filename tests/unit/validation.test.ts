import { test, expect, describe } from "bun:test";
import { OperationValidator } from "../../validation/OperationValidator.js";
import { toolValidators } from "../../validation/ToolSchemas.js";

describe("OperationValidator", () => {
  const validator = new OperationValidator();

  describe("contacts tool validation", () => {
    test("should validate correct contacts arguments", () => {
      const validArgs = {
        name: "John Doe",
        limit: 10
      };

      const result = validator.validate(validArgs, ToolSchemas.contacts);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject missing required name field", () => {
      const invalidArgs = {
        limit: 10
      };

      const result = validator.validate(invalidArgs, ToolSchemas.contacts);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("name is required and must be a string");
    });

    test("should reject invalid name type", () => {
      const invalidArgs = {
        name: 123,
        limit: 10
      };

      const result = validator.validate(invalidArgs, ToolSchemas.contacts);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("name is required and must be a string");
    });

    test("should reject invalid limit type", () => {
      const invalidArgs = {
        name: "John Doe",
        limit: "invalid"
      };

      const result = validator.validate(invalidArgs, ToolSchemas.contacts);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("limit must be a number");
    });

    test("should allow optional limit field", () => {
      const validArgs = {
        name: "John Doe"
      };

      const result = validator.validate(validArgs, ToolSchemas.contacts);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("messages tool validation", () => {
    test("should validate correct send message arguments", () => {
      const validArgs = {
        phoneNumber: "+1234567890",
        message: "Hello, world!"
      };

      const result = validator.validate(validArgs, ToolSchemas.sendMessage);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject missing phone number", () => {
      const invalidArgs = {
        message: "Hello, world!"
      };

      const result = validator.validate(invalidArgs, ToolSchemas.sendMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("phoneNumber is required and must be a string");
    });

    test("should reject missing message", () => {
      const invalidArgs = {
        phoneNumber: "+1234567890"
      };

      const result = validator.validate(invalidArgs, ToolSchemas.sendMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("message is required and must be a string");
    });

    test("should validate read messages arguments", () => {
      const validArgs = {
        phoneNumber: "+1234567890",
        limit: 20
      };

      const result = validator.validate(validArgs, ToolSchemas.readMessages);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should allow optional limit in read messages", () => {
      const validArgs = {
        phoneNumber: "+1234567890"
      };

      const result = validator.validate(validArgs, ToolSchemas.readMessages);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("calendar tool validation", () => {
    test("should validate search events arguments", () => {
      const validArgs = {
        searchText: "meeting",
        limit: 5,
        fromDate: "2024-01-01T00:00:00Z",
        toDate: "2024-12-31T23:59:59Z"
      };

      const result = validator.validate(validArgs, ToolSchemas.searchEvents);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject missing search text", () => {
      const invalidArgs = {
        limit: 5
      };

      const result = validator.validate(invalidArgs, ToolSchemas.searchEvents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("searchText is required and must be a string");
    });

    test("should validate create event arguments", () => {
      const validArgs = {
        title: "Team Meeting",
        startDate: "2024-06-20T10:00:00Z",
        endDate: "2024-06-20T11:00:00Z",
        location: "Conference Room A",
        notes: "Quarterly review meeting",
        isAllDay: false,
        calendarName: "Work"
      };

      const result = validator.validate(validArgs, ToolSchemas.createEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject invalid date format", () => {
      const invalidArgs = {
        title: "Team Meeting",
        startDate: "invalid-date",
        endDate: "2024-06-20T11:00:00Z"
      };

      const result = validator.validate(invalidArgs, ToolSchemas.createEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("startDate must be a valid ISO 8601 date string");
    });
  });

  describe("mail tool validation", () => {
    test("should validate search mail arguments", () => {
      const validArgs = {
        query: "from:boss@company.com",
        mailbox: "INBOX",
        limit: 10
      };

      const result = validator.validate(validArgs, ToolSchemas.searchMail);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate send mail arguments", () => {
      const validArgs = {
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email",
        cc: "cc@example.com",
        bcc: "bcc@example.com"
      };

      const result = validator.validate(validArgs, ToolSchemas.sendMail);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject invalid email format", () => {
      const invalidArgs = {
        to: "invalid-email",
        subject: "Test Email",
        body: "This is a test email"
      };

      const result = validator.validate(invalidArgs, ToolSchemas.sendMail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("to must be a valid email address");
    });
  });

  describe("notes tool validation", () => {
    test("should validate create note arguments", () => {
      const validArgs = {
        title: "Meeting Notes",
        content: "Important discussion points",
        folder: "Work"
      };

      const result = validator.validate(validArgs, ToolSchemas.createNote);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate search notes arguments", () => {
      const validArgs = {
        query: "project planning",
        limit: 15
      };

      const result = validator.validate(validArgs, ToolSchemas.searchNotes);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("reminders tool validation", () => {
    test("should validate create reminder arguments", () => {
      const validArgs = {
        title: "Call dentist",
        dueDate: "2024-06-25T09:00:00Z",
        priority: "high",
        notes: "Schedule annual checkup",
        list: "Personal"
      };

      const result = validator.validate(validArgs, ToolSchemas.createReminder);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject invalid priority", () => {
      const invalidArgs = {
        title: "Call dentist",
        priority: "super-urgent" // Invalid priority
      };

      const result = validator.validate(invalidArgs, ToolSchemas.createReminder);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("priority must be one of: none, low, medium, high");
    });
  });

  describe("maps tool validation", () => {
    test("should validate search locations arguments", () => {
      const validArgs = {
        query: "coffee shops near me",
        limit: 5
      };

      const result = validator.validate(validArgs, ToolSchemas.searchLocations);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate get directions arguments", () => {
      const validArgs = {
        fromAddress: "123 Main St, Anytown",
        toAddress: "456 Oak Ave, Somewhere",
        transportType: "driving"
      };

      const result = validator.validate(validArgs, ToolSchemas.getDirections);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject invalid transport type", () => {
      const invalidArgs = {
        fromAddress: "123 Main St",
        toAddress: "456 Oak Ave",
        transportType: "teleportation" // Invalid transport type
      };

      const result = validator.validate(invalidArgs, ToolSchemas.getDirections);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("transportType must be one of: driving, walking, transit");
    });
  });

  describe("photos tool validation", () => {
    test("should validate search photos arguments", () => {
      const validArgs = {
        searchText: "vacation",
        limit: 20
      };

      const result = validator.validate(validArgs, ToolSchemas.searchPhotos);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate search photos by date arguments", () => {
      const validArgs = {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
        limit: 50
      };

      const result = validator.validate(validArgs, ToolSchemas.searchPhotosByDate);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("web search tool validation", () => {
    test("should validate web search arguments", () => {
      const validArgs = {
        query: "TypeScript testing best practices"
      };

      const result = validator.validate(validArgs, ToolSchemas.webSearch);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject empty query", () => {
      const invalidArgs = {
        query: ""
      };

      const result = validator.validate(invalidArgs, ToolSchemas.webSearch);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("query is required and must be a non-empty string");
    });
  });

  describe("edge cases", () => {
    test("should handle null arguments", () => {
      const result = validator.validate(null, ToolSchemas.contacts);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle undefined arguments", () => {
      const result = validator.validate(undefined, ToolSchemas.contacts);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle non-object arguments", () => {
      const result = validator.validate("string", ToolSchemas.contacts);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle empty object", () => {
      const result = validator.validate({}, ToolSchemas.contacts);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("name is required and must be a string");
    });
  });
});