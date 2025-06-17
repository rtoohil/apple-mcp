/**
 * Handler for reminders tool operations
 * Manages reminder creation, searching, listing, and opening
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface RemindersArgs extends OperationArgs {
  operation: "list" | "search" | "open" | "create" | "listById";
  searchText?: string;
  name?: string;
  listName?: string;
  listId?: string;
  props?: string[];
  notes?: string;
  dueDate?: string;
}

export class RemindersHandler extends BaseToolHandler<RemindersArgs> {
  constructor() {
    super('reminders');
  }

  validateArgs(args: unknown): args is RemindersArgs {
    return toolValidators.reminders.validate<RemindersArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('reminders');
  }

  async handleOperation(args: RemindersArgs, remindersModule: any): Promise<MCPResponse> {
    switch (args.operation) {
      case "list":
        return await this.handleList(remindersModule);
      case "search":
        return await this.handleSearch(args, remindersModule);
      case "open":
        return await this.handleOpen(args, remindersModule);
      case "create":
        return await this.handleCreate(args, remindersModule);
      case "listById":
        return await this.handleListById(args, remindersModule);
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
  }

  private async handleList(remindersModule: any): Promise<MCPResponse> {
    const lists = await remindersModule.getAllLists();
    const allReminders = await remindersModule.getAllReminders();
    
    const text = `Found ${lists.length} lists and ${allReminders.length} reminders.`;
    
    return {
      ...ResponseBuilder.success(text),
      lists,
      reminders: allReminders
    };
  }

  private async handleSearch(args: RemindersArgs, remindersModule: any): Promise<MCPResponse> {
    const results = await remindersModule.searchReminders(args.searchText!);
    
    const text = results.length > 0 
      ? `Found ${results.length} reminders matching "${args.searchText}".`
      : `No reminders found matching "${args.searchText}".`;
    
    return {
      ...ResponseBuilder.success(text),
      reminders: results
    };
  }

  private async handleOpen(args: RemindersArgs, remindersModule: any): Promise<MCPResponse> {
    const result = await remindersModule.openReminder(args.searchText!);
    
    const text = result.success 
      ? `Opened Reminders app. Found reminder: ${result.reminder?.name}`
      : result.message;
    
    return {
      content: [{ type: "text", text }],
      isError: !result.success,
      ...result
    };
  }

  private async handleCreate(args: RemindersArgs, remindersModule: any): Promise<MCPResponse> {
    const { name, listName, notes, dueDate } = args;
    const result = await remindersModule.createReminder(name!, listName, notes, dueDate);
    
    let text = `Created reminder "${result.name}"`;
    if (listName) {
      text += ` in list "${listName}"`;
    }
    text += '.';
    
    return {
      ...ResponseBuilder.success(text),
      success: true,
      reminder: result
    };
  }

  private async handleListById(args: RemindersArgs, remindersModule: any): Promise<MCPResponse> {
    const { listId, props } = args;
    const results = await remindersModule.getRemindersFromListById(listId!, props);
    
    const text = results.length > 0 
      ? `Found ${results.length} reminders in list with ID "${listId}".`
      : `No reminders found in list with ID "${listId}".`;
    
    return {
      ...ResponseBuilder.success(text),
      reminders: results
    };
  }
}