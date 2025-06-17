/**
 * Utility class for building standardized MCP responses
 * Provides common response patterns used across all tools
 */

import type { MCPResponse } from './BaseToolHandler.js';

export class ResponseBuilder {
  /**
   * Creates a success response with text content
   */
  static success(text: string, additionalData?: object): MCPResponse {
    return {
      content: [{ type: "text", text }],
      isError: false,
      ...additionalData
    };
  }

  /**
   * Creates an error response
   */
  static error(message: string): MCPResponse {
    return {
      content: [{ type: "text", text: `❌ ${message}` }],
      isError: true
    };
  }

  /**
   * Creates a "no results found" response
   */
  static noResults(searchTerm: string, suggestions?: string): MCPResponse {
    let message = `No results found for "${searchTerm}".`;
    if (suggestions) {
      message += ` ${suggestions}`;
    }
    return this.success(message);
  }

  /**
   * Creates a response for successful operations with counts
   */
  static successWithCount(
    count: number,
    itemType: string,
    searchTerm?: string,
    additionalData?: object
  ): MCPResponse {
    let message = `Found ${count} ${itemType}`;
    if (count !== 1) {
      message += 's';
    }
    if (searchTerm) {
      message += ` matching "${searchTerm}"`;
    }
    message += '.';

    return this.success(message, additionalData);
  }

  /**
   * Formats contact information in a standardized way
   */
  static formatContact(contact: any, includeScore?: boolean, scoreData?: any): string {
    let result = `**${contact.name}**`;
    
    if (includeScore && contact.confidence !== undefined) {
      result += `\n🎯 Confidence: ${(contact.confidence * 100).toFixed(0)}%`;
    }
    
    result += `\n📞 ${contact.phones?.join(", ") || "No phone numbers"}`;
    result += `\n✉️ ${contact.emails?.join(", ") || "No email addresses"}`;
    
    if (contact.organization) {
      result += `\n🏢 ${contact.organization}`;
    }
    
    if (contact.jobTitle) {
      result += `\n💼 ${contact.jobTitle}`;
    }
    
    if (contact.addresses?.length > 0) {
      result += `\n🏠 ${contact.addresses.join(", ")}`;
    }
    
    if (contact.birthday) {
      result += `\n🎂 ${contact.birthday}`;
    }
    
    if (contact.notes) {
      result += `\n📝 ${contact.notes}`;
    }
    
    return result;
  }

  /**
   * Formats email information in a standardized way
   */
  static formatEmail(email: any): string {
    const content = email.content.substring(0, 200);
    const truncated = email.content.length > 200 ? '...' : '';
    
    return `[${email.dateSent}] From: ${email.sender}\n` +
           `Mailbox: ${email.mailbox}\n` +
           `Subject: ${email.subject}\n` +
           `${content}${truncated}` +
           `${email.url ? `\nURL: ${email.url}` : ''}`;
  }

  /**
   * Formats calendar event information
   */
  static formatEvent(event: any): string {
    const startDate = new Date(event.startDate!).toLocaleString();
    const endDate = new Date(event.endDate!).toLocaleString();
    
    let result = `${event.title} (${startDate} - ${endDate})\n`;
    result += `Location: ${event.location || 'Not specified'}\n`;
    result += `Calendar: ${event.calendarName}\n`;
    result += `ID: ${event.id}`;
    
    if (event.notes) {
      result += `\nNotes: ${event.notes}`;
    }
    
    return result;
  }

  /**
   * Formats photo information
   */
  static formatPhoto(photo: any): string {
    const date = photo.date ? new Date(photo.date).toLocaleString() : 'No date';
    return `${photo.filename} (${date})`;
  }

  /**
   * Formats message information with contact names
   */
  static formatMessage(msg: any): string {
    const date = new Date(msg.date).toLocaleString();
    const sender = msg.is_from_me ? 'Me' : (msg.displayName || msg.sender);
    return `[${date}] ${sender}: ${msg.content}`;
  }

  /**
   * Creates a response for list operations with formatting
   */
  static createListResponse<T>(
    items: T[],
    itemType: string,
    formatter: (item: T) => string,
    maxResults?: number,
    searchContext?: string
  ): MCPResponse {
    if (items.length === 0) {
      const message = searchContext 
        ? `No ${itemType}s found${searchContext}.`
        : `No ${itemType}s exist.`;
      return this.success(message);
    }

    const limitedItems = maxResults ? items.slice(0, maxResults) : items;
    const truncated = maxResults && items.length > maxResults;
    
    let message = `Found ${items.length} ${itemType}`;
    if (items.length !== 1) message += 's';
    if (searchContext) message += searchContext;
    if (truncated) message += ` (showing first ${maxResults})`;
    message += ':\n\n';
    
    message += limitedItems.map(formatter).join('\n\n');

    return this.success(message);
  }

  /**
   * Formats calendar event information (alias for formatEvent)
   */
  static formatCalendarEvent(event: any): string {
    let result = `**${event.title}**`;
    
    if (event.isAllDay) {
      const date = new Date(event.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      result += `\n📅 ${date} (All day)`;
    } else {
      const startDate = new Date(event.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const startTime = new Date(event.startDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const endTime = new Date(event.endDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      result += `\n📅 ${startDate} at ${startTime} - ${endTime}`;
    }
    
    if (event.location) {
      result += `\n📍 ${event.location}`;
    }
    
    if (event.notes) {
      result += `\n📝 ${event.notes}`;
    }
    
    if (event.calendarName) {
      result += `\n📚 ${event.calendarName}`;
    }
    
    if (event.url) {
      result += `\n🔗 ${event.url}`;
    }
    
    return result;
  }

  /**
   * Formats email message information (alias for formatEmail) 
   */
  static formatEmailMessage(email: any): string {
    let result = `**${email.subject}**`;
    
    result += `\n👤 ${email.sender}`;
    
    const date = new Date(email.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const time = new Date(email.date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    result += `\n🕐 ${date} at ${time}`;
    
    if (email.snippet) {
      result += `\n📧 ${email.snippet}`;
    }
    
    if (email.url) {
      result += `\n🔗 ${email.url}`;
    }
    
    return result;
  }

  /**
   * Formats message information (updated format for tests)
   */
  static formatMessage(message: any): string {
    const sender = message.is_from_me ? "You" : message.sender;
    let result = `**From: ${sender}**`;
    
    const date = new Date(message.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const time = new Date(message.date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    result += `\n🕐 ${date} at ${time}`;
    
    result += `\n💬 ${message.content}`;
    
    if (message.url) {
      result += `\n🔗 ${message.url}`;
    }
    
    return result;
  }

  /**
   * Creates a legacy success response (for backward compatibility with tests)
   */
  static legacySuccess(data: any): { success: boolean; data: any; error?: undefined } {
    return {
      success: true,
      data,
      error: undefined
    };
  }

  /**
   * Creates a legacy error response (for backward compatibility with tests)
   */
  static legacyError(message: string, details?: string): { success: boolean; error: string; details?: string; data?: undefined } {
    return {
      success: false,
      error: message,
      details,
      data: undefined
    };
  }
}