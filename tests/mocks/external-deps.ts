/**
 * Mock utilities for external dependencies
 * These mocks allow testing without requiring actual Apple apps or system access
 */

import { mock } from "bun:test";

// Mock data for testing
export const mockData = {
  contacts: [
    {
      name: "John Doe",
      phones: ["+1234567890", "+0987654321"],
      emails: ["john@example.com", "john.doe@work.com"],
      organization: "Acme Corp",
      jobTitle: "Software Engineer",
      addresses: ["123 Main St, Anytown"],
      birthday: "1990-01-15",
      notes: "Important client contact"
    },
    {
      name: "Jane Smith",
      phones: ["+5555551234"],
      emails: ["jane@example.com"],
      organization: "Tech Solutions",
      jobTitle: "Manager"
    }
  ],

  calendarEvents: [
    {
      id: "event-1",
      title: "Team Meeting",
      startDate: "2024-06-20T10:00:00Z",
      endDate: "2024-06-20T11:00:00Z",
      location: "Conference Room A",
      notes: "Quarterly review meeting",
      calendarName: "Work",
      isAllDay: false,
      url: "https://calendar.example.com/event/123"
    },
    {
      id: "event-2",
      title: "Doctor Appointment",
      startDate: "2024-06-21T14:00:00Z",
      endDate: "2024-06-21T15:00:00Z",
      location: "Medical Center",
      calendarName: "Personal",
      isAllDay: false
    }
  ],

  messages: [
    {
      content: "Hello, how are you?",
      date: "2024-06-17T14:30:00Z",
      sender: "+1234567890",
      is_from_me: false,
      url: "https://example.com/link"
    },
    {
      content: "I'm doing well, thanks!",
      date: "2024-06-17T14:32:00Z",
      sender: "+1234567890",
      is_from_me: true
    }
  ],

  emails: [
    {
      subject: "Important Meeting",
      sender: "boss@company.com",
      date: "2024-06-17T09:00:00Z",
      snippet: "Please join us for the quarterly review...",
      messageId: "12345",
      url: "mail://message/12345"
    },
    {
      subject: "Project Update",
      sender: "colleague@company.com",
      date: "2024-06-17T11:30:00Z",
      snippet: "The project is on track for completion...",
      messageId: "12346",
      url: "mail://message/12346"
    }
  ],

  notes: [
    {
      id: "note-1",
      title: "Meeting Notes",
      content: "Important discussion points from today's meeting...",
      folder: "Work",
      modificationDate: "2024-06-17T10:00:00Z",
      url: "notes://note/1"
    },
    {
      id: "note-2",
      title: "Shopping List",
      content: "Milk, Bread, Eggs, Apples",
      folder: "Personal",
      modificationDate: "2024-06-16T18:30:00Z",
      url: "notes://note/2"
    }
  ],

  reminders: [
    {
      id: "reminder-1",
      title: "Call dentist",
      dueDate: "2024-06-25T09:00:00Z",
      priority: "high",
      notes: "Schedule annual checkup",
      list: "Personal",
      completed: false
    },
    {
      id: "reminder-2",
      title: "Submit report",
      dueDate: "2024-06-18T17:00:00Z",
      priority: "medium",
      list: "Work",
      completed: false
    }
  ],

  photos: [
    {
      id: "photo-1",
      filename: "vacation-2024.jpg",
      date: "2024-06-01T12:00:00Z",
      favorite: true,
      description: "Beautiful sunset at the beach",
      keywords: ["vacation", "sunset", "beach"],
      albumNames: ["2024 Vacation"],
      width: 1920,
      height: 1080
    },
    {
      id: "photo-2",
      filename: "family-dinner.jpg",
      date: "2024-05-28T19:00:00Z",
      favorite: false,
      description: "Family gathering",
      keywords: ["family", "dinner"],
      albumNames: ["Family Photos"],
      width: 1600,
      height: 1200
    }
  ],

  webSearchResults: [
    {
      title: "TypeScript Testing Best Practices",
      url: "https://example.com/typescript-testing",
      displayUrl: "example.com",
      snippet: "Learn the best practices for testing TypeScript applications...",
      content: "Comprehensive guide to testing TypeScript applications with modern tools and techniques."
    },
    {
      title: "Advanced Testing Strategies",
      url: "https://dev.example.com/advanced-testing",
      displayUrl: "dev.example.com", 
      snippet: "Advanced strategies for testing complex applications...",
      content: "Deep dive into advanced testing patterns and methodologies."
    }
  ]
};

// Mock factory functions
export const createMockJXA = (returnValue?: any, shouldFail: boolean = false) => {
  if (shouldFail) {
    return {
      run: mock().mockRejectedValue(new Error("JXA operation failed"))
    };
  }
  
  return {
    run: mock().mockResolvedValue(returnValue || { success: true })
  };
};

export const createMockAppleScript = (returnValue?: string, shouldFail: boolean = false) => {
  if (shouldFail) {
    return {
      runAppleScript: mock().mockRejectedValue(new Error("AppleScript execution failed"))
    };
  }
  
  return {
    runAppleScript: mock().mockResolvedValue(returnValue || "success")
  };
};

// Mock module factories for each utility
export const mockModules = {
  contacts: (shouldFail: boolean = false) => {
    if (shouldFail) {
      return {
        searchContacts: mock().mockRejectedValue(new Error("Contacts access denied")),
        getContactDetails: mock().mockRejectedValue(new Error("Contacts access denied"))
      };
    }
    
    return {
      searchContacts: mock().mockImplementation((name: string, limit?: number) => {
        const filtered = mockData.contacts.filter(contact => 
          contact.name.toLowerCase().includes(name.toLowerCase())
        );
        return Promise.resolve(filtered.slice(0, limit || 10));
      }),
      getContactDetails: mock().mockImplementation((name: string) => {
        const contact = mockData.contacts.find(c => 
          c.name.toLowerCase().includes(name.toLowerCase())
        );
        return Promise.resolve(contact || null);
      })
    };
  },

  calendar: (shouldFail: boolean = false) => {
    if (shouldFail) {
      return {
        searchEvents: mock().mockRejectedValue(new Error("Calendar access denied")),
        createEvent: mock().mockRejectedValue(new Error("Calendar access denied")),
        getEvents: mock().mockRejectedValue(new Error("Calendar access denied")),
        openEvent: mock().mockRejectedValue(new Error("Calendar access denied"))
      };
    }
    
    return {
      searchEvents: mock().mockImplementation((searchText: string, limit?: number) => {
        const filtered = mockData.calendarEvents.filter(event =>
          event.title.toLowerCase().includes(searchText.toLowerCase()) ||
          (event.notes && event.notes.toLowerCase().includes(searchText.toLowerCase()))
        );
        return Promise.resolve(filtered.slice(0, limit || 10));
      }),
      createEvent: mock().mockResolvedValue({
        success: true,
        message: "Event created successfully",
        eventId: "new-event-123"
      }),
      getEvents: mock().mockResolvedValue(mockData.calendarEvents),
      openEvent: mock().mockResolvedValue({
        success: true,
        message: "Event opened successfully"
      })
    };
  },

  message: (shouldFail: boolean = false) => {
    if (shouldFail) {
      return {
        sendMessage: mock().mockRejectedValue(new Error("Messages access denied")),
        readMessages: mock().mockRejectedValue(new Error("Messages access denied")),
        getUnreadMessages: mock().mockRejectedValue(new Error("Messages access denied"))
      };
    }
    
    return {
      sendMessage: mock().mockResolvedValue({
        success: true,
        message: "Message sent successfully"
      }),
      readMessages: mock().mockImplementation((phoneNumber: string, limit?: number) => {
        return Promise.resolve(mockData.messages.slice(0, limit || 10));
      }),
      getUnreadMessages: mock().mockResolvedValue(mockData.messages.filter(m => !m.is_from_me))
    };
  },

  mail: (shouldFail: boolean = false) => {
    if (shouldFail) {
      return {
        searchMail: mock().mockRejectedValue(new Error("Mail access denied")),
        sendMail: mock().mockRejectedValue(new Error("Mail access denied")),
        getUnreadMails: mock().mockRejectedValue(new Error("Mail access denied")),
        openMail: mock().mockRejectedValue(new Error("Mail access denied"))
      };
    }
    
    return {
      searchMail: mock().mockImplementation((query: string, mailbox?: string, limit?: number) => {
        const filtered = mockData.emails.filter(email =>
          email.subject.toLowerCase().includes(query.toLowerCase()) ||
          email.snippet.toLowerCase().includes(query.toLowerCase())
        );
        return Promise.resolve(filtered.slice(0, limit || 10));
      }),
      sendMail: mock().mockResolvedValue({
        success: true,
        message: "Email sent successfully"
      }),
      getUnreadMails: mock().mockResolvedValue(mockData.emails),
      openMail: mock().mockResolvedValue({
        success: true,
        message: "Email opened successfully"
      })
    };
  },

  notes: (shouldFail: boolean = false) => {
    if (shouldFail) {
      return {
        createNote: mock().mockRejectedValue(new Error("Notes access denied")),
        searchNotes: mock().mockRejectedValue(new Error("Notes access denied")),
        openNote: mock().mockRejectedValue(new Error("Notes access denied"))
      };
    }
    
    return {
      createNote: mock().mockResolvedValue({
        success: true,
        message: "Note created successfully",
        noteId: "new-note-123"
      }),
      searchNotes: mock().mockImplementation((query: string, limit?: number) => {
        const filtered = mockData.notes.filter(note =>
          note.title.toLowerCase().includes(query.toLowerCase()) ||
          note.content.toLowerCase().includes(query.toLowerCase())
        );
        return Promise.resolve(filtered.slice(0, limit || 10));
      }),
      openNote: mock().mockResolvedValue({
        success: true,
        message: "Note opened successfully"
      })
    };
  },

  photos: (shouldFail: boolean = false) => {
    if (shouldFail) {
      return {
        getAllAlbums: mock().mockRejectedValue(new Error("Photos access denied")),
        searchPhotos: mock().mockRejectedValue(new Error("Photos access denied"))
      };
    }
    
    return {
      getAllAlbums: mock().mockResolvedValue([
        { name: "2024 Vacation", id: "album-1" },
        { name: "Family Photos", id: "album-2" }
      ]),
      searchPhotos: mock().mockImplementation((searchText: string, limit?: number) => {
        const filtered = mockData.photos.filter(photo =>
          photo.filename.toLowerCase().includes(searchText.toLowerCase()) ||
          photo.keywords.some(keyword => keyword.toLowerCase().includes(searchText.toLowerCase()))
        );
        return Promise.resolve(filtered.slice(0, limit || 10));
      })
    };
  },

  webSearch: (shouldFail: boolean = false) => {
    if (shouldFail) {
      return {
        webSearch: mock().mockRejectedValue(new Error("Network error"))
      };
    }
    
    return {
      webSearch: mock().mockImplementation((query: string) => {
        return Promise.resolve({
          query,
          results: mockData.webSearchResults.map(result => ({
            ...result,
            content: result.content
          }))
        });
      })
    };
  }
};

// Utility to mock system permissions
export const mockSystemPermissions = {
  contacts: {
    granted: () => createMockJXA(mockData.contacts[0]),
    denied: () => createMockJXA(null, true)
  },
  
  calendar: {
    granted: () => createMockJXA(mockData.calendarEvents[0]),
    denied: () => createMockJXA(null, true)
  },
  
  messages: {
    granted: () => createMockAppleScript("success"),
    denied: () => createMockAppleScript(null, true)
  },
  
  mail: {
    granted: () => createMockAppleScript("success"),
    denied: () => createMockAppleScript(null, true)
  }
};

// Helper to simulate different error conditions
export const simulateErrors = {
  networkError: () => new Error("Network connection failed"),
  permissionError: () => new Error("Permission denied. Please grant access in System Settings."),
  timeoutError: () => new Error("Operation timed out"),
  invalidArgumentError: () => new Error("Invalid arguments provided"),
  moduleNotFoundError: () => new Error("Required module not found")
};

// Test data generators
export const generateTestData = {
  contact: (overrides?: Partial<typeof mockData.contacts[0]>) => ({
    ...mockData.contacts[0],
    ...overrides
  }),
  
  calendarEvent: (overrides?: Partial<typeof mockData.calendarEvents[0]>) => ({
    ...mockData.calendarEvents[0],
    ...overrides
  }),
  
  message: (overrides?: Partial<typeof mockData.messages[0]>) => ({
    ...mockData.messages[0],
    ...overrides
  }),
  
  email: (overrides?: Partial<typeof mockData.emails[0]>) => ({
    ...mockData.emails[0],
    ...overrides
  })
};