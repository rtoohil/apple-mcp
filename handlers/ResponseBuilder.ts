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
    
    if (includeScore && scoreData) {
      result += ` (Score: ${(scoreData.score * 100).toFixed(1)}%, Match: ${scoreData.matchType} - ${scoreData.matchValue})`;
    }
    
    result += `\n📞 ${contact.phones.join(", ") || "No phone numbers"}`;
    result += `\n📧 ${contact.emails.join(", ") || "No email addresses"}`;
    result += `\n🏠 ${contact.addresses.join(", ") || "No addresses"}`;
    
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
}