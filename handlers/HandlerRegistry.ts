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
  private handlers: Map<string, BaseToolHandler<any>> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    this.handlers.set('contacts', new ContactsHandler());
    this.handlers.set('notes', new NotesHandler());
    this.handlers.set('messages', new MessagesHandler());
    this.handlers.set('mail', new MailHandler());
    this.handlers.set('reminders', new RemindersHandler());
    this.handlers.set('calendar', new CalendarHandler());
    this.handlers.set('maps', new MapsHandler());
    this.handlers.set('photos', new PhotosHandler());
    this.handlers.set('webSearch', new WebSearchHandler());
  }

  async handle(toolName: string, args: unknown): Promise<MCPResponse> {
    const handler = this.handlers.get(toolName);
    
    if (!handler) {
      return {
        content: [{ type: "text", text: `❌ Unknown tool: ${toolName}` }],
        isError: true
      };
    }

    return await handler.handle(args);
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