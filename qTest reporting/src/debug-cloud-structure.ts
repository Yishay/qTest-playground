import { QTestClient } from './qtest-client';
import { loadConfig } from './config';

async function debugCloudStructure() {
  console.log('🔍 Debugging qTest Cloud Structure\n');
  
  const config = loadConfig();
  console.log(`Connecting to: ${config.qTestUrl}\n`);
  
  const client = new QTestClient(config);
  const apiClient = client.getApiClient();
  
  // Get projects
  console.log('📁 Fetching projects...');
  const projects = await client.getProjects();
  console.log(`Found ${projects.length} projects:\n`);
  
  for (const project of projects) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Project: ${project.name} (ID: ${project.id})`);
    console.log('='.repeat(80));
    
    // Check test cycles
    try {
      const cyclesResponse = await apiClient.get(`/api/v3/projects/${project.id}/test-cycles`);
      const testCycles = cyclesResponse.data || [];
      console.log(`\n📊 Test Cycles: ${testCycles.length}`);
      
      if (testCycles.length > 0) {
        for (const cycle of testCycles.slice(0, 5)) {
          console.log(`   - ${cycle.name} (ID: ${cycle.id})`);
        }
        if (testCycles.length > 5) {
          console.log(`   ... and ${testCycles.length - 5} more`);
        }
      }
    } catch (error: any) {
      console.log(`\n⚠️  Test Cycles: Error - ${error.message}`);
    }
    
    // Check test suites
    try {
      const testSuites = await client.getTestSuites(project.id);
      console.log(`\n📦 Test Suites: ${testSuites.length}`);
      
      if (testSuites.length > 0) {
        for (const suite of testSuites.slice(0, 5)) {
          console.log(`   - ${suite.name} (ID: ${suite.id})`);
          
          // Check test runs in this suite
          try {
            const runsResponse = await apiClient.get(
              `/api/v3/projects/${project.id}/test-runs`,
              { params: { parentId: suite.id, parentType: 'test-suite', pageSize: 10 } }
            );
            const testRuns = runsResponse.data?.items || [];
            console.log(`     → Test Runs: ${testRuns.length}`);
            
            if (testRuns.length > 0) {
              for (const run of testRuns.slice(0, 3)) {
                console.log(`       • ${run.name} (ID: ${run.id})`);
                
                // Check test logs
                try {
                  const testLogs = await client.getTestLogsForRun(project.id, run.id);
                  console.log(`         → Test Logs: ${testLogs.length}`);
                  
                  if (testLogs.length > 0) {
                    const log = testLogs[0];
                    console.log(`         → Sample log date: ${log.exe_end_date || log.exe_start_date || 'N/A'}`);
                  }
                } catch (error: any) {
                  console.log(`         → Test Logs: Error - ${error.message}`);
                }
              }
            }
          } catch (error: any) {
            console.log(`     → Test Runs: Error - ${error.message}`);
          }
        }
        if (testSuites.length > 5) {
          console.log(`   ... and ${testSuites.length - 5} more`);
        }
      }
    } catch (error: any) {
      console.log(`\n⚠️  Test Suites: Error - ${error.message}`);
    }
    
    // Check test cases
    try {
      const casesResponse = await apiClient.get(`/api/v3/projects/${project.id}/test-cases`, {
        params: { pageSize: 10 }
      });
      const testCases = casesResponse.data?.items || casesResponse.data || [];
      console.log(`\n📝 Test Cases: ${Array.isArray(testCases) ? testCases.length : 'Unknown'}`);
      
      if (Array.isArray(testCases) && testCases.length > 0) {
        for (const testCase of testCases.slice(0, 3)) {
          console.log(`   - ${testCase.name} (ID: ${testCase.id})`);
        }
      }
    } catch (error: any) {
      console.log(`\n⚠️  Test Cases: Error - ${error.message}`);
    }
    
    // Try direct test logs query
    try {
      console.log(`\n🔍 Trying direct test logs query...`);
      const logsResponse = await apiClient.get(`/api/v3/projects/${project.id}/test-logs`, {
        params: { pageSize: 10 }
      });
      const testLogs = logsResponse.data?.items || logsResponse.data || [];
      console.log(`   Direct test logs found: ${Array.isArray(testLogs) ? testLogs.length : 'Unknown'}`);
      
      if (Array.isArray(testLogs) && testLogs.length > 0) {
        const log = testLogs[0];
        console.log(`   Sample log:`);
        console.log(`     - ID: ${log.id}`);
        console.log(`     - Status: ${log.status?.name || 'Unknown'}`);
        console.log(`     - Date: ${log.exe_end_date || log.exe_start_date || 'N/A'}`);
      }
    } catch (error: any) {
      console.log(`   Direct test logs: Error - ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('Debug complete');
  console.log(`${'='.repeat(80)}\n`);
}

if (require.main === module) {
  debugCloudStructure()
    .then(() => {
      console.log('✅ Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

export { debugCloudStructure };

