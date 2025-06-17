/**
 * Handler for notes tool operations
 * Manages note search, listing, and creation operations
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface NotesArgs extends OperationArgs {
  operation: "search" | "list" | "create";
  searchText?: string;
  title?: string;
  body?: string;
  folderName?: string;
}

export class NotesHandler extends BaseToolHandler<NotesArgs> {
  constructor() {
    super('notes');
  }

  validateArgs(args: unknown): args is NotesArgs {
    return toolValidators.notes.validate<NotesArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('notes');
  }

  async handleOperation(args: NotesArgs, notesModule: any): Promise<MCPResponse> {
    switch (args.operation) {
      case "search":
        return await this.handleSearch(args, notesModule);
      case "list":
        return await this.handleList(notesModule);
      case "create":
        return await this.handleCreate(args, notesModule);
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
  }

  private async handleSearch(args: NotesArgs, notesModule: any): Promise<MCPResponse> {
    if (!args.searchText) {
      throw new Error("Search text is required for search operation");
    }
    
    const foundNotes = await notesModule.findNote(args.searchText);
    
    if (foundNotes.length === 0) {
      return ResponseBuilder.noResults(args.searchText);
    }
    
    const formatter = (note: any) => {
      let result = `${note.name}:\n${note.content}`;
      if (note.url) {
        result += `\nURL: ${note.url}`;
      }
      return result;
    };
    
    return ResponseBuilder.createListResponse(
      foundNotes,
      'note',
      formatter,
      undefined,
      ` matching "${args.searchText}"`
    );
  }

  private async handleList(notesModule: any): Promise<MCPResponse> {
    const allNotes = await notesModule.getAllNotes();
    
    if (allNotes.length === 0) {
      return ResponseBuilder.success("No notes exist.");
    }
    
    const formatter = (note: any) => {
      let result = `${note.name}:\n${note.content}`;
      if (note.url) {
        result += `\nURL: ${note.url}`;
      }
      return result;
    };
    
    return ResponseBuilder.createListResponse(allNotes, 'note', formatter);
  }

  private async handleCreate(args: NotesArgs, notesModule: any): Promise<MCPResponse> {
    if (!args.title || !args.body) {
      throw new Error("Title and body are required for create operation");
    }
    
    const result = await notesModule.createNote(args.title, args.body, args.folderName);
    
    if (result.success) {
      let message = `Created note "${args.title}" in folder "${result.folderName}"`;
      if (result.usedDefaultFolder) {
        message += ' (created new folder)';
      }
      message += '.';
      
      return ResponseBuilder.success(message);
    } else {
      return this.createErrorResponse(`Failed to create note: ${result.message}`);
    }
  }
}