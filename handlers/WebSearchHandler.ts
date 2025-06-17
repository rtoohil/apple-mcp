/**
 * Handler for web search tool operations
 * Manages web search functionality using DuckDuckGo
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface WebSearchArgs {
  query: string;
}

export class WebSearchHandler extends BaseToolHandler<WebSearchArgs> {
  constructor() {
    super('webSearch');
  }

  validateArgs(args: unknown): args is WebSearchArgs {
    return toolValidators.webSearch.validate(args);
  }

  async loadModule() {
    return await this.loadUtilModule('webSearch');
  }

  async handleOperation(args: WebSearchArgs, webSearchModule: any): Promise<MCPResponse> {
    const result = await webSearchModule.webSearch(args.query);
    
    if (result.results.length === 0) {
      return ResponseBuilder.noResults(args.query);
    }

    const responseText = `Found ${result.results.length} results for "${args.query}". ` +
      result.results.map((r: any) => 
        `[${r.displayUrl}] ${r.title} - ${r.snippet} \ncontent: ${r.content}`
      ).join("\n");

    return ResponseBuilder.success(responseText);
  }
}