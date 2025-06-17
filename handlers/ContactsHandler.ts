/**
 * Handler for contacts tool operations
 * Manages contact search, listing, and lookup operations
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface ContactsArgs extends OperationArgs {
  operation: "search" | "list" | "email" | "phone";
  searchTerm?: string;
  email?: string;
  phoneNumber?: string;
  maxResults?: number;
  includeScore?: boolean;
  // Legacy support
  name?: string;
}

export class ContactsHandler extends BaseToolHandler<ContactsArgs> {
  constructor() {
    super('contacts');
  }

  validateArgs(args: unknown): args is ContactsArgs {
    return toolValidators.contacts.validate<ContactsArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('contacts');
  }

  async handleOperation(args: ContactsArgs, contactsModule: any): Promise<MCPResponse> {
    try {
      // Legacy support for 'name' parameter (convert to search operation)
      if (args.name && !args.operation) {
        return await this.handleLegacyNameSearch(args.name, contactsModule);
      }

      switch (args.operation) {
        case "search":
          return await this.handleSearch(args, contactsModule);
        case "email":
          return await this.handleEmailLookup(args, contactsModule);
        case "phone":
          return await this.handlePhoneLookup(args, contactsModule);
        case "list":
          return await this.handleList(args, contactsModule);
        default:
          throw new Error(`Unknown operation: ${args.operation}`);
      }
    } catch (error) {
      return this.createErrorResponse(
        `Error accessing contacts: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `Troubleshooting:\n` +
        `1. Check System Preferences > Security & Privacy > Privacy > Contacts\n` +
        `2. Make sure this application has permission to access Contacts\n` +
        `3. Try restarting the MCP server\n` +
        `4. Check the console logs for more detailed error information`
      );
    }
  }

  private async handleLegacyNameSearch(name: string, contactsModule: any): Promise<MCPResponse> {
    const contacts = await contactsModule.searchContacts(name);
    
    if (contacts.length === 0) {
      return ResponseBuilder.noResults(name, "Try a different name or use the list operation to see all contacts.");
    }
    
    const contact = contacts[0];
    const text = ResponseBuilder.formatContact(contact);
    
    return ResponseBuilder.success(text);
  }

  private async handleSearch(args: ContactsArgs, contactsModule: any): Promise<MCPResponse> {
    const results = args.includeScore ? 
      await contactsModule.fuzzySearchContacts(args.searchTerm!, args.maxResults || 10) :
      await contactsModule.searchContacts(args.searchTerm!);
    
    if (results.length === 0) {
      return ResponseBuilder.noResults(
        args.searchTerm!,
        "Try a different search term or use the list operation to see all contacts."
      );
    }
    
    let responseText = `Found ${results.length} contacts matching "${args.searchTerm}":\n\n`;
    
    if (args.includeScore) {
      responseText += results.map((result: any) => 
        ResponseBuilder.formatContact(result.contact, true, result)
      ).join("\n\n");
    } else {
      responseText += results.map((contact: any) => 
        ResponseBuilder.formatContact(contact)
      ).join("\n\n");
    }
    
    return ResponseBuilder.success(responseText);
  }

  private async handleEmailLookup(args: ContactsArgs, contactsModule: any): Promise<MCPResponse> {
    const contacts = await contactsModule.findContactByEmail(args.email!);
    
    if (contacts.length === 0) {
      return ResponseBuilder.noResults(args.email!);
    }
    
    const maxResults = args.maxResults || 10;
    const limitedContacts = contacts.slice(0, maxResults);
    
    const responseText = `Found ${contacts.length} contact(s) with email "${args.email}":\n\n` +
      limitedContacts.map((contact: any) => ResponseBuilder.formatContact(contact)).join("\n\n");
    
    return ResponseBuilder.success(responseText);
  }

  private async handlePhoneLookup(args: ContactsArgs, contactsModule: any): Promise<MCPResponse> {
    const contactName = await contactsModule.findContactByPhone(args.phoneNumber!);
    
    if (!contactName) {
      return ResponseBuilder.noResults(args.phoneNumber!);
    }
    
    // Get full contact details
    const contacts = await contactsModule.searchContacts(contactName);
    if (contacts.length > 0) {
      const contact = contacts[0];
      const text = `Found contact with phone number "${args.phoneNumber}":\n\n` +
        ResponseBuilder.formatContact(contact);
      
      return ResponseBuilder.success(text);
    }
    
    return ResponseBuilder.success(`Found contact "${contactName}" but couldn't retrieve full details.`);
  }

  private async handleList(args: ContactsArgs, contactsModule: any): Promise<MCPResponse> {
    // First test access
    const testResult = await contactsModule.testContactsAccess();
    
    if (!testResult.success) {
      return this.createErrorResponse(
        `${testResult.message}\n\n` +
        `To fix this:\n` +
        `1. Open System Preferences > Security & Privacy > Privacy > Contacts\n` +
        `2. Make sure your terminal application or the app running this MCP server has permission\n` +
        `3. Try running the contacts command again`
      );
    }
    
    const allContacts = await contactsModule.getAllContacts();
    const contactList = Object.values(allContacts);
    
    if (contactList.length === 0) {
      return ResponseBuilder.success("✅ Successfully connected to Contacts app but no contacts found.");
    }
    
    const maxResults = args.maxResults || 20;
    const limitedContacts = contactList.slice(0, maxResults);
    const truncated = contactList.length > maxResults;
    
    let responseText = `✅ Found ${contactList.length} total contacts`;
    if (truncated) {
      responseText += ` (showing first ${maxResults})`;
    }
    responseText += ':\n\n';
    
    responseText += limitedContacts.map((contact: any) => 
      ResponseBuilder.formatContact(contact)
    ).join("\n\n");
    
    return ResponseBuilder.success(responseText);
  }
}