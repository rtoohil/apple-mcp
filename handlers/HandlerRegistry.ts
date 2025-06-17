/**
 * Registry for all MCP tool handlers
 * Centralizes handler instantiation and routing
 */

import { BaseToolHandler, type MCPResponse } from './BaseToolHandler.js';
import { ContactsHandler } from './ContactsHandler.js';
import { NotesHandler } from './NotesHandler.js';
import { MessagesHandler } from './MessagesHandler.js';
import { MailHandler } from './MailHandler.js';
import { RemindersHandler } from './RemindersHandler.js';
import { CalendarHandler } from './CalendarHandler.js';
import { MapsHandler } from './MapsHandler.js';
import { PhotosHandler } from './PhotosHandler.js';
import { WebSearchHandler } from './WebSearchHandler.js';

export class HandlerRegistry {
  public handlers: Map<string, BaseToolHandler<any>> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    // Create handler instances
    const contactsHandler = new ContactsHandler();
    const messagesHandler = new MessagesHandler();
    const mailHandler = new MailHandler();
    const calendarHandler = new CalendarHandler();
    const notesHandler = new NotesHandler();
    const remindersHandler = new RemindersHandler();
    const mapsHandler = new MapsHandler();
    const photosHandler = new PhotosHandler();
    const webSearchHandler = new WebSearchHandler();

    // Register contacts tools
    this.handlers.set('contacts', contactsHandler);

    // Register message tools
    this.handlers.set('sendMessage', messagesHandler);
    this.handlers.set('readMessages', messagesHandler);
    this.handlers.set('getUnreadMessages', messagesHandler);

    // Register calendar tools
    this.handlers.set('searchEvents', calendarHandler);
    this.handlers.set('openEvent', calendarHandler);
    this.handlers.set('getEvents', calendarHandler);
    this.handlers.set('createEvent', calendarHandler);

    // Register mail tools
    this.handlers.set('searchMail', mailHandler);
    this.handlers.set('openMail', mailHandler);
    this.handlers.set('getUnreadMails', mailHandler);
    this.handlers.set('sendMail', mailHandler);

    // Register notes tools
    this.handlers.set('createNote', notesHandler);
    this.handlers.set('searchNotes', notesHandler);
    this.handlers.set('openNote', notesHandler);

    // Register reminders tools
    this.handlers.set('getReminders', remindersHandler);
    this.handlers.set('createReminder', remindersHandler);
    this.handlers.set('completeReminder', remindersHandler);

    // Register maps tools
    this.handlers.set('searchLocations', mapsHandler);
    this.handlers.set('getDirections', mapsHandler);

    // Register photos tools
    this.handlers.set('getAllAlbums', photosHandler);
    this.handlers.set('searchPhotos', photosHandler);

    // Register web search tool
    this.handlers.set('webSearch', webSearchHandler);
  }

  async handle(toolName: string, args: unknown): Promise<MCPResponse> {
    const handler = this.handlers.get(toolName);
    
    if (!handler) {
      return {
        content: [{ type: "text", text: `❌ Unknown tool: ${toolName}` }],
        isError: true
      };
    }

    // Auto-inject operation based on tool name for multi-operation handlers
    const enhancedArgs = this.enhanceArgsWithOperation(toolName, args);
    return await handler.handle(enhancedArgs);
  }

  private enhanceArgsWithOperation(toolName: string, args: unknown): unknown {
    if (!args || typeof args !== 'object') {
      return args;
    }

    const argsObj = args as any;
    
    // If operation is already specified, don't override
    if (argsObj.operation) {
      return args;
    }

    // Map tool names to operations
    const operationMap: Record<string, string> = {
      // Messages
      'sendMessage': 'send',
      'readMessages': 'read', 
      'getUnreadMessages': 'unread',
      
      // Calendar
      'searchEvents': 'search',
      'openEvent': 'open',
      'getEvents': 'list',
      'createEvent': 'create',
      
      // Mail
      'searchMail': 'search',
      'openMail': 'open',
      'getUnreadMails': 'unread',
      'sendMail': 'send',
      
      // Notes
      'createNote': 'create',
      'searchNotes': 'search',
      'openNote': 'open',
      
      // Reminders
      'getReminders': 'list',
      'createReminder': 'create',
      'completeReminder': 'complete',
      
      // Maps
      'searchLocations': 'search',
      'getDirections': 'directions',
      
      // Photos
      'getAllAlbums': 'albums',
      'searchPhotos': 'search'
    };

    const operation = operationMap[toolName];
    if (operation) {
      return { ...argsObj, operation };
    }

    return args;
  }

  getAvailableTools(): string[] {
    return Array.from(this.handlers.keys());
  }

  hasHandler(toolName: string): boolean {
    return this.handlers.has(toolName);
  }
}

// Export a singleton instance
export const handlerRegistry = new HandlerRegistry();