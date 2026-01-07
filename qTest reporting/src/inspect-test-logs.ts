#!/usr/bin/env node

import { loadConfig } from './config';
import { QTestClient } from './qtest-client';

async function inspectTestLogs() {
  console.log('🔍 Test Log Field Inspector\n');
  console.log('This tool fetches sample test logs and shows their structure\n');
  
  try {
    const config = loadConfig();
    const client = new QTestClient(config);
    
    console.log(`📡 Connected to: ${config.qTestUrl}`);
    console.log('Fetching projects...\n');
    
    const projects = await client.getProjects();
    console.log(`Found ${projects.length} projects\n`);
    
    let samplesFound = 0;
    const maxSamples = 3;
    
    // Try to find test logs
    for (const project of projects) {
      if (samplesFound >= maxSamples) break;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`PROJECT: ${project.name} (ID: ${project.id})`);
      console.log('='.repeat(80));
      
      try {
        // Get test suites
        const testSuites = await client.getTestSuites(project.id);
        console.log(`  Found ${testSuites.length} test suites`);
        
        for (const suite of testSuites.slice(0, 3)) {
          if (samplesFound >= maxSamples) break;
          
          console.log(`\n  📂 Test Suite: ${suite.name} (ID: ${suite.id})`);
          
          try {
            // Get test runs in this suite
            const response = await (client as any).client.get(
              `/api/v3/projects/${project.id}/test-runs?parentId=${suite.id}&parentType=test-suite&pageSize=10`
            );
            
            const testRuns = response.data?.items || response.data || [];
            console.log(`     Found ${testRuns.length} test runs`);
            
            for (const run of testRuns.slice(0, 2)) {
              if (samplesFound >= maxSamples) break;
              
              console.log(`\n     🧪 Test Run: ${run.name} (ID: ${run.id})`);
              
              try {
                const testLogs = await client.getTestLogsForRun(project.id, run.id);
                
                if (testLogs.length > 0) {
                  const log = testLogs[0];
                  samplesFound++;
                  
                  console.log(`\n     ╔${'═'.repeat(78)}╗`);
                  console.log(`     ║ TEST LOG SAMPLE #${samplesFound}`.padEnd(79) + '║');
                  console.log(`     ╚${'═'.repeat(78)}╝\n`);
                  
                  console.log(`     📋 Basic Info:`);
                  console.log(`        ID: ${log.id}`);
                  console.log(`        Status: ${log.status?.name || 'Unknown'}`);
                  
                  console.log(`\n     📅 Date/Time Fields:`);
                  console.log(`        exe_start_date: ${JSON.stringify(log.exe_start_date)}`);
                  console.log(`        exe_end_date: ${JSON.stringify(log.exe_end_date)}`);
                  
                  // Check if dates are valid
                  if (log.exe_start_date) {
                    const startParsed = new Date(log.exe_start_date);
                    console.log(`          → Parsed: ${startParsed}`);
                    console.log(`          → Valid: ${!isNaN(startParsed.getTime())}`);
                  }
                  
                  if (log.exe_end_date) {
                    const endParsed = new Date(log.exe_end_date);
                    console.log(`          → Parsed: ${endParsed}`);
                    console.log(`          → Valid: ${!isNaN(endParsed.getTime())}`);
                  } else {
                    console.log(`          ⚠️  exe_end_date is NULL/undefined!`);
                  }
                  
                  console.log(`\n     👤 User Fields:`);
                  console.log(`        submitted_by: ${(log as any).submitted_by || 'N/A'}`);
                  
                  console.log(`\n     📦 ALL Available Fields:`);
                  const allFields = Object.keys(log).sort();
                  allFields.forEach(field => {
                    const value = (log as any)[field];
                    const type = typeof value;
                    const preview = type === 'object' 
                      ? (Array.isArray(value) ? `Array(${value.length})` : 'Object')
                      : JSON.stringify(value);
                    console.log(`        - ${field}: ${preview}`);
                  });
                  
                  console.log(`\n     📄 Full JSON:`);
                  console.log(JSON.stringify(log, null, 2).split('\n').map(line => `        ${line}`).join('\n'));
                  console.log();
                }
              } catch (err: any) {
                // Skip if no test logs
              }
            }
          } catch (err: any) {
            console.log(`     Warning: Could not fetch test runs: ${err.message}`);
          }
        }
      } catch (err: any) {
        console.log(`  Warning: Could not fetch test suites: ${err.message}`);
      }
    }
    
    if (samplesFound === 0) {
      console.log('\n⚠️  No test logs found in any project.');
      console.log('This might mean:');
      console.log('  1. No test executions have been recorded');
      console.log('  2. API permissions issue');
      console.log('  3. Different API structure');
    } else {
      console.log(`\n✅ Successfully inspected ${samplesFound} test log sample(s)`);
      console.log('\n📊 KEY FINDINGS:');
      console.log('   Check the date fields above to understand what fields are available');
      console.log('   and whether exe_end_date is always populated.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

inspectTestLogs();

