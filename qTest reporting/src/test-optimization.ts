import { QTestClient } from './qtest-client';
import { loadConfig } from './config';
import * as fs from 'fs';

interface TestResult {
  platform: string;
  method: string;
  testRunsFound: number;
  testLogsFound: number;
  durationMs: number;
  apiCalls: number;
  success: boolean;
  error?: string;
}

/**
 * Get date N days ago
 */
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get current date
 */
function getTodayDate(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Test the optimized method with date filtering
 */
async function testOptimizedMethod(
  client: QTestClient,
  projectId: number,
  testSuiteId: number,
  startDate: Date,
  endDate: Date
): Promise<{ testRuns: number; testLogs: number; duration: number; apiCalls: number }> {
  const startTime = Date.now();
  let apiCalls = 0;

  // Use optimized method with date filtering
  const testRuns = await client.getTestRunsForSuite(projectId, testSuiteId, startDate, endDate);
  apiCalls++; // One API call for test runs

  let totalTestLogs = 0;
  for (const testRun of testRuns) {
    try {
      const testLogs = await client.getTestLogsForRun(projectId, testRun.id);
      totalTestLogs += testLogs.length;
      apiCalls++; // One API call per test run
    } catch (error) {
      // Skip runs without logs
    }
  }

  const duration = Date.now() - startTime;

  return {
    testRuns: testRuns.length,
    testLogs: totalTestLogs,
    duration,
    apiCalls,
  };
}

/**
 * Test the old method without date filtering (for comparison)
 */
async function testOldMethod(
  client: QTestClient,
  projectId: number,
  testSuiteId: number,
  startDate: Date,
  endDate: Date
): Promise<{ testRuns: number; testLogs: number; duration: number; apiCalls: number }> {
  const startTime = Date.now();
  let apiCalls = 0;

  // Use old method without date filtering
  const apiClient = client.getApiClient();
  const runsResponse = await apiClient.get(`/api/v3/projects/${projectId}/test-runs`, {
    params: { parentId: testSuiteId, parentType: 'test-suite', pageSize: 100 },
  });
  apiCalls++;

  const allTestRuns = runsResponse.data?.items || [];

  let totalTestLogs = 0;
  let filteredTestRuns = 0;

  for (const testRun of allTestRuns) {
    try {
      const testLogs = await client.getTestLogsForRun(projectId, testRun.id);
      apiCalls++;

      // Filter in memory by date
      const filteredLogs = testLogs.filter((log) => {
        const dateValue = log.exe_end_date || log.exe_start_date;
        if (!dateValue) return false;
        const executionDateTime = new Date(dateValue);
        return executionDateTime >= startDate && executionDateTime <= endDate;
      });

      if (filteredLogs.length > 0) {
        filteredTestRuns++;
        totalTestLogs += filteredLogs.length;
      }
    } catch (error) {
      // Skip runs without logs
    }
  }

  const duration = Date.now() - startTime;

  return {
    testRuns: filteredTestRuns,
    testLogs: totalTestLogs,
    duration,
    apiCalls,
  };
}

/**
 * Test a specific platform (On-Prem or Cloud)
 */
async function testPlatform(configPath: string, platformName: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing ${platformName}`);
    console.log('='.repeat(80));

    // Load config
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    console.log(`\nConnecting to: ${config.qTestUrl}`);
    const client = new QTestClient(config);

    // Get projects
    console.log('Fetching projects...');
    const projects = await client.getProjects();
    console.log(`Found ${projects.length} projects`);

    if (projects.length === 0) {
      console.log('⚠️  No projects found, skipping tests');
      return results;
    }

    // Use first project
    const project = projects[0];
    console.log(`\nUsing project: ${project.name} (ID: ${project.id})`);

    // Get test suites
    console.log('Fetching test suites...');
    const testSuites = await client.getTestSuites(project.id);
    console.log(`Found ${testSuites.length} test suites`);

    if (testSuites.length === 0) {
      console.log('⚠️  No test suites found, skipping tests');
      return results;
    }

    // Use first test suite
    const testSuite = testSuites[0];
    console.log(`Using test suite: ${testSuite.name} (ID: ${testSuite.id})`);

    // Date range: last 7 days
    const startDate = getDaysAgo(7);
    const endDate = getTodayDate();
    console.log(`\nDate range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Test 1: Optimized method (with date filtering)
    console.log(`\n${'─'.repeat(80)}`);
    console.log('TEST 1: Optimized Method (API-level date filtering)');
    console.log('─'.repeat(80));

    let optimizedResult: any = null;

    try {
      optimizedResult = await testOptimizedMethod(
        client,
        project.id,
        testSuite.id,
        startDate,
        endDate
      );

      console.log(`✅ Test Runs Found: ${optimizedResult.testRuns}`);
      console.log(`✅ Test Logs Found: ${optimizedResult.testLogs}`);
      console.log(`✅ Duration: ${optimizedResult.duration}ms`);
      console.log(`✅ API Calls: ${optimizedResult.apiCalls}`);

      results.push({
        platform: platformName,
        method: 'Optimized (API filtering)',
        testRunsFound: optimizedResult.testRuns,
        testLogsFound: optimizedResult.testLogs,
        durationMs: optimizedResult.duration,
        apiCalls: optimizedResult.apiCalls,
        success: true,
      });
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      results.push({
        platform: platformName,
        method: 'Optimized (API filtering)',
        testRunsFound: 0,
        testLogsFound: 0,
        durationMs: 0,
        apiCalls: 0,
        success: false,
        error: error.message,
      });
    }

    // Test 2: Old method (in-memory filtering) - for comparison
    console.log(`\n${'─'.repeat(80)}`);
    console.log('TEST 2: Old Method (In-memory filtering) - For Comparison');
    console.log('─'.repeat(80));

    try {
      const oldResult = await testOldMethod(client, project.id, testSuite.id, startDate, endDate);

      console.log(`✅ Test Runs Found: ${oldResult.testRuns}`);
      console.log(`✅ Test Logs Found: ${oldResult.testLogs}`);
      console.log(`✅ Duration: ${oldResult.duration}ms`);
      console.log(`✅ API Calls: ${oldResult.apiCalls}`);

      results.push({
        platform: platformName,
        method: 'Old (In-memory filtering)',
        testRunsFound: oldResult.testRuns,
        testLogsFound: oldResult.testLogs,
        durationMs: oldResult.duration,
        apiCalls: oldResult.apiCalls,
        success: true,
      });

      // Calculate improvement
      if (optimizedResult && oldResult.duration > 0 && optimizedResult.duration > 0) {
        const speedup = (oldResult.duration / optimizedResult.duration).toFixed(2);
        const apiReduction = (
          ((oldResult.apiCalls - optimizedResult.apiCalls) / oldResult.apiCalls) *
          100
        ).toFixed(1);

        console.log(`\n📊 Performance Improvement:`);
        console.log(`   Speed: ${speedup}x faster`);
        console.log(`   API Calls Reduction: ${apiReduction}%`);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      results.push({
        platform: platformName,
        method: 'Old (In-memory filtering)',
        testRunsFound: 0,
        testLogsFound: 0,
        durationMs: 0,
        apiCalls: 0,
        success: false,
        error: error.message,
      });
    }
  } catch (error: any) {
    console.error(`\n❌ Platform test failed: ${error.message}`);
    console.error(error.stack);
  }

  return results;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           qTest Reporting Tool - Date Filtering Optimization Test            ║
║                              Version 1.3.4                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  const allResults: TestResult[] = [];

  // Test On-Prem
  const onPremResults = await testPlatform(
    './config-onprem-test.json',
    'qTest On-Prem (qtestop.staging.qtestnet.com)'
  );
  allResults.push(...onPremResults);

  // Test Cloud
  const cloudResults = await testPlatform(
    './config-cloud-test.json',
    'qTest Cloud (qteststaging2.staging.qtestnet.com)'
  );
  allResults.push(...cloudResults);

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  console.log('\n📊 Results Table:\n');
  console.log('Platform'.padEnd(30) + 'Method'.padEnd(25) + 'Duration'.padEnd(12) + 'API Calls'.padEnd(12) + 'Status');
  console.log('-'.repeat(80));

  for (const result of allResults) {
    const status = result.success ? '✅ Pass' : '❌ Fail';
    console.log(
      result.platform.substring(0, 28).padEnd(30) +
        result.method.padEnd(25) +
        `${result.durationMs}ms`.padEnd(12) +
        `${result.apiCalls}`.padEnd(12) +
        status
    );
  }

  // Calculate overall improvements
  const onPremOptimized = allResults.find(
    (r) => r.platform.includes('On-Prem') && r.method.includes('Optimized')
  );
  const onPremOld = allResults.find(
    (r) => r.platform.includes('On-Prem') && r.method.includes('Old')
  );
  const cloudOptimized = allResults.find(
    (r) => r.platform.includes('Cloud') && r.method.includes('Optimized')
  );
  const cloudOld = allResults.find(
    (r) => r.platform.includes('Cloud') && r.method.includes('Old')
  );

  console.log(`\n${'='.repeat(80)}`);
  console.log('PERFORMANCE IMPROVEMENTS');
  console.log('='.repeat(80));

  if (onPremOptimized && onPremOld && onPremOld.durationMs > 0) {
    const speedup = (onPremOld.durationMs / onPremOptimized.durationMs).toFixed(2);
    const apiReduction = (
      ((onPremOld.apiCalls - onPremOptimized.apiCalls) / onPremOld.apiCalls) *
      100
    ).toFixed(1);
    console.log(`\n🏢 On-Prem:`);
    console.log(`   Speed Improvement: ${speedup}x faster`);
    console.log(`   API Calls Reduction: ${apiReduction}%`);
    console.log(`   Time Saved: ${onPremOld.durationMs - onPremOptimized.durationMs}ms`);
  }

  if (cloudOptimized && cloudOld && cloudOld.durationMs > 0) {
    const speedup = (cloudOld.durationMs / cloudOptimized.durationMs).toFixed(2);
    const apiReduction = (
      ((cloudOld.apiCalls - cloudOptimized.apiCalls) / cloudOld.apiCalls) *
      100
    ).toFixed(1);
    console.log(`\n☁️  Cloud:`);
    console.log(`   Speed Improvement: ${speedup}x faster`);
    console.log(`   API Calls Reduction: ${apiReduction}%`);
    console.log(`   Time Saved: ${cloudOld.durationMs - cloudOptimized.durationMs}ms`);
  }

  // Save results to file
  const testReport = {
    testDate: new Date().toISOString(),
    version: '1.3.4',
    results: allResults,
  };

  fs.writeFileSync(
    './output/optimization-test-results.json',
    JSON.stringify(testReport, null, 2)
  );

  console.log(`\n✅ Test results saved to: ./output/optimization-test-results.json`);

  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST COMPLETE');
  console.log(`${'='.repeat(80)}\n`);
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { runTests };

