/**
 * Simplified module loading system with caching and better error handling
 * Replaces the complex eager/lazy loading strategy with a clean, simple approach
 */

import { loggers } from './Logger.js';

export interface LoadedModule {
  module: any;
  loadedAt: number;
  lastAccessed: number;
  accessCount: number;
}

export class ModuleLoader {
  private moduleCache = new Map<string, LoadedModule>();
  private loadingPromises = new Map<string, Promise<any>>();

  /**
   * Load a utility module with caching
   * Prevents duplicate loading and provides better error handling
   */
  async loadModule(moduleName: string): Promise<any> {
    // Return cached module if available
    const cached = this.moduleCache.get(moduleName);
    if (cached) {
      cached.lastAccessed = Date.now();
      cached.accessCount++;
      return cached.module;
    }

    // Check if module is currently being loaded
    const loadingPromise = this.loadingPromises.get(moduleName);
    if (loadingPromise) {
      return await loadingPromise;
    }

    // Start loading the module
    const promise = this.loadModuleInternal(moduleName);
    this.loadingPromises.set(moduleName, promise);

    try {
      const module = await promise;
      
      // Cache the loaded module
      this.moduleCache.set(moduleName, {
        module,
        loadedAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1
      });

      return module;
    } catch (error) {
      // Remove failed loading promise so it can be retried
      this.loadingPromises.delete(moduleName);
      throw error;
    } finally {
      // Clean up loading promise on success or failure
      this.loadingPromises.delete(moduleName);
    }
  }

  /**
   * Internal module loading logic
   */
  private async loadModuleInternal(moduleName: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      loggers.modules.moduleLoading(moduleName);
      
      // Dynamic import with proper extension handling
      const module = await import(`../utils/${moduleName}.js`);
      
      if (!module.default) {
        throw new Error(`Module ${moduleName} does not have a default export`);
      }

      const duration = Date.now() - startTime;
      loggers.modules.moduleLoaded(moduleName, duration);
      return module.default;
    } catch (error) {
      loggers.modules.moduleError(moduleName, error);
      
      // Provide helpful error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Cannot resolve module')) {
          throw new Error(`Module '${moduleName}' not found. Make sure the file exists at utils/${moduleName}.js`);
        }
        if (error.message.includes('does not have a default export')) {
          throw new Error(`Module '${moduleName}' must have a default export`);
        }
        throw new Error(`Failed to load '${moduleName}' module: ${error.message}`);
      }
      
      throw new Error(`Failed to load '${moduleName}' module: ${String(error)}`);
    }
  }

  /**
   * Get information about loaded modules (for debugging)
   */
  getModuleInfo(): Array<{ name: string; info: LoadedModule }> {
    return Array.from(this.moduleCache.entries()).map(([name, info]) => ({
      name,
      info
    }));
  }

  /**
   * Clear the module cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.moduleCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    loadedModules: number;
    totalAccesses: number;
    averageAccessCount: number;
  } {
    const modules = Array.from(this.moduleCache.values());
    const totalAccesses = modules.reduce((sum, mod) => sum + mod.accessCount, 0);
    
    return {
      loadedModules: modules.length,
      totalAccesses,
      averageAccessCount: modules.length > 0 ? totalAccesses / modules.length : 0
    };
  }

  /**
   * Check if a module is loaded
   */
  isModuleLoaded(moduleName: string): boolean {
    return this.moduleCache.has(moduleName);
  }

  /**
   * Preload modules (optional optimization)
   */
  async preloadModules(moduleNames: string[]): Promise<void> {
    loggers.modules.info(`Preloading ${moduleNames.length} modules...`);
    
    const loadPromises = moduleNames.map(async (moduleName) => {
      try {
        await this.loadModule(moduleName);
      } catch (error) {
        loggers.modules.warn(`Failed to preload ${moduleName}`, { error: error.message });
        // Don't throw here - preloading is optional
      }
    });

    await Promise.allSettled(loadPromises);
    loggers.modules.success(`Preloading completed. ${this.moduleCache.size} modules loaded.`);
  }
}

// Export singleton instance
export const moduleLoader = new ModuleLoader();