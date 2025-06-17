/**
 * Handler for messages tool operations
 * Manages sending, reading, scheduling, and retrieving unread messages
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface MessagesArgs extends OperationArgs {
  operation: "send" | "read" | "schedule" | "unread";
  phoneNumber?: string;
  message?: string;
  limit?: number;
  scheduledTime?: string;
}

export class MessagesHandler extends BaseToolHandler<MessagesArgs> {
  constructor() {
    super('messages');
  }

  validateArgs(args: unknown): args is MessagesArgs {
    return toolValidators.messages.validate<MessagesArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('message');
  }

  async handleOperation(args: MessagesArgs, messageModule: any): Promise<MCPResponse> {
    switch (args.operation) {
      case "send":
        return await this.handleSend(args, messageModule);
      case "read":
        return await this.handleRead(args, messageModule);
      case "schedule":
        return await this.handleSchedule(args, messageModule);
      case "unread":
        return await this.handleUnread(args, messageModule);
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
  }

  private async handleSend(args: MessagesArgs, messageModule: any): Promise<MCPResponse> {
    if (!args.phoneNumber || !args.message) {
      throw new Error("Phone number and message are required for send operation");
    }

    await messageModule.sendMessage(args.phoneNumber, args.message);
    return ResponseBuilder.success(`Message sent to ${args.phoneNumber}`);
  }

  private async handleRead(args: MessagesArgs, messageModule: any): Promise<MCPResponse> {
    if (!args.phoneNumber) {
      throw new Error("Phone number is required for read operation");
    }

    const messages = await messageModule.readMessages(args.phoneNumber, args.limit);
    
    if (messages.length === 0) {
      return ResponseBuilder.success("No messages found");
    }

    const formatter = (msg: any) => ResponseBuilder.formatMessage(msg);
    const responseText = messages.map(formatter).join("\n");
    
    return ResponseBuilder.success(responseText);
  }

  private async handleSchedule(args: MessagesArgs, messageModule: any): Promise<MCPResponse> {
    if (!args.phoneNumber || !args.message || !args.scheduledTime) {
      throw new Error("Phone number, message, and scheduled time are required for schedule operation");
    }

    const scheduledMsg = await messageModule.scheduleMessage(
      args.phoneNumber,
      args.message,
      new Date(args.scheduledTime)
    );

    return ResponseBuilder.success(
      `Message scheduled to be sent to ${args.phoneNumber} at ${scheduledMsg.scheduledTime}`
    );
  }

  private async handleUnread(args: MessagesArgs, messageModule: any): Promise<MCPResponse> {
    const messages = await messageModule.getUnreadMessages(args.limit);
    
    if (messages.length === 0) {
      return ResponseBuilder.success("No unread messages found");
    }

    // Look up contact names for all messages
    const contactsModule = await this.loadUtilModule('contacts');
    const messagesWithNames = await Promise.all(
      messages.map(async msg => {
        // Only look up names for messages not from me
        if (!msg.is_from_me) {
          const contactName = await contactsModule.findContactByPhone(msg.sender);
          return {
            ...msg,
            displayName: contactName || msg.sender // Use contact name if found, otherwise use phone/email
          };
        }
        return {
          ...msg,
          displayName: 'Me'
        };
      })
    );

    const responseText = `Found ${messagesWithNames.length} unread message(s):\n` +
      messagesWithNames.map(msg => 
        `[${new Date(msg.date).toLocaleString()}] From ${msg.displayName}:\n${msg.content}`
      ).join("\n\n");

    return ResponseBuilder.success(responseText);
  }
}