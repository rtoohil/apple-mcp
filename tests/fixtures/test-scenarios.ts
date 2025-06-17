/**
 * Test scenarios and fixtures for comprehensive testing
 */

export const testScenarios = {
  // Valid input scenarios
  validInputs: {
    contacts: [
      { name: "John Doe", limit: 10 },
      { name: "Jane Smith" }, // No limit
      { name: "Alex Johnson", limit: 5 }
    ],
    
    calendar: [
      { 
        searchText: "meeting", 
        limit: 5,
        fromDate: "2024-01-01T00:00:00Z",
        toDate: "2024-12-31T23:59:59Z"
      },
      { searchText: "appointment" }, // Minimal valid input
      {
        title: "Team Meeting",
        startDate: "2024-06-20T10:00:00Z",
        endDate: "2024-06-20T11:00:00Z",
        location: "Conference Room A",
        notes: "Quarterly review"
      }
    ],
    
    messages: [
      { phoneNumber: "+1234567890", message: "Hello, world!" },
      { phoneNumber: "+1-234-567-8900", message: "Test message with dashes" },
      { phoneNumber: "1234567890", message: "Without country code" }
    ],
    
    mail: [
      { 
        query: "from:boss@company.com", 
        mailbox: "INBOX", 
        limit: 10 
      },
      {
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email"
      },
      {
        to: "recipient@example.com",
        subject: "Test with CC/BCC",
        body: "Test email body",
        cc: "cc@example.com",
        bcc: "bcc@example.com"
      }
    ],
    
    notes: [
      { title: "Meeting Notes", content: "Important points", folder: "Work" },
      { query: "project planning", limit: 15 },
      { title: "Shopping List", content: "Milk, Bread, Eggs" }
    ],
    
    reminders: [
      {
        title: "Call dentist",
        dueDate: "2024-06-25T09:00:00Z",
        priority: "high",
        notes: "Annual checkup"
      },
      { title: "Buy groceries", priority: "low" },
      { title: "Submit report", dueDate: "2024-06-18T17:00:00Z" }
    ],
    
    maps: [
      { query: "coffee shops near me", limit: 5 },
      { 
        fromAddress: "123 Main St", 
        toAddress: "456 Oak Ave", 
        transportType: "driving" 
      },
      { name: "Home", address: "123 Main Street, Anytown" }
    ],
    
    photos: [
      { searchText: "vacation", limit: 20 },
      { 
        startDate: "2024-01-01T00:00:00Z", 
        endDate: "2024-12-31T23:59:59Z", 
        limit: 50 
      },
      { albumName: "Family Photos", limit: 30 }
    ],
    
    webSearch: [
      { query: "TypeScript testing best practices" },
      { query: "Apple macOS automation" },
      { query: "MCP server development" }
    ]
  },

  // Invalid input scenarios
  invalidInputs: {
    missingRequired: [
      {}, // Empty object
      { limit: 10 }, // Missing name for contacts
      { message: "Hello" }, // Missing phone number
      { subject: "Test" }, // Missing recipient for email
      { content: "Note content" } // Missing title for notes
    ],
    
    wrongTypes: [
      { name: 123, limit: "invalid" }, // Wrong types
      { phoneNumber: true, message: 456 },
      { searchText: [], limit: "ten" },
      { priority: "super-urgent" }, // Invalid enum
      { transportType: "teleportation" } // Invalid enum
    ],
    
    invalidFormats: [
      { phoneNumber: "not-a-phone", message: "Test" },
      { to: "invalid-email", subject: "Test", body: "Test" },
      { startDate: "invalid-date", endDate: "2024-06-20T11:00:00Z" },
      { dueDate: "not-a-date", title: "Reminder" }
    ],
    
    boundaryValues: [
      { name: "", limit: -1 }, // Empty string, negative number
      { query: "a".repeat(10000) }, // Very long string
      { limit: 999999 }, // Very large number
      { searchText: "" } // Empty search
    ]
  },

  // Error conditions
  errorConditions: {
    permissionDenied: {
      contacts: "Cannot access Contacts app. Please grant access in System Settings.",
      calendar: "Cannot access Calendar app. Please grant access in System Settings.", 
      messages: "Cannot access Messages app. Please grant Full Disk Access.",
      mail: "Cannot access Mail app. Please grant access in System Settings.",
      notes: "Cannot access Notes app. Please grant access in System Settings.",
      photos: "Cannot access Photos app. Please grant access in System Settings."
    },
    
    moduleLoadingFailures: [
      "Module not found",
      "Import failed",
      "Module does not have a default export",
      "Network error during module loading"
    ],
    
    operationFailures: [
      "Operation timed out",
      "Invalid response from system",
      "Unexpected error during operation",
      "Resource temporarily unavailable"
    ],
    
    systemErrors: [
      "Disk full",
      "Memory allocation failed",
      "Process killed",
      "System overload"
    ]
  },

  // Performance test scenarios
  performanceScenarios: {
    concurrentRequests: {
      tools: ["contacts", "calendar", "messages", "mail", "notes"],
      requestsPerTool: 5,
      expectedMaxTime: 1000 // ms
    },
    
    largeDataSets: {
      contactSearch: { name: "John", limit: 1000 },
      calendarSearch: { searchText: "meeting", limit: 500 },
      emailSearch: { query: "project", limit: 200 }
    },
    
    stressTests: {
      rapidRequests: 100,
      intervalMs: 10,
      timeoutMs: 5000
    }
  },

  // Edge cases
  edgeCases: {
    unicode: [
      { name: "José García", message: "Hola! ¿Cómo estás?" },
      { title: "会议记录", content: "重要会议内容" },
      { query: "Café résumé naïve" }
    ],
    
    specialCharacters: [
      { name: "O'Connor-Smith", phoneNumber: "+1-234-567-8900" },
      { subject: "Re: [URGENT] Project #123 - 50% complete!" },
      { searchText: "meeting@location.com (urgent)" }
    ],
    
    emptyResponses: {
      noContactsFound: { name: "NonexistentPerson" },
      noEventsFound: { searchText: "NonexistentEvent" },
      noEmailsFound: { query: "NonexistentSender" }
    },
    
    timeZones: [
      { startDate: "2024-06-20T10:00:00Z" }, // UTC
      { startDate: "2024-06-20T10:00:00-08:00" }, // PST
      { startDate: "2024-06-20T10:00:00+09:00" } // JST
    ]
  }
};

// Expected response formats for validation
export const expectedFormats = {
  successResponse: {
    structure: {
      success: true,
      data: "string" // or object depending on operation
    },
    required: ["success", "data"],
    optional: []
  },
  
  errorResponse: {
    structure: {
      success: false,
      error: "string",
      details: "string"
    },
    required: ["success", "error"],
    optional: ["details"]
  },
  
  contactFormat: {
    structure: {
      name: "string",
      phones: "array",
      emails: "array"
    },
    required: ["name"],
    optional: ["phones", "emails", "organization", "jobTitle", "addresses"]
  },
  
  calendarEventFormat: {
    structure: {
      id: "string",
      title: "string",
      startDate: "string",
      endDate: "string"
    },
    required: ["title", "startDate", "endDate"],
    optional: ["id", "location", "notes", "calendarName", "isAllDay", "url"]
  }
};

// Test utilities
export const testUtils = {
  // Generate test data variations
  generateVariations: (baseData: any, variations: any[]) => {
    return variations.map(variation => ({ ...baseData, ...variation }));
  },
  
  // Create test matrix for cross-tool testing
  createTestMatrix: (tools: string[], scenarios: any[]) => {
    return tools.flatMap(tool => 
      scenarios.map(scenario => ({ tool, scenario }))
    );
  },
  
  // Performance measurement helpers
  measurePerformance: async (operation: () => Promise<any>) => {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    return { result, duration: end - start };
  },
  
  // Memory usage tracking
  measureMemory: () => {
    if (process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  }
};