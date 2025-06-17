#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import tools from "./tools.js";
import { handlerRegistry } from "./handlers/HandlerRegistry.js";
import { moduleLoader } from "./utils/ModuleLoader.js";
import { loggers } from "./utils/Logger.js";

loggers.server.serverStarting();

// Optional: Preload commonly used modules for better performance
// This is non-blocking and will not delay server startup if it fails
moduleLoader.preloadModules([
  'contacts', 'notes', 'message', 'mail', 'reminders',
  'calendar', 'maps', 'photos', 'webSearch'
]).catch(error => {
  loggers.modules.warn("Module preloading had issues (this is non-critical)", { error: error.message });
});

// Main server object
let server: Server;

// Initialize the server and set up handlers
function initServer() {
  loggers.server.info("Initializing server with new handler architecture...");
  
  server = new Server(
    {
      name: "Apple MCP tools",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error("No arguments provided");
      }

      // Special debug tool for module status
      if (name === "debug-modules") {
        const stats = moduleLoader.getCacheStats();
        const moduleInfo = moduleLoader.getModuleInfo();
        
        return {
          content: [{
            type: "text",
            text: `Module Loading Stats:\n` +
                  `- Loaded modules: ${stats.loadedModules}\n` +
                  `- Total accesses: ${stats.totalAccesses}\n` +
                  `- Average access count: ${stats.averageAccessCount.toFixed(2)}\n\n` +
                  `Loaded Modules:\n` +
                  moduleInfo.map(({ name, info }) => 
                    `- ${name}: ${info.accessCount} accesses, loaded ${new Date(info.loadedAt).toLocaleTimeString()}`
                  ).join('\n')
          }],
          isError: false
        };
      }

      // Use handler registry for all tools
      return await handlerRegistry.handle(name, args);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server transport
  loggers.server.info("Setting up MCP server transport...");

  (async () => {
    try {
      loggers.server.debug("Initializing transport...");
      const transport = new StdioServerTransport();

      // Ensure stdout is only used for JSON messages
      loggers.server.debug("Setting up stdout filter...");
      const originalStdoutWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
        // Only allow JSON messages to pass through
        if (typeof chunk === "string" && !chunk.startsWith("{")) {
          loggers.server.debug("Filtering non-JSON stdout message");
          return true; // Silently skip non-JSON messages
        }
        return originalStdoutWrite(chunk, encoding, callback);
      };

      loggers.server.info("Connecting transport to server...");
      await server.connect(transport);
      loggers.server.serverReady();
    } catch (error) {
      loggers.server.serverError(error);
      process.exit(1);
    }
  })();
}

// Initialize the server immediately since we no longer need module pre-loading
initServer();