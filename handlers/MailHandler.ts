/**
 * Handler for mail tool operations  
 * Manages email sending, searching, and mailbox operations
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface MailArgs extends OperationArgs {
  operation: "unread" | "inbox" | "search" | "send" | "mailboxes" | "accounts";
  limit?: number;
  searchTerm?: string;
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

export class MailHandler extends BaseToolHandler<MailArgs> {
  constructor() {
    super('mail');
  }

  validateArgs(args: unknown): args is MailArgs {
    return toolValidators.mail.validate<MailArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('mail');
  }

  async handleOperation(args: MailArgs, mailModule: any): Promise<MCPResponse> {
    switch (args.operation) {
      case "unread":
        return await this.handleUnread(args, mailModule);
      case "inbox":
        return await this.handleInbox(args, mailModule);
      case "search":
        return await this.handleSearch(args, mailModule);
      case "send":
        return await this.handleSend(args, mailModule);
      case "mailboxes":
        return await this.handleMailboxes(mailModule);
      case "accounts":
        return await this.handleAccounts(mailModule);
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
  }

  private async handleUnread(args: MailArgs, mailModule: any): Promise<MCPResponse> {
    const emails = await mailModule.getUnreadMails(args.limit);
    
    if (emails.length === 0) {
      return ResponseBuilder.success("No unread emails found");
    }

    const responseText = `Found ${emails.length} unread email(s):\n\n` +
      emails.map((email: any) => ResponseBuilder.formatEmail(email)).join("\n\n");

    return ResponseBuilder.success(responseText);
  }

  private async handleInbox(args: MailArgs, mailModule: any): Promise<MCPResponse> {
    const emails = await mailModule.getInboxMails(args.limit);
    
    if (emails.length === 0) {
      return ResponseBuilder.success("No emails found in inbox");
    }

    const responseText = `Found ${emails.length} email(s) in inbox:\n\n` +
      emails.map((email: any) => ResponseBuilder.formatEmail(email)).join("\n\n");

    return ResponseBuilder.success(responseText);
  }

  private async handleSearch(args: MailArgs, mailModule: any): Promise<MCPResponse> {
    if (!args.searchTerm) {
      throw new Error("Search term is required for search operation");
    }

    const emails = await mailModule.searchMails(args.searchTerm, args.limit);
    
    if (emails.length === 0) {
      return ResponseBuilder.noResults(args.searchTerm);
    }

    const responseText = `Found ${emails.length} email(s) for "${args.searchTerm}":\n\n` +
      emails.map((email: any) => {
        // For search results, don't include URL to avoid cluttering
        const content = email.content.substring(0, 200);
        const truncated = email.content.length > 200 ? '...' : '';
        
        return `[${email.dateSent}] From: ${email.sender}\n` +
               `Mailbox: ${email.mailbox}\n` +
               `Subject: ${email.subject}\n` +
               `${content}${truncated}`;
      }).join("\n\n");

    return ResponseBuilder.success(responseText);
  }

  private async handleSend(args: MailArgs, mailModule: any): Promise<MCPResponse> {
    if (!args.to || !args.subject || !args.body) {
      throw new Error("Recipient (to), subject, and body are required for send operation");
    }

    await mailModule.sendMail(args.to, args.subject, args.body, args.cc, args.bcc);
    return ResponseBuilder.success(`Email sent successfully to ${args.to}`);
  }

  private async handleMailboxes(mailModule: any): Promise<MCPResponse> {
    const mailboxes = await mailModule.getMailboxes();
    
    if (mailboxes.length === 0) {
      return ResponseBuilder.success("No mailboxes found. Make sure Mail app is running and properly configured.");
    }

    const responseText = `Found ${mailboxes.length} mailboxes:\n\n${mailboxes.join("\n")}`;
    return ResponseBuilder.success(responseText);
  }

  private async handleAccounts(mailModule: any): Promise<MCPResponse> {
    const accounts = await mailModule.getAccounts();
    
    if (accounts.length === 0) {
      return ResponseBuilder.success("No email accounts found. Make sure Mail app is configured with at least one account.");
    }

    const responseText = `Found ${accounts.length} email accounts:\n\n${accounts.join("\n")}`;
    return ResponseBuilder.success(responseText);
  }
}