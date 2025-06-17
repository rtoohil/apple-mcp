/**
 * Handler for maps tool operations
 * Manages location search, directions, guides, and favorites
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface MapsArgs extends OperationArgs {
  operation: "search" | "save" | "directions" | "pin" | "listGuides" | "addToGuide" | "createGuide";
  query?: string;
  limit?: number;
  name?: string;
  address?: string;
  fromAddress?: string;
  toAddress?: string;
  transportType?: string;
  guideName?: string;
}

export class MapsHandler extends BaseToolHandler<MapsArgs> {
  constructor() {
    super('maps');
  }

  validateArgs(args: unknown): args is MapsArgs {
    return toolValidators.maps.validate<MapsArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('maps');
  }

  async handleOperation(args: MapsArgs, mapsModule: any): Promise<MCPResponse> {
    switch (args.operation) {
      case "search":
        return await this.handleSearch(args, mapsModule);
      case "save":
        return await this.handleSave(args, mapsModule);
      case "pin":
        return await this.handlePin(args, mapsModule);
      case "directions":
        return await this.handleDirections(args, mapsModule);
      case "listGuides":
        return await this.handleListGuides(mapsModule);
      case "addToGuide":
        return await this.handleAddToGuide(args, mapsModule);
      case "createGuide":
        return await this.handleCreateGuide(args, mapsModule);
      default:
        throw new Error(`Unknown maps operation: ${args.operation}`);
    }
  }

  private async handleSearch(args: MapsArgs, mapsModule: any): Promise<MCPResponse> {
    if (!args.query) {
      throw new Error("Search query is required for search operation");
    }
    
    const result = await mapsModule.searchLocations(args.query, args.limit);
    
    if (!result.success) {
      return this.createErrorResponse(result.message);
    }

    const responseText = `${result.message}\n\n` +
      result.locations.map((location: any) => 
        `Name: ${location.name}\n` +
        `Address: ${location.address}\n` +
        `${location.latitude && location.longitude ? `Coordinates: ${location.latitude}, ${location.longitude}\n` : ''}`
      ).join("\n\n");
    
    return ResponseBuilder.success(responseText);
  }

  private async handleSave(args: MapsArgs, mapsModule: any): Promise<MCPResponse> {
    if (!args.name || !args.address) {
      throw new Error("Name and address are required for save operation");
    }
    
    const result = await mapsModule.saveLocation(args.name, args.address);
    
    return {
      content: [{ type: "text", text: result.message }],
      isError: !result.success
    };
  }

  private async handlePin(args: MapsArgs, mapsModule: any): Promise<MCPResponse> {
    if (!args.name || !args.address) {
      throw new Error("Name and address are required for pin operation");
    }
    
    const result = await mapsModule.dropPin(args.name, args.address);
    
    return {
      content: [{ type: "text", text: result.message }],
      isError: !result.success
    };
  }

  private async handleDirections(args: MapsArgs, mapsModule: any): Promise<MCPResponse> {
    if (!args.fromAddress || !args.toAddress) {
      throw new Error("From and to addresses are required for directions operation");
    }
    
    const result = await mapsModule.getDirections(
      args.fromAddress, 
      args.toAddress, 
      args.transportType as 'driving' | 'walking' | 'transit'
    );
    
    return {
      content: [{ type: "text", text: result.message }],
      isError: !result.success
    };
  }

  private async handleListGuides(mapsModule: any): Promise<MCPResponse> {
    const result = await mapsModule.listGuides();
    
    return {
      content: [{ type: "text", text: result.message }],
      isError: !result.success
    };
  }

  private async handleAddToGuide(args: MapsArgs, mapsModule: any): Promise<MCPResponse> {
    if (!args.address || !args.guideName) {
      throw new Error("Address and guideName are required for addToGuide operation");
    }
    
    const result = await mapsModule.addToGuide(args.address, args.guideName);
    
    return {
      content: [{ type: "text", text: result.message }],
      isError: !result.success
    };
  }

  private async handleCreateGuide(args: MapsArgs, mapsModule: any): Promise<MCPResponse> {
    if (!args.guideName) {
      throw new Error("Guide name is required for createGuide operation");
    }
    
    const result = await mapsModule.createGuide(args.guideName);
    
    return {
      content: [{ type: "text", text: result.message }],
      isError: !result.success
    };
  }
}