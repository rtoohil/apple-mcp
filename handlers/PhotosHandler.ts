/**
 * Handler for photos tool operations
 * Manages photo searching, browsing, and management
 */

import { BaseToolHandler, type MCPResponse, type OperationArgs } from './BaseToolHandler.js';
import { ResponseBuilder } from './ResponseBuilder.js';
import { toolValidators } from '../validation/ToolSchemas.js';

interface PhotosArgs extends OperationArgs {
  operation: "albums" | "albumPhotos" | "search" | "dateRange" | "favorites" | 
            "memories" | "recent" | "export" | "open" | "people" | "personPhotos" | "screenshots";
  albumName?: string;
  searchText?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  photoId?: string;
  outputPath?: string;
  personName?: string;
}

export class PhotosHandler extends BaseToolHandler<PhotosArgs> {
  constructor() {
    super('photos');
  }

  validateArgs(args: unknown): args is PhotosArgs {
    return toolValidators.photos.validate<PhotosArgs>(args);
  }

  async loadModule() {
    return await this.loadUtilModule('photos');
  }

  async handleOperation(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    switch (args.operation) {
      case "albums":
        return await this.handleAlbums(photosModule);
      case "albumPhotos":
        return await this.handleAlbumPhotos(args, photosModule);
      case "search":
        return await this.handleSearch(args, photosModule);
      case "dateRange":
        return await this.handleDateRange(args, photosModule);
      case "favorites":
        return await this.handleFavorites(args, photosModule);
      case "memories":
        return await this.handleMemories(args, photosModule);
      case "recent":
        return await this.handleRecent(args, photosModule);
      case "export":
        return await this.handleExport(args, photosModule);
      case "open":
        return await this.handleOpen(args, photosModule);
      case "people":
        return await this.handlePeople(photosModule);
      case "personPhotos":
        return await this.handlePersonPhotos(args, photosModule);
      case "screenshots":
        return await this.handleScreenshots(args, photosModule);
      default:
        throw new Error(`Unknown photos operation: ${args.operation}`);
    }
  }

  private async handleAlbums(photosModule: any): Promise<MCPResponse> {
    const albums = await photosModule.getAllAlbums();
    
    if (albums.length === 0) {
      return ResponseBuilder.success("No albums found in Photos.");
    }

    const responseText = `Found ${albums.length} albums:\n\n${albums.map((album: any) => album.name).join("\n")}`;
    return ResponseBuilder.success(responseText);
  }

  private async handleAlbumPhotos(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    if (!args.albumName) {
      throw new Error("Album name is required for albumPhotos operation");
    }
    
    const photos = await photosModule.getPhotosFromAlbum(args.albumName, args.limit);
    
    if (photos.length === 0) {
      return ResponseBuilder.success(`No photos found in album "${args.albumName}" or album doesn't exist.`);
    }

    return ResponseBuilder.createListResponse(
      photos,
      'photo',
      (photo: any) => ResponseBuilder.formatPhoto(photo),
      undefined,
      ` in album "${args.albumName}"`
    );
  }

  private async handleSearch(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    if (!args.searchText) {
      throw new Error("Search text is required for search operation");
    }
    
    const photos = await photosModule.searchPhotosByText(args.searchText, args.limit);
    
    if (photos.length === 0) {
      return ResponseBuilder.noResults(args.searchText);
    }

    return ResponseBuilder.createListResponse(
      photos,
      'photo',
      (photo: any) => ResponseBuilder.formatPhoto(photo),
      undefined,
      ` matching "${args.searchText}"`
    );
  }

  private async handleDateRange(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    if (!args.startDate || !args.endDate) {
      throw new Error("Start date and end date are required for dateRange operation");
    }
    
    const photos = await photosModule.searchPhotosByDateRange(args.startDate, args.endDate, args.limit);
    
    const startDateText = new Date(args.startDate).toLocaleDateString();
    const endDateText = new Date(args.endDate).toLocaleDateString();
    
    if (photos.length === 0) {
      return ResponseBuilder.success(`No photos found between ${startDateText} and ${endDateText}.`);
    }

    return ResponseBuilder.createListResponse(
      photos,
      'photo',
      (photo: any) => ResponseBuilder.formatPhoto(photo),
      undefined,
      ` between ${startDateText} and ${endDateText}`
    );
  }

  private async handleFavorites(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    const photos = await photosModule.getFavoritePhotos(args.limit);
    
    if (photos.length === 0) {
      return ResponseBuilder.success("No favorite photos found.");
    }

    return ResponseBuilder.createListResponse(
      photos,
      'favorite photo',
      (photo: any) => ResponseBuilder.formatPhoto(photo)
    );
  }

  private async handleMemories(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    const memories = await photosModule.getMemories(args.limit);
    
    if (memories.length === 0) {
      return ResponseBuilder.success("No memory collections found.");
    }

    const responseText = `Found ${memories.length} memory collections:\n\n` +
      memories.map((memory: any) => 
        `${memory.title} (${new Date(memory.date).toLocaleDateString()}) - ${memory.photos.length} photos`
      ).join("\n");
    
    return ResponseBuilder.success(responseText);
  }

  private async handleRecent(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    const limit = args.limit || 20;
    const photos = await photosModule.getRecentPhotos(limit);
    
    if (photos.length === 0) {
      return ResponseBuilder.success("No recent photos found.");
    }

    return ResponseBuilder.createListResponse(
      photos,
      'recent photo',
      (photo: any) => ResponseBuilder.formatPhoto(photo)
    );
  }

  private async handleExport(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    if (!args.photoId || !args.outputPath) {
      throw new Error("Photo ID and output path are required for export operation");
    }
    
    const result = await photosModule.exportPhoto(args.photoId, args.outputPath);
    
    if (result.success) {
      return ResponseBuilder.success(`Photo exported successfully to ${result.path}`);
    } else {
      return this.createErrorResponse(`Failed to export photo: ${result.message}`);
    }
  }

  private async handleOpen(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    if (!args.photoId) {
      throw new Error("Photo ID is required for open operation");
    }
    
    const result = await photosModule.openPhoto(args.photoId);
    
    if (result.success) {
      return ResponseBuilder.success(result.message);
    } else {
      return this.createErrorResponse(`Failed to open photo: ${result.message}`);
    }
  }

  private async handlePeople(photosModule: any): Promise<MCPResponse> {
    const people = await photosModule.getPeople();
    
    if (people.length === 0) {
      return ResponseBuilder.success("No people found in Photos.");
    }

    const responseText = `Found ${people.length} people in Photos:\n\n${people.join("\n")}`;
    return ResponseBuilder.success(responseText);
  }

  private async handlePersonPhotos(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    if (!args.personName) {
      throw new Error("Person name is required for personPhotos operation");
    }
    
    const photos = await photosModule.getPhotosByPerson(args.personName, args.limit);
    
    if (photos.length === 0) {
      return ResponseBuilder.success(`No photos found of ${args.personName}.`);
    }

    return ResponseBuilder.createListResponse(
      photos,
      'photo',
      (photo: any) => ResponseBuilder.formatPhoto(photo),
      undefined,
      ` of ${args.personName}`
    );
  }

  private async handleScreenshots(args: PhotosArgs, photosModule: any): Promise<MCPResponse> {
    const photos = await photosModule.findScreenshots(args.limit);
    
    if (photos.length === 0) {
      return ResponseBuilder.success("No screenshots found in Photos.");
    }

    return ResponseBuilder.createListResponse(
      photos,
      'screenshot',
      (photo: any) => ResponseBuilder.formatPhoto(photo)
    );
  }
}