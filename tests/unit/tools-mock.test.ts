import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { HandlerRegistry } from "../../handlers/HandlerRegistry.js";
import { mockModules, mockData, simulateErrors } from "../mocks/external-deps.js";
import { suppressConsole, restoreConsole } from "../test-setup.js";

describe("Tool Mock Tests", () => {
  let handlerRegistry: HandlerRegistry;
  let originalHandlers: Map<string, any>;

  beforeEach(() => {
    suppressConsole();
    handlerRegistry = new HandlerRegistry();
    originalHandlers = new Map();
  });

  afterEach(() => {
    restoreConsole();
    // Restore original handlers
    originalHandlers.forEach((handler, toolName) => {
      handlerRegistry.handlers.set(toolName, handler);
    });
  });

  const mockHandler = (toolName: string, mockResult: any) => {
    const original = handlerRegistry.handlers.get(toolName);
    if (original) {
      originalHandlers.set(toolName, original);
    }
    
    handlerRegistry.handlers.set(toolName, {
      handle: mock().mockResolvedValue(mockResult)
    });
  };

  describe("Contacts Tool", () => {
    test("should search contacts successfully", async () => {
      const mockResult = {
        success: true,
        data: "**John Doe**\n📞 +1234567890\n✉️ john@example.com\n🏢 Acme Corp"
      };
      
      mockHandler("contacts", mockResult);

      const result = await handlerRegistry.handle("contacts", {
        name: "John Doe",
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("John Doe");
      expect(result.data).toContain("+1234567890");
    });

    test("should handle contacts permission denied", async () => {
      const mockResult = {
        success: false,
        error: "Permission denied",
        details: "Cannot access Contacts app. Please grant access in System Settings."
      };
      
      mockHandler("contacts", mockResult);

      const result = await handlerRegistry.handle("contacts", {
        name: "John Doe"
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
      expect(result.details).toContain("System Settings");
    });

    test("should handle no contacts found", async () => {
      const mockResult = {
        success: true,
        data: "No contacts found matching 'NonexistentPerson'"
      };
      
      mockHandler("contacts", mockResult);

      const result = await handlerRegistry.handle("contacts", {
        name: "NonexistentPerson"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("No contacts found");
    });
  });

  describe("Messages Tool", () => {
    test("should send message successfully", async () => {
      const mockResult = {
        success: true,
        data: "Message sent successfully to +1234567890"
      };
      
      mockHandler("sendMessage", mockResult);

      const result = await handlerRegistry.handle("sendMessage", {
        phoneNumber: "+1234567890",
        message: "Hello, this is a test message"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("sent successfully");
    });

    test("should read messages successfully", async () => {
      const mockResult = {
        success: true,
        data: "**From: +1234567890**\n🕐 June 17, 2024 at 2:30 PM\n💬 Hello, how are you?\n\n**From: You**\n🕐 June 17, 2024 at 2:32 PM\n💬 I'm doing well, thanks!"
      };
      
      mockHandler("readMessages", mockResult);

      const result = await handlerRegistry.handle("readMessages", {
        phoneNumber: "+1234567890",
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Hello, how are you?");
      expect(result.data).toContain("I'm doing well, thanks!");
    });

    test("should get unread messages", async () => {
      const mockResult = {
        success: true,
        data: "**From: +1234567890**\n🕐 June 17, 2024 at 3:00 PM\n💬 New unread message\n\n**From: +0987654321**\n🕐 June 17, 2024 at 3:15 PM\n💬 Another unread message"
      };
      
      mockHandler("getUnreadMessages", mockResult);

      const result = await handlerRegistry.handle("getUnreadMessages", {
        limit: 20
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("New unread message");
      expect(result.data).toContain("Another unread message");
    });

    test("should handle messages permission denied", async () => {
      const mockResult = {
        success: false,
        error: "Permission denied",
        details: "Cannot access Messages database. Please grant Full Disk Access."
      };
      
      mockHandler("sendMessage", mockResult);

      const result = await handlerRegistry.handle("sendMessage", {
        phoneNumber: "+1234567890",
        message: "Test"
      });

      expect(result.success).toBe(false);
      expect(result.details).toContain("Full Disk Access");
    });
  });

  describe("Calendar Tool", () => {
    test("should search calendar events", async () => {
      const mockResult = {
        success: true,
        data: "**Team Meeting**\n📅 June 20, 2024 at 10:00 AM - 11:00 AM\n📍 Conference Room A\n📝 Quarterly review meeting\n📚 Work\n\n**Doctor Appointment**\n📅 June 21, 2024 at 2:00 PM - 3:00 PM\n📍 Medical Center\n📚 Personal"
      };
      
      mockHandler("searchEvents", mockResult);

      const result = await handlerRegistry.handle("searchEvents", {
        searchText: "meeting",
        limit: 5
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Team Meeting");
      expect(result.data).toContain("Conference Room A");
    });

    test("should create calendar event", async () => {
      const mockResult = {
        success: true,
        data: "Event 'Team Standup' created successfully in Work calendar for June 22, 2024 at 9:00 AM"
      };
      
      mockHandler("createEvent", mockResult);

      const result = await handlerRegistry.handle("createEvent", {
        title: "Team Standup",
        startDate: "2024-06-22T09:00:00Z",
        endDate: "2024-06-22T09:30:00Z",
        calendarName: "Work"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("created successfully");
    });

    test("should get calendar events", async () => {
      const mockResult = {
        success: true,
        data: "**Lunch Meeting**\n📅 June 18, 2024 at 12:00 PM - 1:00 PM\n📍 Restaurant Downtown\n\n**Project Review**\n📅 June 19, 2024 at 3:00 PM - 4:00 PM\n📍 Meeting Room B"
      };
      
      mockHandler("getEvents", mockResult);

      const result = await handlerRegistry.handle("getEvents", {
        limit: 10,
        fromDate: "2024-06-18T00:00:00Z",
        toDate: "2024-06-25T23:59:59Z"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Lunch Meeting");
      expect(result.data).toContain("Project Review");
    });

    test("should open calendar event", async () => {
      const mockResult = {
        success: true,
        data: "Successfully opened event 'Team Meeting' in Calendar app"
      };
      
      mockHandler("openEvent", mockResult);

      const result = await handlerRegistry.handle("openEvent", {
        eventId: "event-123"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Successfully opened");
    });
  });

  describe("Mail Tool", () => {
    test("should search mail", async () => {
      const mockResult = {
        success: true,
        data: "**Important Meeting**\n👤 boss@company.com\n🕐 June 17, 2024 at 9:00 AM\n📧 Please join us for the quarterly review...\n🔗 mail://message/12345\n\n**Project Update**\n👤 colleague@company.com\n🕐 June 17, 2024 at 11:30 AM\n📧 The project is on track...\n🔗 mail://message/12346"
      };
      
      mockHandler("searchMail", mockResult);

      const result = await handlerRegistry.handle("searchMail", {
        query: "from:boss@company.com",
        mailbox: "INBOX",
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Important Meeting");
      expect(result.data).toContain("boss@company.com");
    });

    test("should send email", async () => {
      const mockResult = {
        success: true,
        data: "Email sent successfully to recipient@example.com with subject 'Test Email'"
      };
      
      mockHandler("sendMail", mockResult);

      const result = await handlerRegistry.handle("sendMail", {
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email body"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("sent successfully");
    });

    test("should get unread mails", async () => {
      const mockResult = {
        success: true,
        data: "**New Feature Request**\n👤 client@company.com\n🕐 June 17, 2024 at 4:00 PM\n📧 We would like to request a new feature...\n🔗 mail://message/12347\n\nFound 1 unread emails"
      };
      
      mockHandler("getUnreadMails", mockResult);

      const result = await handlerRegistry.handle("getUnreadMails", {
        limit: 20
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("New Feature Request");
    });

    test("should open mail", async () => {
      const mockResult = {
        success: true,
        data: "Successfully opened email 'Important Meeting' in Mail app"
      };
      
      mockHandler("openMail", mockResult);

      const result = await handlerRegistry.handle("openMail", {
        messageId: "12345"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Successfully opened");
    });
  });

  describe("Notes Tool", () => {
    test("should create note", async () => {
      const mockResult = {
        success: true,
        data: "Note 'Meeting Notes' created successfully in Work folder\n🔗 notes://note/new-note-123"
      };
      
      mockHandler("createNote", mockResult);

      const result = await handlerRegistry.handle("createNote", {
        title: "Meeting Notes",
        content: "Important discussion points from today's meeting",
        folder: "Work"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("created successfully");
    });

    test("should search notes", async () => {
      const mockResult = {
        success: true,
        data: "**Meeting Notes**\n📁 Work\n🕐 June 17, 2024 at 10:00 AM\n📝 Important discussion points...\n🔗 notes://note/1\n\n**Project Planning**\n📁 Work\n🕐 June 16, 2024 at 3:00 PM\n📝 Planning for next quarter...\n🔗 notes://note/2"
      };
      
      mockHandler("searchNotes", mockResult);

      const result = await handlerRegistry.handle("searchNotes", {
        query: "project planning",
        limit: 15
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Meeting Notes");
      expect(result.data).toContain("Project Planning");
    });

    test("should open note", async () => {
      const mockResult = {
        success: true,
        data: "Successfully opened note 'Meeting Notes' in Notes app"
      };
      
      mockHandler("openNote", mockResult);

      const result = await handlerRegistry.handle("openNote", {
        noteId: "note-123"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Successfully opened");
    });
  });

  describe("Reminders Tool", () => {
    test("should get reminders", async () => {
      const mockResult = {
        success: true,
        data: "**Call dentist** (Personal)\n🔴 High Priority\n📅 Due: June 25, 2024 at 9:00 AM\n📝 Schedule annual checkup\n\n**Submit report** (Work)\n🟡 Medium Priority\n📅 Due: June 18, 2024 at 5:00 PM"
      };
      
      mockHandler("getReminders", mockResult);

      const result = await handlerRegistry.handle("getReminders", {
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Call dentist");
      expect(result.data).toContain("Submit report");
    });

    test("should create reminder", async () => {
      const mockResult = {
        success: true,
        data: "Reminder 'Buy groceries' created successfully in Personal list with low priority"
      };
      
      mockHandler("createReminder", mockResult);

      const result = await handlerRegistry.handle("createReminder", {
        title: "Buy groceries",
        priority: "low",
        list: "Personal"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("created successfully");
    });

    test("should complete reminder", async () => {
      const mockResult = {
        success: true,
        data: "Reminder 'Call dentist' marked as completed"
      };
      
      mockHandler("completeReminder", mockResult);

      const result = await handlerRegistry.handle("completeReminder", {
        reminderId: "reminder-123"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("marked as completed");
    });
  });

  describe("Maps Tool", () => {
    test("should search locations", async () => {
      const mockResult = {
        success: true,
        data: "**Starbucks Coffee**\n📍 123 Main Street\n⭐ 4.5/5\n📞 (555) 123-4567\n\n**Blue Bottle Coffee**\n📍 456 Oak Avenue\n⭐ 4.7/5\n📞 (555) 987-6543\n\nFound 2 locations for 'coffee shops near me'"
      };
      
      mockHandler("searchLocations", mockResult);

      const result = await handlerRegistry.handle("searchLocations", {
        query: "coffee shops near me",
        limit: 5
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Starbucks Coffee");
      expect(result.data).toContain("Blue Bottle Coffee");
    });

    test("should get directions", async () => {
      const mockResult = {
        success: true,
        data: "Displaying directions from '123 Main St' to '456 Oak Ave' by driving\n🚗 Estimated time: 15 minutes\n📏 Distance: 5.2 miles\n\nRoute opened in Maps app"
      };
      
      mockHandler("getDirections", mockResult);

      const result = await handlerRegistry.handle("getDirections", {
        fromAddress: "123 Main St",
        toAddress: "456 Oak Ave",
        transportType: "driving"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("Displaying directions");
      expect(result.data).toContain("15 minutes");
    });
  });

  describe("Photos Tool", () => {
    test("should get all albums", async () => {
      const mockResult = {
        success: true,
        data: "**2024 Vacation** (25 photos)\n**Family Photos** (156 photos)\n**Screenshots** (43 photos)\n**Favorites** (12 photos)\n\nFound 4 albums"
      };
      
      mockHandler("getAllAlbums", mockResult);

      const result = await handlerRegistry.handle("getAllAlbums", {});

      expect(result.success).toBe(true);
      expect(result.data).toContain("2024 Vacation");
      expect(result.data).toContain("Family Photos");
    });

    test("should search photos", async () => {
      const mockResult = {
        success: true,
        data: "**vacation-sunset.jpg**\n📅 June 1, 2024\n⭐ Favorite\n📏 1920x1080\n📚 Albums: 2024 Vacation\n🏷️ Keywords: vacation, sunset, beach\n\n**beach-family.jpg**\n📅 June 2, 2024\n📏 1600x1200\n📚 Albums: 2024 Vacation, Family Photos\n\nFound 2 photos matching 'vacation'"
      };
      
      mockHandler("searchPhotos", mockResult);

      const result = await handlerRegistry.handle("searchPhotos", {
        searchText: "vacation",
        limit: 20
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("vacation-sunset.jpg");
      expect(result.data).toContain("beach-family.jpg");
    });
  });

  describe("Web Search Tool", () => {
    test("should perform web search", async () => {
      const mockResult = {
        success: true,
        data: "**TypeScript Testing Best Practices**\n🌐 example.com\n📄 Learn the best practices for testing TypeScript applications with modern tools and techniques.\n\n**Advanced Testing Strategies**\n🌐 dev.example.com\n📄 Deep dive into advanced testing patterns and methodologies for complex applications.\n\nFound 2 results for 'TypeScript testing'"
      };
      
      mockHandler("webSearch", mockResult);

      const result = await handlerRegistry.handle("webSearch", {
        query: "TypeScript testing"
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain("TypeScript Testing Best Practices");
      expect(result.data).toContain("Advanced Testing Strategies");
    });

    test("should handle web search errors", async () => {
      const mockResult = {
        success: false,
        error: "Network error",
        details: "Could not connect to search service"
      };
      
      mockHandler("webSearch", mockResult);

      const result = await handlerRegistry.handle("webSearch", {
        query: "test query"
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("Error Scenarios", () => {
    test("should handle system permission errors", async () => {
      const tools = ["contacts", "sendMessage", "searchEvents", "searchMail", "createNote"];
      
      for (const tool of tools) {
        const mockResult = {
          success: false,
          error: "Permission denied",
          details: "Please grant access in System Settings > Privacy & Security"
        };
        
        mockHandler(tool, mockResult);

        const result = await handlerRegistry.handle(tool, { name: "test" });
        
        expect(result.success).toBe(false);
        expect(result.error).toBe("Permission denied");
        expect(result.details).toContain("System Settings");
      }
    });

    test("should handle module loading failures", async () => {
      const mockResult = {
        success: false,
        error: "Failed to load required module",
        details: "Module not found or could not be imported"
      };
      
      mockHandler("contacts", mockResult);

      const result = await handlerRegistry.handle("contacts", { name: "John" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to load required module");
    });

    test("should handle timeout errors", async () => {
      const mockResult = {
        success: false,
        error: "Operation timed out",
        details: "The request took too long to complete"
      };
      
      mockHandler("searchEvents", mockResult);

      const result = await handlerRegistry.handle("searchEvents", { searchText: "meeting" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Operation timed out");
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle multiple concurrent requests", async () => {
      const tools = ["contacts", "searchEvents", "searchMail", "searchNotes", "webSearch"];
      const mockResults = tools.map((tool, index) => ({
        success: true,
        data: `Result for ${tool} - test ${index}`
      }));

      // Mock all handlers
      tools.forEach((tool, index) => {
        mockHandler(tool, mockResults[index]);
      });

      // Execute concurrent requests
      const promises = tools.map((tool, index) =>
        handlerRegistry.handle(tool, { query: `test ${index}` })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data).toContain(`test ${index}`);
      });
    });
  });
});