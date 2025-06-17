import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { ModuleLoader } from "../../utils/ModuleLoader.js";
import { suppressConsole, restoreConsole, captureStderrAsync } from "../test-setup.js";

describe("ModuleLoader", () => {
  let loader: ModuleLoader;

  beforeEach(() => {
    suppressConsole();
    loader = new ModuleLoader();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe("loadModule", () => {
    test("should load and cache module successfully", async () => {
      // Mock a successful module load
      const mockModule = { testFunction: () => "test result" };
      const originalImport = globalThis.import;
      
      globalThis.import = mock().mockResolvedValue({ default: mockModule });

      const result = await loader.loadModule("testModule");

      expect(result).toEqual(mockModule);
      expect(globalThis.import).toHaveBeenCalledWith("../utils/testModule.js");

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should return cached module on subsequent calls", async () => {
      // Mock a successful module load
      const mockModule = { testFunction: () => "test result" };
      const originalImport = globalThis.import;
      const mockImportFn = mock().mockResolvedValue({ default: mockModule });
      
      globalThis.import = mockImportFn;

      // First call
      const result1 = await loader.loadModule("testModule");
      // Second call
      const result2 = await loader.loadModule("testModule");

      expect(result1).toEqual(mockModule);
      expect(result2).toEqual(mockModule);
      expect(result1).toBe(result2); // Should be the same object reference
      expect(mockImportFn).toHaveBeenCalledTimes(1); // Should only import once

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should handle module loading failures", async () => {
      const originalImport = globalThis.import;
      globalThis.import = mock().mockRejectedValue(new Error("Module not found"));

      const stderr = await captureStderrAsync(async () => {
        await expect(loader.loadModule("nonexistentModule")).rejects.toThrow("Module not found");
      });

      expect(stderr.some(line => line.includes("Failed to load module"))).toBe(true);

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should handle modules without default export", async () => {
      const originalImport = globalThis.import;
      globalThis.import = mock().mockResolvedValue({}); // No default export

      await expect(loader.loadModule("moduleWithoutDefault")).rejects.toThrow("Module moduleWithoutDefault does not have a default export");

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should clear cache when requested", async () => {
      const mockModule = { testFunction: () => "test result" };
      const originalImport = globalThis.import;
      const mockImportFn = mock().mockResolvedValue({ default: mockModule });
      
      globalThis.import = mockImportFn;

      // Load module
      await loader.loadModule("testModule");
      
      // Clear cache
      loader.clearCache();
      
      // Load again
      await loader.loadModule("testModule");

      expect(mockImportFn).toHaveBeenCalledTimes(2); // Should import twice after cache clear

      // Restore original import
      globalThis.import = originalImport;
    });
  });

  describe("preloadModules", () => {
    test("should preload all specified modules", async () => {
      const modules = ["contacts", "calendar", "message"];
      const mockModules = {
        contacts: { searchContacts: () => {} },
        calendar: { searchEvents: () => {} },
        message: { sendMessage: () => {} }
      };

      const originalImport = globalThis.import;
      globalThis.import = mock().mockImplementation((path: string) => {
        const moduleName = path.split('/').pop()?.replace('.js', '') || '';
        return Promise.resolve({ default: mockModules[moduleName as keyof typeof mockModules] });
      });

      const results = await loader.preloadModules(modules);

      expect(results.successful).toEqual(modules);
      expect(results.failed).toEqual([]);
      expect(results.totalTime).toBeGreaterThan(0);

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should handle partial failures during preloading", async () => {
      const modules = ["contacts", "nonexistent", "calendar"];
      const mockModules = {
        contacts: { searchContacts: () => {} },
        calendar: { searchEvents: () => {} }
      };

      const originalImport = globalThis.import;
      globalThis.import = mock().mockImplementation((path: string) => {
        const moduleName = path.split('/').pop()?.replace('.js', '') || '';
        if (moduleName === "nonexistent") {
          return Promise.reject(new Error("Module not found"));
        }
        return Promise.resolve({ default: mockModules[moduleName as keyof typeof mockModules] });
      });

      const stderr = await captureStderrAsync(async () => {
        const results = await loader.preloadModules(modules);
        
        expect(results.successful).toEqual(["contacts", "calendar"]);
        expect(results.failed).toEqual(["nonexistent"]);
      });

      expect(stderr.some(line => line.includes("Failed to preload module"))).toBe(true);

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should log preloading summary", async () => {
      const modules = ["contacts"];
      const mockModule = { searchContacts: () => {} };

      const originalImport = globalThis.import;
      globalThis.import = mock().mockResolvedValue({ default: mockModule });

      const stderr = await captureStderrAsync(async () => {
        await loader.preloadModules(modules);
      });

      expect(stderr.some(line => line.includes("Preloading completed"))).toBe(true);
      expect(stderr.some(line => line.includes("1 modules loaded"))).toBe(true);

      // Restore original import
      globalThis.import = originalImport;
    });
  });

  describe("getCacheStats", () => {
    test("should return correct cache statistics", async () => {
      const mockModule = { testFunction: () => "test result" };
      const originalImport = globalThis.import;
      globalThis.import = mock().mockResolvedValue({ default: mockModule });

      // Initially empty cache
      let stats = loader.getCacheStats();
      expect(stats.totalModules).toBe(0);
      expect(stats.modules).toEqual([]);

      // Load a module
      await loader.loadModule("testModule");
      
      stats = loader.getCacheStats();
      expect(stats.totalModules).toBe(1);
      expect(stats.modules).toHaveLength(1);
      expect(stats.modules[0].name).toBe("testModule");
      expect(stats.modules[0].loadTime).toBeGreaterThan(0);

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should show multiple modules in cache", async () => {
      const mockModule = { testFunction: () => "test result" };
      const originalImport = globalThis.import;
      globalThis.import = mock().mockResolvedValue({ default: mockModule });

      await loader.loadModule("module1");
      await loader.loadModule("module2");

      const stats = loader.getCacheStats();
      expect(stats.totalModules).toBe(2);
      expect(stats.modules.map(m => m.name)).toEqual(["module1", "module2"]);

      // Restore original import
      globalThis.import = originalImport;
    });
  });

  describe("hasModule", () => {
    test("should return true for cached modules", async () => {
      const mockModule = { testFunction: () => "test result" };
      const originalImport = globalThis.import;
      globalThis.import = mock().mockResolvedValue({ default: mockModule });

      expect(loader.hasModule("testModule")).toBe(false);
      
      await loader.loadModule("testModule");
      
      expect(loader.hasModule("testModule")).toBe(true);

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should return false for uncached modules", () => {
      expect(loader.hasModule("nonexistentModule")).toBe(false);
    });
  });

  describe("error handling", () => {
    test("should handle network-like errors gracefully", async () => {
      const originalImport = globalThis.import;
      globalThis.import = mock().mockRejectedValue(new Error("Network error"));

      const stderr = await captureStderrAsync(async () => {
        await expect(loader.loadModule("networkModule")).rejects.toThrow("Network error");
      });

      expect(stderr.some(line => line.includes("Failed to load module"))).toBe(true);

      // Restore original import
      globalThis.import = originalImport;
    });

    test("should handle malformed modules", async () => {
      const originalImport = globalThis.import;
      globalThis.import = mock().mockResolvedValue({ notDefault: "wrong export" });

      await expect(loader.loadModule("malformedModule")).rejects.toThrow("does not have a default export");

      // Restore original import
      globalThis.import = originalImport;
    });
  });
});