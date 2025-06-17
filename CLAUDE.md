# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `bun install` - Install dependencies
- `bun run dev` - Start the MCP server (also `bun run index.ts`)
- No specific test or lint commands defined in package.json

## Architecture Overview

### MCP Server Structure
This is an Apple-native MCP (Model Context Protocol) server that provides deep integration with macOS applications through AppleScript and JXA (JavaScript for Automation). The server exposes 9 main tools for interacting with Apple ecosystem apps.

### Core Components
- **index.ts** - Main MCP server with lazy/eager loading strategy for modules
- **tools.ts** - Tool definitions and schemas for all 9 MCP tools
- **utils/** - Individual utility modules, one per Apple app integration

### Loading Strategy
The server implements a hybrid loading strategy:
- **Eager loading** (default): Attempts to load all modules at startup for performance
- **Safe mode fallback**: Switches to lazy loading if any module fails or takes >5 seconds
- Each utility module is imported only when first needed in safe mode

### Tool Architecture
Each tool follows a consistent pattern:
1. **Operation-based**: All tools use an `operation` parameter to specify the action
2. **Strong typing**: Input validation through TypeScript type guards
3. **Error handling**: Comprehensive error messages with troubleshooting guidance
4. **Apple integration**: Uses AppleScript/JXA for native app interaction

## Available Tools

### Core Functionality
- **contacts** - Search/manage contacts with fuzzy matching and caching
- **notes** - Search/create notes with folder organization
- **messages** - Send/read/schedule iMessages and SMS
- **mail** - Email management (send, search, unread count, mailboxes)
- **reminders** - Create/search reminders with due dates
- **calendar** - Event management (search, create, open)
- **maps** - Location search, directions, guides, favorites
- **photos** - Photo search by date/person/album/text, export functionality
- **webSearch** - DuckDuckGo web search integration

### Shared Utilities
- **ContactCache.ts** - TTL-based caching system for contact data
- **ValidationUtils.ts** - Input validation and sanitization

## Code Style

### TypeScript Configuration
- Target: ESNext with bundler module resolution
- Strict mode enabled
- JXA types included for Apple automation

### Naming Conventions
- PascalCase for Tool constants (e.g., `CONTACTS_TOOL`)
- camelCase for functions and variables
- Descriptive operation names (search, list, create, etc.)

### Error Handling
- Comprehensive try/catch around AppleScript execution
- User-friendly error messages with System Preferences guidance
- Graceful fallbacks between JXA and AppleScript approaches

### Apple Integration Patterns
- JXA preferred for complex operations, AppleScript for simple ones  
- URL encoding for deep links into Apple apps
- Permission checks with clear user guidance
- Caching strategies for performance (especially contacts)

### MCP Tool Structure
Each tool follows this pattern:
```typescript
const TOOL_NAME: Tool = {
  name: "toolName",
  description: "Clear description of functionality",
  inputSchema: {
    type: "object",
    properties: {
      operation: { enum: ["op1", "op2"] },
      // operation-specific parameters
    },
    required: ["operation"]
  }
};
```