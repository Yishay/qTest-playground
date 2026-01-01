#!/usr/bin/env node

import { loadConfig } from './config';
import { QTestClient } from './qtest-client';
import { EventGenerator } from './event-generator';
import { FileManager } from './file-manager';
import { QTestTestLog, QTestUser, TestStageOutput } from './types';

/**
 * Parse command line arguments
 */
function parseArgs(): { days: number; projectId?: number } {
  const args = process.argv.slice(2);
  let days = 7; // Default to 7 days
  let projectId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && i + 1 < args.length) {
      days = parseInt(args[i + 1], 10);
      if (isNaN(days) || days <= 0) {
        console.error('Error: --days must be a positive number');
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--all') {
      days = 365 * 10; // Get all data (10 years)
    } else if (args[i] === '--project' && i + 1 < args.length) {
      projectId = parseInt(args[i + 1], 10);
      if (isNaN(projectId)) {
        console.error('Error: --project must be a valid project ID number');
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
qTest On-Premise Data Extraction Tool

Usage: npm run extract [options]

Options:
  --days <N>        Number of days to look back (default: 7)
  --all             Extract all available test data
  --project <ID>    Extract data for a specific project only
  --help, -h        Show this help message

Examples:
  npm run extract                    # Extract last 7 days
  npm run extract -- --days 30       # Extract last 30 days
  npm run extract -- --all           # Extract all data
  npm run extract -- --project 12345 # Extract specific project
      `);
      process.exit(0);
    }
  }

  return { days, projectId };
}

/**
 * Main extraction function
 */
async function main() {
  try {
    const { days, projectId } = parseArgs();
    
    console.log('========================================');
    console.log('qTest On-Premise Data Extraction Tool');
    console.log('========================================\n');

    // Load configuration
    console.log('📋 Loading configuration...');
    const config = loadConfig();

    // Initialize clients
    console.log('🔐 Initializing qTest client...');
    const client = new QTestClient(config);
    const eventGenerator = new EventGenerator(config);
    const fileManager = new FileManager('output');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`   (${days} days)\n`);

    // Fetch users for mapping
    console.log('👥 Fetching users...');
    const users: QTestUser[] = await client.getUsers();
    console.log(`   Found ${users.length} users\n`);

    // Create user ID to email map
    const userIdToEmailMap = new Map<number, string>();
    users.forEach((user) => {
      if (user.id) {
        const email = user.email || user.username;
        if (email) {
          userIdToEmailMap.set(user.id, email);
        }
      }
    });

    // Fetch projects
    console.log('🗂️  Fetching projects...');
    let projects = await client.getProjects();
    
    // Filter by specific project if requested
    if (projectId) {
      projects = projects.filter((p) => p.id === projectId);
      if (projects.length === 0) {
        console.error(`❌ Project with ID ${projectId} not found`);
        process.exit(1);
      }
      console.log(`   Filtering for project: ${projects[0].name} (ID: ${projectId})\n`);
    } else {
      console.log(`   Found ${projects.length} projects\n`);
    }

    const allOutputs: TestStageOutput[] = [];
    let totalTestLogs = 0;

    // Process each project
    for (const project of projects) {
      console.log(`\n📦 Processing project: ${project.name} (ID: ${project.id})`);

      try {
        const apiClient = (client as any).getApiClient();
        const allTestSuites: any[] = [];

        // First, check for test cycles (which can contain test suites)
        let testCycles: any[] = [];
        try {
          const cyclesResponse = await apiClient.get(`/api/v3/projects/${project.id}/test-cycles`);
          testCycles = cyclesResponse.data || [];
          if (testCycles.length > 0) {
            console.log(`   Found ${testCycles.length} test cycles`);
          }
        } catch (error: any) {
          // No test cycles found, that's ok
        }

        // Get test suites from each test cycle
        for (const cycle of testCycles) {
          console.log(`   📂 Checking test cycle: ${cycle.name} (ID: ${cycle.id})`);
          
          try {
            const suitesResponse = await apiClient.get(
              `/api/v3/projects/${project.id}/test-suites`,
              { params: { parentId: cycle.id, parentType: 'test-cycle' } }
            );
            
            const cycleSuites = suitesResponse.data || [];
            if (cycleSuites.length > 0) {
              console.log(`      Found ${cycleSuites.length} test suites in cycle`);
              // Tag suites with their cycle name for better naming
              cycleSuites.forEach((suite: any) => {
                suite._cycleName = cycle.name;
              });
              allTestSuites.push(...cycleSuites);
            }
          } catch (error: any) {
            console.log(`      Error getting test suites from cycle: ${error.message}`);
          }
        }

        // Also get test suites at project level (not in cycles)
        const projectLevelSuites = await client.getTestSuites(project.id);
        if (projectLevelSuites.length > 0) {
          console.log(`   Found ${projectLevelSuites.length} test suites at project level`);
          allTestSuites.push(...projectLevelSuites);
        }

        const testSuites = allTestSuites;
        console.log(`   📊 Total test suites to process: ${testSuites.length}`);

        // Process each test suite
        for (const testSuite of testSuites) {
          console.log(`   📋 Processing test suite: ${testSuite.name}`);

          try {
            // Get test runs for this test suite
            const testRuns = await client.getTestRuns(project.id, testSuite.id);
            
            if (testRuns.length === 0) {
              console.log(`      No test runs found`);
              continue;
            }

            console.log(`      Found ${testRuns.length} test runs`);

            // Collect all test logs with their test case info
            const testLogsWithInfo: Array<{
              log: QTestTestLog;
              testCase: any;
              userEmail: string;
            }> = [];

            // Process each test run
            for (const testRun of testRuns) {
              try {
                const testLogs = await client.getTestLogsForRun(project.id, testRun.id);
                
                for (const testLog of testLogs) {
                  // Filter by date (use exe_end_date like the original report tool)
                  if (testLog.exe_end_date) {
                    const logDate = new Date(testLog.exe_end_date);
                    if (logDate < startDate || logDate > endDate) {
                      continue;
                    }
                  } else {
                    // Skip test logs without end date
                    continue;
                  }

                  // Get test case details (use test_case.id like the original reporting tool)
                  const testCaseId = testLog.test_case?.id || testLog.test_case_version_id;
                  if (testCaseId) {
                    const userId = testLog.user_id;
                    const userEmail = userId ? userIdToEmailMap.get(userId) || 'unknown@unknown.com' : 'unknown@unknown.com';
                    
                    try {
                      const testCase = await client.getTestCase(project.id, testCaseId);
                      testLogsWithInfo.push({
                        log: testLog,
                        testCase,
                        userEmail,
                      });
                    } catch (error) {
                      // Use fallback test case info (use testRun.name)
                      const fallbackTestCase = {
                        id: testCaseId,
                        name: testRun.name || `Test Case ${testCaseId}`,
                        external_id: testCaseId.toString(),
                      };
                      testLogsWithInfo.push({
                        log: testLog,
                        testCase: fallbackTestCase,
                        userEmail,
                      });
                    }
                  }
                }
              } catch (error) {
                console.log(`      ⚠️  Error fetching test logs for run ${testRun.id}`);
              }
            }

            if (testLogsWithInfo.length > 0) {
              console.log(`      ✅ Found ${testLogsWithInfo.length} test logs in date range`);
              totalTestLogs += testLogsWithInfo.length;

              // Determine test suite name (include cycle name if available)
              const testSuiteName = (testSuite as any)._cycleName 
                ? `${(testSuite as any)._cycleName} / ${testSuite.name}`
                : testSuite.name;

              // Generate events (async now due to clock sync)
              const output = await eventGenerator.generateEvents(
                testLogsWithInfo,
                project.name,
                testSuiteName,
                apiClient
              );

              allOutputs.push(output);

              // Write to file
              const filePath = await fileManager.writeTestStageOutput(output);
              console.log(`      💾 Wrote events to: ${filePath}`);
            } else {
              console.log(`      No test logs in date range`);
            }
          } catch (error) {
            console.log(`   ⚠️  Error processing test suite ${testSuite.name}: ${error}`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Error processing project ${project.name}: ${error}`);
      }
    }

    // Write summary
    console.log('\n========================================');
    console.log('📊 Extraction Summary');
    console.log('========================================');
    console.log(`Total test logs extracted: ${totalTestLogs}`);
    console.log(`Total test stages: ${allOutputs.length}`);
    console.log(`Total events generated: ${allOutputs.reduce((sum, o) => sum + o.events.length, 0)}`);

    if (allOutputs.length > 0) {
      const summaryPath = await fileManager.writeSummary(allOutputs);
      console.log(`\n💾 Summary written to: ${summaryPath}`);
      console.log(`📁 All files saved to: ${fileManager.getOutputDir()}/`);
    } else {
      console.log('\n⚠️  No test data found in the specified date range');
    }

    console.log('\n✅ Extraction complete!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();

