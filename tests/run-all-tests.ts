#!/usr/bin/env bun

/**
 * Comprehensive test runner for the apple-mcp project
 * Runs all test suites and generates coverage reports
 */

import { $ } from "bun";

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  success: boolean;
}

async function runTestSuite(name: string, pattern: string): Promise<TestResult> {
  console.log(`\n🧪 Running ${name} tests...`);
  const start = Date.now();
  
  try {
    const result = await $`bun test ${pattern} --reporter=verbose`.quiet();
    const duration = Date.now() - start;
    
    // Parse the output to extract test results
    const output = result.stdout.toString();
    const passMatch = output.match(/(\d+) pass/);
    const failMatch = output.match(/(\d+) fail/);
    
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    
    console.log(`✅ ${name}: ${passed} passed, ${failed} failed (${duration}ms)`);
    
    return {
      suite: name,
      passed,
      failed,
      duration,
      success: failed === 0
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name}: Failed to run (${duration}ms)`);
    
    return {
      suite: name,
      passed: 0,
      failed: 1,
      duration,
      success: false
    };
  }
}

async function main() {
  console.log("🚀 Starting comprehensive test suite for apple-mcp\n");
  
  const testSuites = [
    { name: "Validation", pattern: "tests/unit/validation-working.test.ts" },
    { name: "Logging", pattern: "tests/unit/logging.test.ts" },
    { name: "Module Loading", pattern: "tests/unit/module-loader.test.ts" },
    { name: "Handlers", pattern: "tests/unit/handlers.test.ts" },
    { name: "Integration", pattern: "tests/integration/mcp-server.test.ts" }
  ];
  
  const results: TestResult[] = [];
  
  // Run each test suite
  for (const suite of testSuites) {
    const result = await runTestSuite(suite.name, suite.pattern);
    results.push(result);
  }
  
  // Generate summary report
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY REPORT");
  console.log("=".repeat(60));
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;
  
  results.forEach(result => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${result.suite.padEnd(15)} ${result.passed} passed, ${result.failed} failed (${result.duration}ms)`);
    
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalDuration += result.duration;
  });
  
  console.log("=".repeat(60));
  console.log(`📈 TOTALS: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`⏱️  Total time: ${totalDuration}ms`);
  console.log(`🎯 Success rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  
  // Determine overall result
  const allPassed = results.every(r => r.success);
  
  if (allPassed) {
    console.log("\n🎉 All tests passed! The codebase is ready for deployment.");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Please review and fix before deployment.");
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.main) {
  main().catch(error => {
    console.error("❌ Test runner failed:", error);
    process.exit(1);
  });
}