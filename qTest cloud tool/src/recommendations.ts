#!/usr/bin/env node

import { loadConfig } from './config';
import { QTestClient } from './qtest-client';
import { CLIPrompter } from './cli-prompter';
import { HierarchyNavigator } from './hierarchy-navigator';
import { SeaLightsClient } from './sealights-client';
import { RecommendationsApplier } from './recommendations-applier';
import { StatusValidator } from './status-validator';
import { NavigationNode, QTestTestRun, RecommendationResult } from './types';

/**
 * Main recommendations wizard
 */
async function main() {
  const prompter = new CLIPrompter();

  try {
    prompter.displayHeader('SeaLights Test Recommendations Wizard');
    console.log('This wizard will help you apply SeaLights test recommendations to your qTest project.\n');

    // Load configuration
    console.log('📋 Loading configuration...');
    const config = loadConfig();

    // Initialize clients
    console.log('🔐 Initializing qTest client...');
    const qTestClient = new QTestClient(config);
    const navigator = new HierarchyNavigator(qTestClient);
    const applier = new RecommendationsApplier(qTestClient);
    const validator = new StatusValidator(applier, prompter);
    const slClient = new SeaLightsClient(config.recommendations?.enableMockMode ?? true);

    // Step 1: Select Project
    prompter.displaySection('Step 1: Select Project');
    const projects = await navigator.getProjects();
    
    if (projects.length === 0) {
      prompter.error('No projects found. Please check your qTest access.');
      process.exit(1);
    }

    const selectedProject = await prompter.selectFromList(
      '📦 Select a Project:',
      projects,
      (project, index) => `${index}. ${project.name}`
    );

    console.log(`\n✅ Selected: ${selectedProject.name}`);
    
    // Store project ID for later use
    const projectId = selectedProject.id;

    // Step 2: Navigate hierarchy to find test location
    prompter.displaySection('Step 2: Navigate to Test Location');
    const targetNode = await navigateToTests(navigator, selectedProject, prompter);
    
    if (!targetNode) {
      prompter.error('No test location selected.');
      process.exit(1);
    }

    const pathStr = navigator.formatPath(targetNode);
    console.log(`\n✅ Selected location: ${pathStr}`);

    // Step 3: Validate status exists
    prompter.displaySection('Step 3: Validate Status Configuration');
    const { status: skipStatus, statusName } = await validator.validateAndGetStatus(
      projectId,
      config
    );

    // Step 4: Select test stage
    prompter.displaySection('Step 4: Select Test Stage');
    const testStage = await selectTestStage(pathStr, config, prompter);
    console.log(`\n✅ Selected test stage: ${testStage}`);

    // Step 5: Select user
    prompter.displaySection('Step 5: Select User');
    const { userEmail, labId } = await selectUser(config, prompter);
    console.log(`\n✅ Selected user: ${userEmail}`);
    if (labId) {
      console.log(`   Lab ID: ${labId}`);
    }

    // Step 6: Get test runs
    prompter.displaySection('Step 6: Fetching Test Runs');
    console.log('📋 Loading test runs from selected location...');
    const testRuns = await navigator.getTestRuns(targetNode);
    
    if (testRuns.length === 0) {
      prompter.error('No test runs found in selected location.');
      process.exit(1);
    }

    console.log(`✅ Found ${testRuns.length} test runs`);

    // Prepare test runs data for SeaLights
    const testRunsData = testRuns.map((tr) => ({
      testRunId: tr.id,
      testName: tr.name,
    }));

    // Step 7: Fetch recommendations from SeaLights
    prompter.displaySection('Step 7: Fetch Recommendations from SeaLights');
    console.log('\n🔍 Fetching recommendations from SeaLights...');
    console.log('\nRequest details:');
    console.log(`  - Project: ${selectedProject.name}`);
    console.log(`  - Test Stage: ${testStage}`);
    console.log(`  - Lab ID: ${labId || 'N/A'}`);
    console.log(`  - User: ${userEmail}`);
    console.log(`  - Test Runs: ${testRuns.length}`);

    const slResponse = await slClient.getRecommendations({
      projectName: selectedProject.name,
      testStage,
      labId,
      userEmail,
      testRuns: testRunsData,
    });

    console.log('\n✅ Received response from SeaLights');

    // Step 8: Display and apply recommendations
    prompter.displaySection('Step 8: Apply Recommendations');
    
    console.log('\n📋 SeaLights Recommendations:\n');
    console.log(`SeaLights Status: ${slResponse.metadata.status}`);
    console.log(`Test Selection Enabled: ${slResponse.metadata.testSelectionEnabled ? 'Yes' : 'No'}`);
    console.log(`Full Run Required: ${slResponse.metadata.isFullRun ? 'Yes' : 'No'}`);
    
    if (slResponse.metadata.isFullRun) {
      console.log(`Full Run Reason: ${slResponse.metadata.fullRunReason || 'N/A'}`);
      console.log('\n⚠️  Full run is recommended. No tests will be skipped.');
      prompter.close();
      return;
    }

    if (slResponse.metadata.status !== 'ready') {
      console.log(`\n⚠️  SeaLights recommendations are not ready (status: ${slResponse.metadata.status})`);
      console.log('Cannot proceed with recommendations at this time.');
      prompter.close();
      return;
    }

    // Match test runs with excluded tests
    const testsToSkip = slClient.matchTestRuns(testRunsData, slResponse);

    if (testsToSkip.length === 0) {
      console.log('\n✅ No tests recommended for skipping. All tests should run.');
      prompter.close();
      return;
    }

    console.log(`\nThe following ${testsToSkip.length} test(s) can be skipped:\n`);
    testsToSkip.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.testName} (Run ID: ${test.testRunId})`);
    });

    // Apply recommendations
    console.log(`\n✅ Applying recommendations to qTest using status "${statusName}"...\n`);
    const applyResults = await applier.applySkipStatus(
      projectId,
      testsToSkip,
      skipStatus.id
    );

    // Display results
    let successCount = 0;
    let failCount = 0;

    for (const result of applyResults) {
      if (result.applied) {
        console.log(`  ✅ Updated ${result.testName} (ID: ${result.testRunId})`);
        successCount++;
      } else {
        console.log(`  ❌ Failed to update ${result.testName} (ID: ${result.testRunId}): ${result.error}`);
        failCount++;
      }
    }

    // Step 9: Save results and display summary
    prompter.displaySection('Summary');
    
    console.log(`\n✅ Successfully updated ${successCount} test run(s) with "${statusName}" status`);
    if (failCount > 0) {
      console.log(`❌ Failed to update ${failCount} test run(s)`);
    }

    console.log('\n📊 Summary:');
    console.log(`  - Total recommendations: ${testsToSkip.length}`);
    console.log(`  - Successfully applied: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);

    // Prepare results for saving
    const results: RecommendationResult = {
      timestamp: new Date().toISOString(),
      project: selectedProject.name,
      projectId: projectId,
      testStage,
      user: userEmail,
      labId,
      path: pathStr,
      skipStatus: statusName,
      sealightsMetadata: slResponse.metadata,
      recommendations: applyResults.map((r) => ({
        testName: r.testName,
        testRunId: r.testRunId,
        applied: r.applied,
        error: r.error,
      })),
      summary: {
        totalRecommendations: testsToSkip.length,
        successfullyApplied: successCount,
        failed: failCount,
      },
    };

    const outputPath = await applier.saveResults(results);
    console.log(`\n💾 Output saved to: ${outputPath}`);

    console.log('\n✅ Recommendations wizard complete!');
    
  } catch (error: any) {
    prompter.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    prompter.close();
  }
}

/**
 * Navigate through hierarchy until reaching a location with tests
 */
async function navigateToTests(
  navigator: HierarchyNavigator,
  startNode: NavigationNode,
  prompter: CLIPrompter
): Promise<NavigationNode | null> {
  let currentNode = startNode;
  
  // Store projectId for all child nodes
  const projectId = startNode.id;

  while (true) {
    const children = await navigator.getChildren(currentNode);
    
    // Tag children with projectId
    children.forEach((child: any) => {
      child.projectId = projectId;
    });

    if (children.length === 0) {
      // No children, check if current node has tests
      if (currentNode.hasTests) {
        return currentNode;
      } else {
        prompter.error('No tests found in this location.');
        return null;
      }
    }

    // Check if current node has tests
    const hasTests = currentNode.type === 'suite' && currentNode.hasTests;
    
    // Build options
    const options: Array<{ type: 'current' | 'child'; node: NavigationNode }> = [];
    
    if (hasTests) {
      // Add "tests in current folder" option
      options.push({ type: 'current', node: currentNode });
    }
    
    // Add children
    children.forEach((child) => {
      options.push({ type: 'child', node: child });
    });

    // Display and select
    const pathStr = navigator.formatPath(currentNode);
    const title = currentNode.type === 'project' 
      ? `📂 Select location in "${currentNode.name}":`
      : `📋 Select location in "${pathStr}":`;

    const selected = await prompter.selectFromList(
      title,
      options,
      (option, index) => {
        if (option.type === 'current') {
          return `${index}. ✓ Tests in current folder (${pathStr}) - ${option.node.testRunCount} test run(s)`;
        } else {
          const prefix = option.node.hasTests ? '📁' : '📂';
          const suffix = option.node.hasTests ? ` - ${option.node.testRunCount} test run(s)` : '';
          return `${index}. ${prefix} ${option.node.name}${suffix}`;
        }
      }
    );

    if (selected.type === 'current') {
      return selected.node;
    } else {
      currentNode = selected.node;
    }
  }
}

/**
 * Select test stage (use mapping or original name)
 * Auto-uses mapping if it matches the current path
 */
async function selectTestStage(
  pathStr: string,
  config: any,
  prompter: CLIPrompter
): Promise<string> {
  const mappings = config.testStageMapping || {};
  const mappedStages = Object.entries(mappings);

  // Extract project name (first part) and suite name (last part) from path
  const pathParts = pathStr.split(' / ');
  const projectName = pathParts[0];
  const suiteName = pathParts[pathParts.length - 1];
  const simpleKey = `${projectName} / ${suiteName}`;

  // Check for exact match first
  if (mappings[pathStr]) {
    console.log(`\n✅ Using mapped test stage: "${mappings[pathStr]}" (matched: "${pathStr}")`);
    return mappings[pathStr];
  }

  // Check for simplified match (Project / Suite)
  if (mappings[simpleKey]) {
    console.log(`\n✅ Using mapped test stage: "${mappings[simpleKey]}" (matched: "${simpleKey}")`);
    return mappings[simpleKey];
  }

  // No mapping found - offer to create one or use original
  console.log(`\n⚠️  No test stage mapping found for: "${pathStr}"`);
  console.log(`   Suggestion: "${simpleKey}" → (test stage name)`);

  const options: Array<{ type: 'create' | 'original'; value: string; display: string }> = [
    {
      type: 'create',
      value: 'create',
      display: 'Create new mapping and save to config',
    },
    {
      type: 'original',
      value: pathStr,
      display: `Use original path: "${pathStr}"`,
    },
  ];

  const selected = await prompter.selectFromList(
    '🎯 Select option:',
    options,
    (option, index) => `${index}. ${option.display}`
  );

  if (selected.type === 'create') {
    // Ask for the test stage name
    const testStageName = await prompter.ask(`\nEnter test stage name (or press Enter to use "${suiteName}"): `);
    const stageName = testStageName.trim() || suiteName;

    // Save to config
    await saveTestStageMapping(simpleKey, stageName);
    
    console.log(`\n✅ Saved mapping: "${simpleKey}" → "${stageName}"`);
    return stageName;
  }

  return selected.value;
}

/**
 * Save test stage mapping to config.json
 */
async function saveTestStageMapping(key: string, value: string): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (!config.testStageMapping) {
      config.testStageMapping = {};
    }

    config.testStageMapping[key] = value;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('⚠️  Failed to update config.json:', error);
    console.log('   Please manually add:');
    console.log(`   "testStageMapping": { "${key}": "${value}" }`);
  }
}

/**
 * Select user for recommendations
 */
async function selectUser(
  config: any,
  prompter: CLIPrompter
): Promise<{ userEmail: string; labId?: string }> {
  const currentUser = config.auth.username;
  const userLabMapping = config.userLabMapping || {};
  
  const mappedUsers = Object.entries(userLabMapping);

  const options: Array<{ type: 'current' | 'mapped'; email: string; lab?: string }> = [];
  
  // Add current user
  if (currentUser) {
    const currentUserLab = userLabMapping[currentUser];
    options.push({
      type: 'current',
      email: currentUser,
      lab: currentUserLab,
    });
  }

  // Add other mapped users
  mappedUsers.forEach(([email, lab]) => {
    if (email !== currentUser) {
      options.push({
        type: 'mapped',
        email,
        lab: lab as string,
      });
    }
  });

  if (options.length === 0) {
    throw new Error('No users configured. Please add userLabMapping to config.json');
  }

  const selected = await prompter.selectFromList(
    '👤 Who are these recommendations for?',
    options,
    (option, index) => {
      if (option.type === 'current') {
        return `${index}. Current user (${option.email})${option.lab ? ` - lab: ${option.lab}` : ''}`;
      } else {
        return `${index}. ${option.email}${option.lab ? ` - lab: ${option.lab}` : ''}`;
      }
    }
  );

  return {
    userEmail: selected.email,
    labId: selected.lab,
  };
}

// Run the wizard
main();

