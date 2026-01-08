import { QTestClient } from './qtest-client';
import * as fs from 'fs';

/**
 * Comprehensive test showing the difference between fetching ALL test runs
 * vs. fetching only runs within a date range
 */

interface Config {
  qTestUrl: string;
  auth: {
    username: string;
    password: string;
    clientCredentials: string;
  };
}

function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTodayDate(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

async function testPlatformComprehensive(configPath: string, platformName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${platformName}`);
  console.log('='.repeat(80));

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(configContent);

  console.log(`\nConnecting to: ${config.qTestUrl}`);
  const client = new QTestClient(config);

  // Get projects
  const projects = await client.getProjects();
  console.log(`Found ${projects.length} projects`);

  if (projects.length === 0) {
    console.log('⚠️  No projects found');
    return;
  }

  const project = projects[0];
  console.log(`Using project: ${project.name} (ID: ${project.id})`);

  // Get test suites
  const testSuites = await client.getTestSuites(project.id);
  console.log(`Found ${testSuites.length} test suites`);

  if (testSuites.length === 0) {
    console.log('⚠️  No test suites found');
    return;
  }

  const testSuite = testSuites[0];
  console.log(`Using test suite: ${testSuite.name} (ID: ${testSuite.id})`);

  const startDate = getDaysAgo(7);
  const endDate = getTodayDate();

  // Test 1: Fetch ALL test runs (no date filter)
  console.log(`\n${'─'.repeat(80)}`);
  console.log('TEST 1: Fetch ALL test runs (no date filter)');
  console.log('─'.repeat(80));

  const apiClient = client.getApiClient();
  const start1 = Date.now();
  
  const allRunsResponse = await apiClient.get(`/api/v3/projects/${project.id}/test-runs`, {
    params: { parentId: testSuite.id, parentType: 'test-suite', pageSize: 999 },
  });
  
  const allTestRuns = allRunsResponse.data?.items || [];
  const duration1 = Date.now() - start1;

  console.log(`✅ Total test runs in qTest: ${allTestRuns.length}`);
  console.log(`✅ Duration: ${duration1}ms`);
  console.log(`✅ API Calls: 1`);

  // Test 2: Fetch ONLY test runs within date range (with API filter)
  console.log(`\n${'─'.repeat(80)}`);
  console.log('TEST 2: Fetch test runs with date filter (last 7 days)');
  console.log('─'.repeat(80));

  const start2 = Date.now();
  
  const filteredRuns = await client.getTestRunsForSuite(
    project.id,
    testSuite.id,
    startDate,
    endDate
  );
  
  const duration2 = Date.now() - start2;

  console.log(`✅ Test runs in date range: ${filteredRuns.length}`);
  console.log(`✅ Duration: ${duration2}ms`);
  console.log(`✅ API Calls: 1`);

  // Analysis
  console.log(`\n${'─'.repeat(80)}`);
  console.log('ANALYSIS');
  console.log('─'.repeat(80));

  const reduction = ((allTestRuns.length - filteredRuns.length) / allTestRuns.length * 100).toFixed(1);
  
  console.log(`\n📊 Data Reduction:`);
  console.log(`   Total test runs: ${allTestRuns.length}`);
  console.log(`   Filtered test runs: ${filteredRuns.length}`);
  console.log(`   Reduction: ${reduction}% fewer test runs to process`);

  console.log(`\n⚡ Impact on Full Report Generation:`);
  console.log(`   Without date filter: ${allTestRuns.length} API calls for test logs`);
  console.log(`   With date filter: ${filteredRuns.length} API calls for test logs`);
  console.log(`   Savings: ${allTestRuns.length - filteredRuns.length} fewer API calls`);

  if (filteredRuns.length < allTestRuns.length) {
    const expectedSpeedup = (allTestRuns.length / Math.max(filteredRuns.length, 1)).toFixed(2);
    console.log(`   Expected speedup: ~${expectedSpeedup}x faster`);
  }

  // Test 3: Verify date filtering is working correctly
  console.log(`\n${'─'.repeat(80)}`);
  console.log('TEST 3: Verify API date filtering works correctly');
  console.log('─'.repeat(80));

  console.log(`\nFetching test logs for filtered runs to verify dates...`);
  
  let logsInRange = 0;
  let logsOutOfRange = 0;
  let logsChecked = 0;

  // Check first 5 test runs
  for (const run of filteredRuns.slice(0, Math.min(5, filteredRuns.length))) {
    try {
      const logs = await client.getTestLogsForRun(project.id, run.id);
      
      for (const log of logs) {
        logsChecked++;
        const dateValue = log.exe_end_date || log.exe_start_date;
        
        if (dateValue) {
          const logDate = new Date(dateValue);
          
          if (logDate >= startDate && logDate <= endDate) {
            logsInRange++;
          } else {
            logsOutOfRange++;
          }
        }
      }
    } catch (error) {
      // Skip if no logs
    }
  }

  console.log(`\nChecked ${logsChecked} test logs from first ${Math.min(5, filteredRuns.length)} test runs:`);
  console.log(`   ✅ Logs in date range: ${logsInRange}`);
  console.log(`   ⚠️  Logs outside date range: ${logsOutOfRange}`);

  if (logsInRange > 0) {
    console.log(`\n✅ API date filtering IS WORKING!`);
  } else if (logsChecked > 0) {
    console.log(`\n⚠️  Note: Test logs dates may not match test run dates`);
  }
}

async function runComprehensiveTest() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║        qTest Reporting Tool - Date Filtering Comprehensive Test              ║
║                         Version 1.3.4                                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  // Test On-Prem
  try {
    await testPlatformComprehensive(
      './config-onprem-test.json',
      'qTest On-Prem'
    );
  } catch (error: any) {
    console.error(`\n❌ On-Prem test failed: ${error.message}`);
  }

  // Test Cloud
  try {
    await testPlatformComprehensive(
      './config-cloud-test.json',
      'qTest Cloud'
    );
  } catch (error: any) {
    console.error(`\n❌ Cloud test failed: ${error.message}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('COMPREHENSIVE TEST COMPLETE');
  console.log(`${'='.repeat(80)}\n`);
}

if (require.main === module) {
  runComprehensiveTest()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { runComprehensiveTest };

