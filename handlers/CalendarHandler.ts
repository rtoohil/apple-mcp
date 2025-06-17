/**
 * Handler for calendar tool operations
 * Manages calendar event searching, creation, listing, and opening
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface CalendarArgs extends OperationArgs {
  operation: "search" | "open" | "list" | "create";
  searchText?: string;
  eventId?: string;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  notes?: string;
  isAllDay?: boolean;
  calendarName?: string;
}

export class CalendarHandler extends BaseToolHandler<CalendarArgs> {
  constructor() {
    super('calendar');
  }

  validateArgs(args: unknown): args is CalendarArgs {
    return toolValidators.calendar.validate<CalendarArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('calendar');
  }

  async handleOperation(args: CalendarArgs, calendarModule: any): Promise<MCPResponse> {
    switch (args.operation) {
      case "search":
        return await this.handleSearch(args, calendarModule);
      case "open":
        return await this.handleOpen(args, calendarModule);
      case "list":
        return await this.handleList(args, calendarModule);
      case "create":
        return await this.handleCreate(args, calendarModule);
      default:
        throw new Error(`Unknown calendar operation: ${args.operation}`);
    }
  }

  private async handleSearch(args: CalendarArgs, calendarModule: any): Promise<MCPResponse> {
    const { searchText, limit, fromDate, toDate } = args;
    const events = await calendarModule.searchEvents(searchText!, limit, fromDate, toDate);
    
    if (events.length === 0) {
      return ResponseBuilder.noResults(searchText!);
    }

    const responseText = `Found ${events.length} events matching "${searchText}":\n\n` +
      events.map((event: any) => ResponseBuilder.formatEvent(event)).join("\n\n");
    
    return ResponseBuilder.success(responseText);
  }

  private async handleOpen(args: CalendarArgs, calendarModule: any): Promise<MCPResponse> {
    const result = await calendarModule.openEvent(args.eventId!);
    
    const text = result.success ? result.message : `Error opening event: ${result.message}`;
    
    return {
      content: [{ type: "text", text }],
      isError: !result.success
    };
  }

  private async handleList(args: CalendarArgs, calendarModule: any): Promise<MCPResponse> {
    const { limit, fromDate, toDate } = args;
    const events = await calendarModule.getEvents(limit, fromDate, toDate);
    
    const startDateText = fromDate ? new Date(fromDate).toLocaleDateString() : 'today';
    const endDateText = toDate ? new Date(toDate).toLocaleDateString() : 'next 7 days';
    
    if (events.length === 0) {
      return ResponseBuilder.success(`No events found from ${startDateText} to ${endDateText}.`);
    }

    const responseText = `Found ${events.length} events from ${startDateText} to ${endDateText}:\n\n` +
      events.map((event: any) => {
        const startDate = new Date(event.startDate!).toLocaleString();
        const endDate = new Date(event.endDate!).toLocaleString();
        
        return `${event.title} (${startDate} - ${endDate})\n` +
               `Location: ${event.location || 'Not specified'}\n` +
               `Calendar: ${event.calendarName}\n` +
               `ID: ${event.id}`;
      }).join("\n\n");
    
    return ResponseBuilder.success(responseText);
  }

  private async handleCreate(args: CalendarArgs, calendarModule: any): Promise<MCPResponse> {
    const { title, startDate, endDate, location, notes, isAllDay, calendarName } = args;
    const result = await calendarModule.createEvent(
      title!, 
      startDate!, 
      endDate!, 
      location, 
      notes, 
      isAllDay, 
      calendarName
    );
    
    if (result.success) {
      let text = `${result.message} Event scheduled from ${new Date(startDate!).toLocaleString()} to ${new Date(endDate!).toLocaleString()}`;
      if (result.eventId) {
        text += `\nEvent ID: ${result.eventId}`;
      }
      return ResponseBuilder.success(text);
    } else {
      return this.createErrorResponse(`Error creating event: ${result.message}`);
    }
  }
}