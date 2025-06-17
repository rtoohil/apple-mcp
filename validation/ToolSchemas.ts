/**
 * Validation schemas for all MCP tools
 * Defines the validation rules for each tool's operations and parameters
 */

import { createValidator, CommonFields, type ValidationConfig } from './OperationValidator.js';

// Contacts tool validation schema
export const contactsValidator = createValidator({
  operations: ['search', 'list', 'email', 'phone'],
  operationSchema: {
    search: {
      searchTerm: CommonFields.searchTerm(),
      maxResults: CommonFields.optionalNumber(),
      includeScore: CommonFields.optionalBoolean()
    },
    email: {
      email: CommonFields.email(),
      maxResults: CommonFields.optionalNumber()
    },
    phone: {
      phoneNumber: CommonFields.phoneNumber()
    },
    list: {
      maxResults: CommonFields.optionalNumber()
    }
  },
  legacySupport: {
    field: 'name',
    mapToOperation: 'search'
  }
});

// Notes tool validation schema
export const notesValidator = createValidator({
  operations: ['search', 'list', 'create'],
  operationSchema: {
    search: {
      searchText: CommonFields.searchText()
    },
    create: {
      title: CommonFields.title(),
      body: CommonFields.body(),
      folderName: CommonFields.optionalString()
    }
    // list has no additional parameters
  }
});

// Messages tool validation schema
export const messagesValidator = createValidator({
  operations: ['send', 'read', 'schedule', 'unread'],
  operationSchema: {
    send: {
      phoneNumber: CommonFields.phoneNumber(),
      message: CommonFields.message()
    },
    read: {
      phoneNumber: CommonFields.phoneNumber(),
      limit: CommonFields.optionalNumber()
    },
    schedule: {
      phoneNumber: CommonFields.phoneNumber(),
      message: CommonFields.message(),
      scheduledTime: CommonFields.requiredString()
    },
    unread: {
      limit: CommonFields.optionalNumber()
    }
  }
});

// Mail tool validation schema
export const mailValidator = createValidator({
  operations: ['unread', 'inbox', 'search', 'send', 'mailboxes', 'accounts'],
  operationSchema: {
    unread: {
      limit: CommonFields.optionalNumber()
    },
    inbox: {
      limit: CommonFields.optionalNumber()
    },
    search: {
      searchTerm: CommonFields.searchTerm(),
      limit: CommonFields.optionalNumber()
    },
    send: {
      to: { type: 'string', required: true, allowEmpty: false },
      subject: { type: 'string', required: true, allowEmpty: false },
      body: { type: 'string', required: true },
      cc: CommonFields.optionalString(),
      bcc: CommonFields.optionalString()
    }
    // mailboxes and accounts have no additional parameters
  }
});

// Reminders tool validation schema
export const remindersValidator = createValidator({
  operations: ['list', 'search', 'open', 'create', 'listById'],
  operationSchema: {
    search: {
      searchText: CommonFields.searchText()
    },
    open: {
      searchText: CommonFields.searchText()
    },
    create: {
      name: { type: 'string', required: true, allowEmpty: false },
      listName: CommonFields.optionalString(),
      notes: CommonFields.optionalString(),
      dueDate: CommonFields.optionalString()
    },
    listById: {
      listId: { type: 'string', required: true, allowEmpty: false },
      props: { type: 'array', required: false }
    }
    // list has no additional parameters
  }
});

// Calendar tool validation schema
export const calendarValidator = createValidator({
  operations: ['search', 'open', 'list', 'create'],
  operationSchema: {
    search: {
      searchText: CommonFields.searchText(),
      limit: CommonFields.optionalNumber(),
      fromDate: CommonFields.optionalString(),
      toDate: CommonFields.optionalString()
    },
    open: {
      eventId: { type: 'string', required: true, allowEmpty: false }
    },
    list: {
      limit: CommonFields.optionalNumber(),
      fromDate: CommonFields.optionalString(),
      toDate: CommonFields.optionalString()
    },
    create: {
      title: CommonFields.title(),
      startDate: { type: 'string', required: true, allowEmpty: false },
      endDate: { type: 'string', required: true, allowEmpty: false },
      location: CommonFields.optionalString(),
      notes: CommonFields.optionalString(),
      isAllDay: CommonFields.optionalBoolean(),
      calendarName: CommonFields.optionalString()
    }
  }
});

// Maps tool validation schema  
export const mapsValidator = createValidator({
  operations: ['search', 'save', 'directions', 'pin', 'listGuides', 'addToGuide', 'createGuide'],
  operationSchema: {
    search: {
      query: { type: 'string', required: true, allowEmpty: false },
      limit: CommonFields.optionalNumber()
    },
    save: {
      name: { type: 'string', required: true, allowEmpty: false },
      address: { type: 'string', required: true, allowEmpty: false }
    },
    pin: {
      name: { type: 'string', required: true, allowEmpty: false },
      address: { type: 'string', required: true, allowEmpty: false }
    },
    directions: {
      fromAddress: { type: 'string', required: true, allowEmpty: false },
      toAddress: { type: 'string', required: true, allowEmpty: false },
      transportType: { type: 'string', required: false, oneOf: ['driving', 'walking', 'transit'] }
    },
    createGuide: {
      guideName: { type: 'string', required: true, allowEmpty: false }
    },
    addToGuide: {
      address: { type: 'string', required: true, allowEmpty: false },
      guideName: { type: 'string', required: true, allowEmpty: false }
    }
    // listGuides has no additional parameters
  }
});

// Photos tool validation schema
export const photosValidator = createValidator({
  operations: [
    'albums', 'albumPhotos', 'search', 'dateRange', 'favorites', 
    'memories', 'recent', 'export', 'open', 'people', 'personPhotos', 'screenshots'
  ],
  operationSchema: {
    albumPhotos: {
      albumName: { type: 'string', required: true, allowEmpty: false },
      limit: CommonFields.optionalNumber()
    },
    search: {
      searchText: CommonFields.searchText(),
      limit: CommonFields.optionalNumber()
    },
    dateRange: {
      startDate: { type: 'string', required: true, allowEmpty: false },
      endDate: { type: 'string', required: true, allowEmpty: false },
      limit: CommonFields.optionalNumber()
    },
    favorites: {
      limit: CommonFields.optionalNumber()
    },
    memories: {
      limit: CommonFields.optionalNumber()
    },
    recent: {
      limit: CommonFields.optionalNumber()
    },
    export: {
      photoId: { type: 'string', required: true, allowEmpty: false },
      outputPath: { type: 'string', required: true, allowEmpty: false }
    },
    open: {
      photoId: { type: 'string', required: true, allowEmpty: false }
    },
    personPhotos: {
      personName: { type: 'string', required: true, allowEmpty: false },
      limit: CommonFields.optionalNumber()
    },
    screenshots: {
      limit: CommonFields.optionalNumber()
    }
    // albums and people have no additional parameters
  }
});

// WebSearch tool validation schema
export const webSearchValidator = createValidator({
  operations: ['search'], // WebSearch doesn't use operations, but we'll adapt it
  operationSchema: {
    search: {
      query: { type: 'string', required: true, allowEmpty: false }
    }
  }
});

// Special case: WebSearch doesn't use operations pattern, so we need a direct validator
export function validateWebSearchArgs(args: unknown): args is { query: string } {
  if (typeof args !== 'object' || args === null) {
    return false;
  }
  
  const { query } = args as any;
  return typeof query === 'string' && query.trim() !== '';
}

// Export all validators for easy access
export const toolValidators = {
  contacts: contactsValidator,
  notes: notesValidator,
  messages: messagesValidator,
  mail: mailValidator,
  reminders: remindersValidator,
  calendar: calendarValidator,
  maps: mapsValidator,
  photos: photosValidator,
  webSearch: { validate: validateWebSearchArgs } // Special case
};