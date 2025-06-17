import { test, expect, describe } from "bun:test";
import { toolValidators } from "../../validation/ToolSchemas.js";

describe("Tool Validators", () => {
  describe("contacts validator", () => {
    test("should validate correct contacts search arguments", () => {
      const validArgs = {
        operation: "search",
        searchTerm: "John Doe",
        maxResults: 10
      };

      const result = toolValidators.contacts.validate(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should support legacy 'name' field", () => {
      const legacyArgs = {
        name: "John Doe",
        limit: 10
      };

      const result = toolValidators.contacts.validate(legacyArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject missing required fields", () => {
      const invalidArgs = {
        operation: "search",
        maxResults: 10
        // Missing searchTerm
      };

      const result = toolValidators.contacts.validate(invalidArgs);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should reject invalid operation", () => {
      const invalidArgs = {
        operation: "invalidOperation",
        searchTerm: "John"
      };

      const result = toolValidators.contacts.validate(invalidArgs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid operation: invalidOperation");
    });
  });

  describe("messages validator", () => {
    test("should validate send message arguments", () => {
      const validArgs = {
        operation: "send",
        phoneNumber: "+1234567890",
        message: "Hello, world!"
      };

      const result = toolValidators.messages.validate(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate read messages arguments", () => {
      const validArgs = {
        operation: "read",
        phoneNumber: "+1234567890",
        limit: 20
      };

      const result = toolValidators.messages.validate(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject invalid phone number format", () => {
      const invalidArgs = {
        operation: "send",
        phoneNumber: "not-a-phone",
        message: "Test"
      };

      const result = toolValidators.messages.validate(invalidArgs);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("calendar validator", () => {
    test("should validate search events arguments", () => {
      const validArgs = {
        operation: "search",
        searchText: "meeting",
        limit: 5,
        fromDate: "2024-01-01T00:00:00Z",
        toDate: "2024-12-31T23:59:59Z"
      };

      const result = toolValidators.calendar.validate(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate create event arguments", () => {
      const validArgs = {
        operation: "create",
        title: "Team Meeting",
        startDate: "2024-06-20T10:00:00Z",
        endDate: "2024-06-20T11:00:00Z",
        location: "Conference Room A",
        notes: "Quarterly review"
      };

      const result = toolValidators.calendar.validate(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject missing required create event fields", () => {
      const invalidArgs = {
        operation: "create",
        title: "Team Meeting"
        // Missing startDate and endDate
      };

      const result = toolValidators.calendar.validate(invalidArgs);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("mail validator", () => {
    test("should validate search mail arguments", () => {
      const validArgs = {
        operation: "search",
        searchTerm: "from:boss@company.com",
        limit: 10
      };

      const result = toolValidators.mail.validate(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate send mail arguments", () => {
      const validArgs = {
        operation: "send",
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email",
        cc: "cc@example.com"
      };

      const result = toolValidators.mail.validate(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject missing required send mail fields", () => {
      const invalidArgs = {
        operation: "send",
        subject: "Test Email"
        // Missing to and body
      };

      const result = toolValidators.mail.validate(invalidArgs);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("webSearch validator", () => {
    test("should validate web search arguments", () => {
      const validArgs = {
        query: "TypeScript testing best practices"
      };

      const result = toolValidators.webSearch.validate(validArgs);
      expect(result).toBe(true);
    });

    test("should reject empty query", () => {
      const invalidArgs = {
        query: ""
      };

      const result = toolValidators.webSearch.validate(invalidArgs);
      expect(result).toBe(false);
    });

    test("should reject missing query", () => {
      const invalidArgs = {};

      const result = toolValidators.webSearch.validate(invalidArgs);
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should handle null arguments", () => {
      const result = toolValidators.contacts.validate(null);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle undefined arguments", () => {
      const result = toolValidators.contacts.validate(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle non-object arguments", () => {
      const result = toolValidators.contacts.validate("string");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle empty object", () => {
      const result = toolValidators.contacts.validate({});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});