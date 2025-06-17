/**
 * Base class for all MCP tool handlers
 * Provides common functionality and structure for tool implementations
 */

import { loggers } from '../utils/Logger.js';

export interface MCPResponse {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
  [key: string]: any;
}

export interface OperationArgs {
  operation: string;
  [key: string]: any;
}

export abstract class BaseToolHandler<TArgs extends OperationArgs, TModule = any> {
  protected toolName: string;

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  /**
   * Validates the arguments for this tool
   */
  abstract validateArgs(args: unknown): args is TArgs;

  /**
   * Loads the utility module for this tool
   */
  abstract loadModule(): Promise<TModule>;

  /**
   * Handles the specific operation for this tool
   */
  abstract handleOperation(args: TArgs, module: TModule): Promise<MCPResponse>;

  /**
   * Main entry point for handling tool requests
   */
  async handle(args: unknown): Promise<MCPResponse> {
    try {
      if (!args) {
        return this.createErrorResponse("No arguments provided");
      }

      if (!this.validateArgs(args)) {
        return this.createErrorResponse(`Invalid arguments for ${this.toolName} tool`);
      }

      const module = await this.loadModule();
      return await this.handleOperation(args, module);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Creates a standardized success response
   */
  protected createSuccessResponse(text: string, additionalData?: object): MCPResponse {
    return {
      content: [{ type: "text", text }],
      isError: false,
      ...additionalData
    };
  }

  /**
   * Creates a standardized error response
   */
  protected createErrorResponse(message: string): MCPResponse {
    return {
      content: [{ type: "text", text: `❌ ${message}` }],
      isError: true
    };
  }

  /**
   * Creates a "no results found" response
   */
  protected createNoResultsResponse(searchTerm: string, suggestions?: string): MCPResponse {
    let message = `No results found for "${searchTerm}".`;
    if (suggestions) {
      message += ` ${suggestions}`;
    }
    return this.createSuccessResponse(message);
  }

  /**
   * Handles errors in a consistent way
   */
  protected handleError(error: unknown): MCPResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    loggers.handlers.toolError(this.toolName, error);
    
    return this.createErrorResponse(
      `Error with ${this.toolName} operation: ${errorMessage}`
    );
  }

  /**
   * Helper method to load modules dynamically using the centralized loader
   */
  protected async loadUtilModule(moduleName: string): Promise<any> {
    const { moduleLoader } = await import('../utils/ModuleLoader.js');
    return await moduleLoader.loadModule(moduleName);
  }
}