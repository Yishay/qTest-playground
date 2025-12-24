import { QTestClient } from './qtest-client';
import { loadConfig } from './config';
import { QTestTestLog, QTestUser, QTestProject } from './types';
import * as fs from 'fs';
import * as path from 'path';

interface TestExecution {
  testName: string;
  testCaseId: number;
  executionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  user: string;
  userEmail: string;
  projectName: string;
}

interface DailyUserReport {
  date: string;
  user: string;
  userEmail: string;
  tests: {
    testName: string;
    testCaseId: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    status: string;
    projectName: string;
  }[];
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date to ISO string for qTest API
 */
function formatDateForAPI(date: Date): string {
  return date.toISOString();
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
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let days = 7; // Default to last 7 days
  let showAll = false;
  let projectId: number | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && i + 1 < args.length) {
      days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--all') {
      showAll = true;
    } else if (args[i] === '--project' && i + 1 < args.length) {
      projectId = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: npm run report [options]

Options:
  --days <N>       Number of days to look back (default: 7)
  --all            Show all test executions regardless of date
  --project <ID>   Only query specific project by ID
  --help, -h       Show this help message

Examples:
  npm run report                    # Last 7 days
  npm run report -- --days 30       # Last 30 days
  npm run report -- --all           # All test executions
  npm run report -- --project 1636  # Only project 1636
      `);
      process.exit(0);
    }
  }
  
  return { days, showAll, projectId };
}

/**
 * Extract user ID from test log
 */
function extractUserId(testLog: QTestTestLog): number | null {
  // Try user_id field first
  if (testLog.user_id) {
    return testLog.user_id;
  }
  
  // Try to get from properties (Tester field)
  if (testLog.properties) {
    const testerProp = testLog.properties.find(
      (p) => p.field_name.toLowerCase() === 'tester' || p.field_name.toLowerCase() === 'assigned to'
    );
    if (testerProp && testerProp.field_value) {
      const userId = Number(testerProp.field_value);
      if (!isNaN(userId)) {
        return userId;
      }
    }
  }
  
  return null;
}

/**
 * Generate test execution report
 */
async function generateReport() {
  const options = parseArgs();
  
  console.log('Loading configuration...');
  const config = loadConfig();
  
  console.log('Initializing qTest client...');
  const client = new QTestClient(config);
  
  console.log('Fetching projects...');
  let projects = await client.getProjects();
  console.log(`Found ${projects.length} projects`);
  
  // Filter by project ID if specified
  if (options.projectId) {
    projects = projects.filter((p) => p.id === options.projectId);
    if (projects.length === 0) {
      console.log(`Error: Project ${options.projectId} not found`);
      return;
    }
    console.log(`Filtering to project: ${projects[0].name} (ID: ${options.projectId})`);
  }
  
  console.log('Fetching users...');
  let users: QTestUser[] = [];
  try {
    users = await client.getUsers();
    console.log(`Found ${users.length} users`);
  } catch (error) {
    console.log('Unable to fetch users list, will use emails from test logs');
  }
  
  // Create user ID to user info maps
  const userIdToEmailMap = new Map<number, string>();
  const userIdToNameMap = new Map<number, string>();
  users.forEach((user) => {
    const displayName = user.display_name || `${user.first_name} ${user.last_name}`.trim() || user.username;
    const email = user.email || user.username || `user_${user.id}`;
    userIdToEmailMap.set(user.id, email);
    userIdToNameMap.set(user.id, displayName);
  });
  
  const startDate = options.showAll ? new Date(0) : getDaysAgo(options.days);
  const endDate = getTodayDate();
  
  if (options.showAll) {
    console.log(`\nQuerying ALL test logs (no date filter)...\n`);
  } else {
    console.log(`\nQuerying test logs from ${formatDate(startDate)} to ${formatDate(endDate)} (${options.days} days)...\n`);
  }
  
  const allExecutions: TestExecution[] = [];
  
  // Query each project
    for (const project of projects) {
    console.log(`Processing project: ${project.name} (ID: ${project.id})`);
    
    try {
      const apiClient = client.getApiClient();
      let totalTestRuns = 0;
      let totalTestLogs = 0;
      
      // First, check for test cycles (which can contain test suites)
      let testCycles: any[] = [];
      try {
        const cyclesResponse = await apiClient.get(`/api/v3/projects/${project.id}/test-cycles`);
        testCycles = cyclesResponse.data || [];
        if (testCycles.length > 0) {
          console.log(`  Found ${testCycles.length} test cycles`);
        }
      } catch (error: any) {
        console.log(`  No test cycles found`);
      }
      
      // Get test suites from each test cycle
      for (const cycle of testCycles) {
        console.log(`  Checking test cycle: ${cycle.name} (ID: ${cycle.id})`);
        
        try {
          const suitesResponse = await apiClient.get(
            `/api/v3/projects/${project.id}/test-suites`,
            { params: { parentId: cycle.id, parentType: 'test-cycle' } }
          );
          
          const testSuites = suitesResponse.data || [];
          console.log(`    Found ${testSuites.length} test suites in cycle`);
          
          // Process each test suite
          for (const testSuite of testSuites) {
            console.log(`    Checking test suite: ${testSuite.name} (ID: ${testSuite.id})`);
            
            try {
              const runsResponse = await apiClient.get(
                `/api/v3/projects/${project.id}/test-runs`,
                { params: { parentId: testSuite.id, parentType: 'test-suite', pageSize: 100 } }
              );
              
              const testRuns = runsResponse.data?.items || [];
              totalTestRuns += testRuns.length;
              console.log(`      Found ${testRuns.length} test runs`);
              
              // Process each test run
              for (const testRun of testRuns) {
                try {
                  const testLogs = await client.getTestLogsForRun(project.id, testRun.id);
                  totalTestLogs += testLogs.length;
                  
                  for (const testLog of testLogs) {
                    const executionDateTime = new Date(testLog.exe_end_date);
                    if (executionDateTime >= startDate && executionDateTime <= endDate) {
                      // Extract user information
                      const userId = extractUserId(testLog);
                      let userEmail = 'Unknown';
                      let userName = 'Unknown';
                      
                      if (userId) {
                        userEmail = userIdToEmailMap.get(userId) || `user_${userId}`;
                        userName = userIdToNameMap.get(userId) || userEmail;
                      } else if (testLog.submitted_by) {
                        // Fallback: if submitted_by is an email
                        userEmail = testLog.submitted_by;
                        userName = testLog.submitted_by;
                      }
                      
                      let testName = testRun.name || 'Unknown Test';
                      let testCaseId = testRun.test_case_id || testRun.testCaseId || 0;
                      
                      if (testLog.test_case?.id) {
                        testCaseId = testLog.test_case.id;
                        try {
                          const testCase = await client.getTestCase(project.id, testLog.test_case.id);
                          testName = testCase.name || testName;
                        } catch (error) {
                          testName = testRun.name || `Test Case ${testLog.test_case.id}`;
                        }
                      }
                      
                      // Calculate duration in minutes
                      const startDateTime = new Date(testLog.exe_start_date);
                      const endDateTime = new Date(testLog.exe_end_date);
                      const durationMs = endDateTime.getTime() - startDateTime.getTime();
                      const durationMinutes = Math.round(durationMs / 60000 * 100) / 100; // Round to 2 decimal places
                      
                      allExecutions.push({
                        testName: testName,
                        testCaseId: testCaseId,
                        executionDate: formatDate(executionDateTime),
                        startTime: testLog.exe_start_date,
                        endTime: testLog.exe_end_date,
                        durationMinutes: durationMinutes,
                        status: testLog.status.name,
                        user: userName,
                        userEmail: userEmail,
                        projectName: project.name,
                      });
                    }
                  }
                } catch (error: any) {
                  if (error.response?.status !== 404) {
                    console.log(`        Warning: Could not fetch test logs for test run ${testRun.id}: ${error.message}`);
                  }
                }
              }
            } catch (error: any) {
              console.log(`      Error querying test runs: ${error.message}`);
            }
          }
        } catch (error: any) {
          console.log(`    Error querying test suites: ${error.message}`);
        }
      }
      
      // Also check for test suites at project level (not in cycles)
      try {
        const projectTestSuites = await client.getTestSuites(project.id);
        if (projectTestSuites.length > 0) {
          console.log(`  Found ${projectTestSuites.length} test suites at project level`);
          
          for (const testSuite of projectTestSuites) {
            console.log(`    Checking test suite: ${testSuite.name} (ID: ${testSuite.id})`);
            
            try {
              const runsResponse = await apiClient.get(
                `/api/v3/projects/${project.id}/test-runs`,
                { params: { parentId: testSuite.id, parentType: 'test-suite', pageSize: 100 } }
              );
              
              const testRuns = runsResponse.data?.items || [];
              totalTestRuns += testRuns.length;
              console.log(`      Found ${testRuns.length} test runs`);
              
              for (const testRun of testRuns) {
                try {
                  const testLogs = await client.getTestLogsForRun(project.id, testRun.id);
                  totalTestLogs += testLogs.length;
                  
                  for (const testLog of testLogs) {
                    const executionDateTime = new Date(testLog.exe_end_date);
                    if (executionDateTime >= startDate && executionDateTime <= endDate) {
                      // Extract user information
                      const userId = extractUserId(testLog);
                      let userEmail = 'Unknown';
                      let userName = 'Unknown';
                      
                      if (userId) {
                        userEmail = userIdToEmailMap.get(userId) || `user_${userId}`;
                        userName = userIdToNameMap.get(userId) || userEmail;
                      } else if (testLog.submitted_by) {
                        // Fallback: if submitted_by is an email
                        userEmail = testLog.submitted_by;
                        userName = testLog.submitted_by;
                      }
                      
                      let testName = testRun.name || 'Unknown Test';
                      let testCaseId = testRun.test_case_id || testRun.testCaseId || 0;
                      
                      if (testLog.test_case?.id) {
                        testCaseId = testLog.test_case.id;
                        try {
                          const testCase = await client.getTestCase(project.id, testLog.test_case.id);
                          testName = testCase.name || testName;
                        } catch (error) {
                          testName = testRun.name || `Test Case ${testLog.test_case.id}`;
                        }
                      }
                      
                      // Calculate duration in minutes
                      const startDateTime = new Date(testLog.exe_start_date);
                      const endDateTime = new Date(testLog.exe_end_date);
                      const durationMs = endDateTime.getTime() - startDateTime.getTime();
                      const durationMinutes = Math.round(durationMs / 60000 * 100) / 100; // Round to 2 decimal places
                      
                      allExecutions.push({
                        testName: testName,
                        testCaseId: testCaseId,
                        executionDate: formatDate(executionDateTime),
                        startTime: testLog.exe_start_date,
                        endTime: testLog.exe_end_date,
                        durationMinutes: durationMinutes,
                        status: testLog.status.name,
                        user: userName,
                        userEmail: userEmail,
                        projectName: project.name,
                      });
                    }
                  }
                } catch (error: any) {
                  if (error.response?.status !== 404) {
                    console.log(`        Warning: Could not fetch test logs for test run ${testRun.id}: ${error.message}`);
                  }
                }
              }
            } catch (error: any) {
              console.log(`      Error querying test runs: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        console.log(`  Error getting project-level test suites: ${error.message}`);
      }
      
      console.log(`  Total: ${totalTestRuns} test runs, ${totalTestLogs} test logs`);
      
      if (totalTestRuns === 0) {
        console.log(`  No test runs found in this project`);
      }
    } catch (error: any) {
      console.log(`  Error querying project ${project.name}: ${error.message}`);
    }
  }
  
  console.log(`\nTotal test executions found: ${allExecutions.length}\n`);
  
  if (allExecutions.length === 0) {
    if (options.showAll) {
      console.log('No test executions found in the selected projects.');
    } else {
      console.log(`No test executions found in the last ${options.days} days.`);
      console.log(`Try running with a longer time period (e.g., --days 90) or --all to see all test executions.`);
    }
    return;
  }
  
  // Group by date and user
  const groupedByDateUser = new Map<string, DailyUserReport>();
  
  for (const execution of allExecutions) {
    const key = `${execution.executionDate}|${execution.userEmail}`;
    
    if (!groupedByDateUser.has(key)) {
      groupedByDateUser.set(key, {
        date: execution.executionDate,
        user: execution.user,
          userEmail: execution.userEmail,
          tests: [],
      });
    }
    
    const report = groupedByDateUser.get(key)!;
    report.tests.push({
      testName: execution.testName,
      testCaseId: execution.testCaseId,
      startTime: execution.startTime,
      endTime: execution.endTime,
      durationMinutes: execution.durationMinutes,
      status: execution.status,
      projectName: execution.projectName,
    });
  }
  
  // Sort reports by date (newest first) and user
  const sortedReports = Array.from(groupedByDateUser.values()).sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
      return a.user.localeCompare(b.user);
    });

  // Generate console report
  console.log('=' .repeat(100));
  console.log('TEST EXECUTION REPORT BY USER BY DAY');
  if (options.showAll) {
    console.log(`Period: ALL TIME (up to ${formatDate(endDate)})`);
  } else {
    console.log(`Period: ${formatDate(startDate)} to ${formatDate(endDate)} (${options.days} days)`);
  }
  console.log('=' .repeat(100));
  console.log();

    let currentDate = '';
  for (const report of sortedReports) {
    if (report.date !== currentDate) {
      if (currentDate !== '') console.log();
      currentDate = report.date;
      console.log(`\n${'='.repeat(100)}`);
      console.log(`DATE: ${report.date}`);
      console.log('='.repeat(100));
    }
    
    console.log(`\n  User: ${report.user} (${report.userEmail})`);
    console.log(`  Total Tests: ${report.tests.length}`);
    console.log('  ' + '-'.repeat(96));
    
    // Group tests by project
    const testsByProject = new Map<string, typeof report.tests>();
    for (const test of report.tests) {
      if (!testsByProject.has(test.projectName)) {
        testsByProject.set(test.projectName, []);
      }
      testsByProject.get(test.projectName)!.push(test);
    }
    
    for (const [projectName, tests] of testsByProject) {
      console.log(`\n    Project: ${projectName} (${tests.length} tests)`);
      for (const test of tests) {
        const startTime = new Date(test.startTime).toLocaleTimeString();
        const endTime = new Date(test.endTime).toLocaleTimeString();
        console.log(`      - [${test.status}] ${test.testName} (ID: ${test.testCaseId})`);
        console.log(`        Start: ${startTime} | End: ${endTime} | Duration: ${test.durationMinutes} min`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(100));
  console.log();
  
  // Generate JSON report
  const jsonReport = {
    reportGenerated: new Date().toISOString(),
    options: {
      days: options.days,
      showAll: options.showAll,
      projectId: options.projectId,
    },
    period: {
      start: options.showAll ? 'ALL TIME' : formatDate(startDate),
      end: formatDate(endDate),
    },
      summary: {
      totalExecutions: allExecutions.length,
      uniqueUsers: new Set(allExecutions.map((e) => e.userEmail)).size,
      uniqueTests: new Set(allExecutions.map((e) => e.testCaseId)).size,
      projects: Array.from(new Set(allExecutions.map((e) => e.projectName))),
    },
    executionsByDateAndUser: sortedReports,
    allExecutions: allExecutions,
  };
  
  // Save JSON report
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const jsonFilePath = path.join(outputDir, `test-execution-report-${formatDate(new Date())}.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonReport, null, 2));
  console.log(`JSON report saved to: ${jsonFilePath}`);
  
  // Generate CSV report
  const csvLines = [
    'Date,User,User Email,Project,Test Name,Test Case ID,Duration (minutes),Status',
  ];
  
  for (const execution of allExecutions.sort((a, b) => b.executionDate.localeCompare(a.executionDate))) {
    csvLines.push(
      `"${execution.executionDate}","${execution.user}","${execution.userEmail}","${execution.projectName}","${execution.testName}",${execution.testCaseId},${execution.durationMinutes},"${execution.status}"`
    );
  }
  
  const csvFilePath = path.join(outputDir, `test-execution-report-${formatDate(new Date())}.csv`);
  fs.writeFileSync(csvFilePath, csvLines.join('\n'));
  console.log(`CSV report saved to: ${csvFilePath}`);
  
  // Summary
  console.log('\nSUMMARY:');
  console.log(`  Total Executions: ${jsonReport.summary.totalExecutions}`);
  console.log(`  Unique Users: ${jsonReport.summary.uniqueUsers}`);
  console.log(`  Unique Tests: ${jsonReport.summary.uniqueTests}`);
  console.log(`  Projects: ${jsonReport.summary.projects.join(', ')}`);
  console.log();
}

// Run the report
if (require.main === module) {
  generateReport()
    .then(() => {
      console.log('Report generation completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error generating report:', error);
      process.exit(1);
    });
}

export { generateReport };
