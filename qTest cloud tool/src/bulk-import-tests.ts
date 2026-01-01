#!/usr/bin/env node

import { loadConfig } from './config';
import { QTestClient } from './qtest-client';
import { CLIPrompter } from './cli-prompter';
import { HierarchyNavigator } from './hierarchy-navigator';
import { ModuleNavigator, ModuleNode, ModuleHierarchy } from './module-navigator';
import { RecommendationsApplier } from './recommendations-applier';
import { StatusValidator } from './status-validator';
import { NavigationNode } from './types';
import { ErrorLogger } from './error-logger';

/**
 * Bulk Import Tests from Test Design
 * Allows selecting a folder in test-execution and importing a module from test-design
 */
async function main() {
  const prompter = new CLIPrompter();
  const errorLogger = new ErrorLogger('bulk-import-errors.log');

  try {
    prompter.displayHeader('Bulk Import Tests from Test Design');
    console.log('This wizard will help you import test cases from Test Design into Test Execution.\n');

    // Load configuration
    console.log('📋 Loading configuration...');
    const config = loadConfig();

    // Initialize clients
    console.log('🔐 Initializing qTest client...');
    const qTestClient = new QTestClient(config);
    const executionNavigator = new HierarchyNavigator(qTestClient);
    const moduleNavigator = new ModuleNavigator(qTestClient);
    const applier = new RecommendationsApplier(qTestClient);
    const validator = new StatusValidator(applier, prompter);

    // Step 1: Select Project
    prompter.displaySection('Step 1: Select Project');
    const projects = await executionNavigator.getProjects();
    
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
    
    const projectId = selectedProject.id;

    // Step 2: Navigate to Test Execution location
    prompter.displaySection('Step 2: Navigate to Test Execution Location');
    console.log('Navigate to the folder where you want to import tests.');
    console.log('You can stop at any level to select that location.\n');
    
    const targetExecutionNode = await navigateToExecutionLocation(
      executionNavigator,
      selectedProject,
      prompter
    );
    
    if (!targetExecutionNode) {
      prompter.error('No location selected.');
      process.exit(1);
    }

    const executionPath = executionNavigator.formatPath(targetExecutionNode);
    console.log(`\n✅ Selected execution location: ${executionPath}`);

    // Step 3: Navigate Test Design and select module
    prompter.displaySection('Step 3: Select Module from Test Design');
    console.log('Now select the module you want to import from Test Design.\n');
    
    const selectedModule = await navigateAndSelectModule(
      moduleNavigator,
      projectId,
      prompter
    );
    
    if (!selectedModule) {
      prompter.error('No module selected.');
      process.exit(1);
    }

    const modulePath = moduleNavigator.formatPath(selectedModule);
    console.log(`\n✅ Selected module: ${modulePath}`);

    // Step 4: Ask about unapproved test cases
    prompter.displaySection('Step 4: Test Case Approval Status');
    console.log(`\nTest cases in qTest can have different approval statuses (New, Approved, etc.).`);
    console.log(`Unapproved test cases may cause errors when updating their status.`);
    console.log(`\nDo you want to include unapproved test cases in the import?`);
    console.log(`  - Yes: Import all test cases (approved and unapproved)`);
    console.log(`  - No: Import only approved test cases`);
    
    const includeUnapproved = await prompter.ask('\nInclude unapproved test cases? (yes/no): ');
    const shouldIncludeUnapproved = includeUnapproved.toLowerCase() === 'yes' || includeUnapproved.toLowerCase() === 'y';
    
    if (shouldIncludeUnapproved) {
      console.log(`\n✅ Will import all test cases (including unapproved)`);
    } else {
      console.log(`\n✅ Will import only approved test cases`);
    }

    // Step 5: Confirm import
    prompter.displaySection('Step 5: Confirm Import');
    console.log(`\nYou are about to import:`);
    console.log(`  FROM: Test Design → ${modulePath}`);
    console.log(`  TO: Test Execution → ${executionPath}`);
    console.log(`  Filter: ${shouldIncludeUnapproved ? 'All test cases' : 'Approved test cases only'}`);
    
    const confirm = await prompter.ask('\nProceed with import? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('\n❌ Import cancelled.');
      process.exit(0);
    }

    // Step 6: Import tests
    prompter.displaySection('Step 6: Importing Tests');
    console.log('\n📋 Fetching module hierarchy from Test Design...');
    
    const moduleHierarchy = await moduleNavigator.getModuleHierarchyWithTestCases(
      projectId,
      selectedModule.id,
      selectedModule.name,
      shouldIncludeUnapproved
    );
    
    // Count total test cases
    const totalTestCases = countTestCasesInHierarchy(moduleHierarchy);
    
    if (totalTestCases === 0) {
      prompter.error('No test cases found in selected module.');
      process.exit(1);
    }

    console.log(`✅ Found ${totalTestCases} test case(s) across module hierarchy`);
    console.log('\n📝 Creating test cycle hierarchy in Test Execution...');
    
    const createResults = await createHierarchyWithTestRuns(
      qTestClient,
      projectId,
      targetExecutionNode,
      moduleHierarchy,
      errorLogger
    );

    console.log(`\n✅ Successfully created ${createResults.successCount} test run(s)`);
    if (createResults.failCount > 0) {
      console.log(`❌ Failed to create ${createResults.failCount} test run(s)`);
    }

    const successCount = createResults.successCount;
    const failCount = createResults.failCount;

    // Step 7: Validate status exists
    prompter.displaySection('Step 7: Validate Status Configuration');
    const { status: skipStatus, statusName } = await validator.validateAndGetStatus(
      projectId,
      config
    );

    // Step 8: Select user
    prompter.displaySection('Step 8: Select User');
    const { userEmail, labId } = await selectUser(config, prompter);
    console.log(`\n✅ Selected user: ${userEmail}`);
    if (labId) {
      console.log(`   Lab ID: ${labId}`);
    }

    // Step 9: Load recommendations and filter test runs
    prompter.displaySection('Step 9: Load Recommendations');
    console.log(`\nLoading recommendations to determine which tests to update...`);
    
    const recommendations = await loadRecommendations(config);
    if (!recommendations) {
      prompter.error('Failed to load recommendations.');
      process.exit(1);
    }
    
    const targetTestStage = recommendations.metadata.testStage;
    console.log(`✅ Target test stage from recommendations: "${targetTestStage}"`);
    
    const excludedTestNames = new Set<string>(
      recommendations.excludedTests.map((t: any) => t.testName as string)
    );
    console.log(`✅ Found ${excludedTestNames.size} excluded test(s)`);
    
    // Filter test runs based on testStageMapping and excludedTests
    const successfulRuns = createResults.createdTestRuns
      .filter(r => r.success)
      .map(r => ({ 
        testRunId: r.testRunId!, 
        testName: r.testName, 
        testCaseVersionId: r.testCaseVersionId,
        testSuiteName: r.testSuiteName 
      }));
    
    const runsInTestStage = filterTestRunsByTestStage(
      successfulRuns,
      targetTestStage,
      config
    );
    
    // From tests in the testStage, only update those in excludedTests
    const filteredRuns = runsInTestStage.filter(run => {
      if (excludedTestNames.has(run.testName)) {
        console.log(`  ✅ Will skip: ${run.testName} (in excludedTests)`);
        return true;
      } else {
        console.log(`  ⊗ Not updating: ${run.testName} (not in excludedTests)`);
        return false;
      }
    });
    
    console.log(`\n📊 Filtering results:`);
    console.log(`  - Total test runs created: ${successfulRuns.length}`);
    console.log(`  - Test runs in testStage "${targetTestStage}": ${runsInTestStage.length}`);
    console.log(`  - Test runs to mark as skipped (in excludedTests): ${filteredRuns.length}`);
    console.log(`  - Test runs not updated: ${runsInTestStage.length - filteredRuns.length}`);

    // Step 10: Apply status to filtered test runs
    prompter.displaySection('Step 10: Update Test Runs');
    console.log(`\nApplying status "${statusName}" to filtered test runs...`);

    if (filteredRuns.length > 0) {
      const applyResults = await applier.applySkipStatus(
        projectId,
        filteredRuns,
        skipStatus.id,
        errorLogger
      );

      let updateSuccessCount = 0;
      let updateFailCount = 0;

      for (const result of applyResults) {
        if (result.applied) {
          console.log(`  ✅ Updated ${result.testName} (ID: ${result.testRunId})`);
          updateSuccessCount++;
        } else {
          // Error already logged by applySkipStatus
          updateFailCount++;
        }
      }

      console.log(`\n✅ Successfully updated ${updateSuccessCount} test run(s) with "${statusName}" status`);
      if (updateFailCount > 0) {
        console.log(`❌ Failed to update ${updateFailCount} test run(s)`);
      }
    } else {
      console.log('\n⚠️  No test runs matched the target testStage. No updates applied.');
    }

    // Step 11: Summary
    prompter.displaySection('Summary');
    console.log(`\n✅ Bulk import complete!`);
    console.log(`\n📊 Summary:`);
    console.log(`  - Source module: ${modulePath}`);
    console.log(`  - Destination: ${executionPath}`);
    console.log(`  - Test cases found: ${totalTestCases}`);
    console.log(`  - Test runs created: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);
    console.log(`  - User: ${userEmail}`);
    
    // Display error log summary if there were errors
    if (errorLogger.hasErrors()) {
      errorLogger.writeSummary();
      const summary = errorLogger.getSummary();
      console.log(`\n⚠️  ${summary.total} error(s) logged to file`);
      console.log(`   Error log: ${errorLogger.getLogFilePath()}`);
      console.log(`\n   Breakdown:`);
      Object.entries(summary.byType).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`);
      });
    }
    
  } catch (error: any) {
    prompter.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    prompter.close();
  }
}

/**
 * Navigate execution hierarchy with option to stop at any level
 */
async function navigateToExecutionLocation(
  navigator: HierarchyNavigator,
  startNode: NavigationNode,
  prompter: CLIPrompter
): Promise<NavigationNode | null> {
  let currentNode = startNode;
  
  const projectId = startNode.id;

  while (true) {
    const children = await navigator.getChildren(currentNode);
    
    // Tag children with projectId
    children.forEach((child: any) => {
      child.projectId = projectId;
    });

    // Build options: always include "Select current location" + children
    const options: Array<{ type: 'current' | 'child'; node: NavigationNode }> = [];
    
    // Always add option to select current location (except for project root)
    if (currentNode.type !== 'project') {
      options.push({ type: 'current', node: currentNode });
    }
    
    // Add children
    children.forEach((child) => {
      options.push({ type: 'child', node: child });
    });

    // If no options (project with no children), must select current
    if (options.length === 0) {
      return currentNode;
    }

    // Display and select
    const pathStr = navigator.formatPath(currentNode);
    const title = currentNode.type === 'project' 
      ? `📂 Select location in "${currentNode.name}":`
      : `📋 Current: "${pathStr}" - Select location:`;

    const selected = await prompter.selectFromList(
      title,
      options,
      (option, index) => {
        if (option.type === 'current') {
          return `${index}. ✓ Use current location (${pathStr})`;
        } else {
          const prefix = option.node.type === 'suite' ? '📁' : '📂';
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
 * Navigate Test Design modules and select one
 */
async function navigateAndSelectModule(
  navigator: ModuleNavigator,
  projectId: number,
  prompter: CLIPrompter
): Promise<ModuleNode | null> {
  // Start with root modules
  const rootModules = await navigator.getRootModules(projectId);
  
  if (rootModules.length === 0) {
    prompter.error('No modules found in Test Design.');
    return null;
  }

  let currentModules = rootModules;
  let currentPath: string[] = [];

  while (true) {
    // Build options
    const options: Array<{ type: 'select' | 'navigate'; module: ModuleNode }> = [];
    
    for (const module of currentModules) {
      // Add option to select current module with all children
      options.push({ type: 'select', module });
      
      // Add option to navigate into module if it has children
      if (module.hasChildren) {
        options.push({ type: 'navigate', module });
      }
    }

    if (options.length === 0) {
      return null;
    }

    // Display current path
    const pathDisplay = currentPath.length > 0 
      ? `Current: Test Design / ${currentPath.join(' / ')}`
      : 'Test Design (Root)';
    
    const selected = await prompter.selectFromList(
      `📂 ${pathDisplay} - Select module:`,
      options,
      (option, index) => {
        if (option.type === 'select') {
          const childNote = option.module.hasChildren 
            ? ` (includes ${option.module.childCount} child module(s))`
            : '';
          return `${index}. ✓ Select "${option.module.name}" and copy all${childNote}`;
        } else {
          return `${index}. 📁 Navigate into "${option.module.name}" (${option.module.childCount} children)`;
        }
      }
    );

    if (selected.type === 'select') {
      return selected.module;
    } else {
      // Navigate into the module
      currentPath = selected.module.path;
      currentModules = await navigator.getChildModules(projectId, selected.module);
      
      if (currentModules.length === 0) {
        console.log('\n⚠️  No child modules found. Selecting current module.');
        return selected.module;
      }
    }
  }
}

/**
 * Count total test cases in hierarchy
 */
function countTestCasesInHierarchy(hierarchy: ModuleHierarchy): number {
  let count = hierarchy.testCases.length;
  for (const child of hierarchy.children) {
    count += countTestCasesInHierarchy(child);
  }
  return count;
}

/**
 * Create test cycle hierarchy with test runs mirroring module structure
 */
async function createHierarchyWithTestRuns(
  client: QTestClient,
  projectId: number,
  targetNode: NavigationNode,
  moduleHierarchy: ModuleHierarchy,
  errorLogger: ErrorLogger
): Promise<{ successCount: number; failCount: number; createdTestRuns: any[] }> {
  const apiClient = (client as any).getApiClient();
  let successCount = 0;
  let failCount = 0;
  const createdTestRuns: any[] = [];

  // Determine parent for the root of our imported hierarchy
  let parentId: number;
  let parentType: string;

  if (targetNode.type === 'suite') {
    parentId = targetNode.id;
    parentType = 'test-suite';
  } else if (targetNode.type === 'cycle') {
    parentId = targetNode.id;
    parentType = 'test-cycle';
  } else if (targetNode.type === 'project') {
    parentId = targetNode.id;
    parentType = 'root';
  } else {
    throw new Error('Invalid target node type');
  }

  // Recursively create the hierarchy
  await createModuleHierarchyRecursive(
    apiClient,
    projectId,
    moduleHierarchy,
    parentId,
    parentType,
    createdTestRuns,
    { successCount: 0, failCount: 0 },
    errorLogger
  );

  // Count results
  successCount = createdTestRuns.filter(r => r.success).length;
  failCount = createdTestRuns.filter(r => !r.success).length;

  return { successCount, failCount, createdTestRuns };
}

/**
 * Recursively create module hierarchy in test execution
 */
async function createModuleHierarchyRecursive(
  apiClient: any,
  projectId: number,
  module: ModuleHierarchy,
  parentId: number,
  parentType: string,
  results: any[],
  counts: { successCount: number; failCount: number },
  errorLogger: ErrorLogger
): Promise<void> {
  let currentParentId = parentId;
  let currentParentType = parentType;

  // If this module has children, create a test cycle for it
  if (module.children.length > 0) {
    try {
      console.log(`\n   Creating test cycle: "${module.name}"...`);
      
      const cycleData: any = {
        name: module.name,
      };

      // Build URL with query parameters based on parent type
      let url = `/api/v3/projects/${projectId}/test-cycles`;
      if (parentType === 'test-cycle') {
        url += `?parentId=${parentId}&parentType=test-cycle`;
      } else if (parentType === 'root') {
        url += `?parentId=0&parentType=root`;
      } else if (parentType === 'release') {
        url += `?parentId=${parentId}&parentType=release`;
      }

      const cycleResponse = await apiClient.post(url, cycleData);

      currentParentId = cycleResponse.data.id;
      currentParentType = 'test-cycle';
      console.log(`   ✅ Created test cycle: "${module.name}" (ID: ${cycleResponse.data.id})`);
    } catch (error: any) {
      // Log error silently to file
      errorLogger.logHierarchyCreationError('test-cycle', module.name, error);
      // Continue anyway - try to create test runs if possible
    }
  }

  // If this module has test cases, create a test suite and test runs
  if (module.testCases.length > 0) {
    try {
      console.log(`\n   Creating test suite for module: "${module.name}"...`);
      
      const suiteData: any = {
        name: module.name,
      };

      // Build URL with query parameters based on parent type
      let suiteUrl = `/api/v3/projects/${projectId}/test-suites`;
      if (currentParentType === 'test-cycle') {
        suiteUrl += `?parentId=${currentParentId}&parentType=test-cycle`;
      } else if (currentParentType === 'test-suite') {
        suiteUrl += `?parentId=${currentParentId}&parentType=test-suite`;
      }

      const suiteResponse = await apiClient.post(suiteUrl, suiteData);

      const suiteId = suiteResponse.data.id;
      console.log(`   ✅ Created test suite: "${module.name}" (ID: ${suiteId})`);

      // Create test runs in this suite
      console.log(`   Creating ${module.testCases.length} test run(s) in "${module.name}"...`);
      
      for (const testCase of module.testCases) {
        try {
          const testRunData = {
            name: testCase.name,
            test_case: {
              id: testCase.id,
            },
          };

          // Use query parameters for parent relationship
          const runResponse = await apiClient.post(
            `/api/v3/projects/${projectId}/test-runs?parentId=${suiteId}&parentType=test-suite`,
            testRunData
          );

          results.push({
            success: true,
            testName: testCase.name,
            testRunId: runResponse.data.id,
            testCaseVersionId: runResponse.data.test_case_version_id,
            testSuiteName: module.name, // Track which test suite this belongs to
          });
          counts.successCount++;
          console.log(`      ✅ ${testCase.name}`);
        } catch (error: any) {
          // Log error silently to file
          errorLogger.logTestRunCreationError(testCase.name, module.name, error);
          results.push({
            success: false,
            testName: testCase.name,
            error: error.message,
          });
          counts.failCount++;
        }
      }
    } catch (error: any) {
      // Log error silently to file
      errorLogger.logHierarchyCreationError('test-suite', module.name, error);
      counts.failCount += module.testCases.length;
    }
  }

  // Recursively process children
  for (const child of module.children) {
    await createModuleHierarchyRecursive(
      apiClient,
      projectId,
      child,
      currentParentId,
      currentParentType,
      results,
      counts,
      errorLogger
    );
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
    '👤 Who are these tests for?',
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

/**
 * Load recommendations from file or API
 */
async function loadRecommendations(config: any): Promise<any> {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  // Check if mock mode is enabled
  if (config.recommendations?.enableMockMode) {
    console.log('  📄 Loading mock recommendations...');
    const mockPath = path.join(process.cwd(), 'mock-recommendations.json');
    
    try {
      const content = await fs.readFile(mockPath, 'utf-8');
      const recommendations = JSON.parse(content);
      console.log('  ✅ Mock recommendations loaded');
      return recommendations;
    } catch (error: any) {
      console.error(`  ❌ Failed to load mock recommendations: ${error.message}`);
      return null;
    }
  } else {
    // TODO: Load from Sealights API
    console.log('  ⚠️  Real recommendations not implemented yet. Using mock mode.');
    return null;
  }
}

/**
 * Filter test runs to only include those in the target testStage
 */
function filterTestRunsByTestStage(
  testRuns: Array<{ testRunId: number; testName: string; testCaseVersionId?: number; testSuiteName?: string }>,
  targetTestStage: string,
  config: any
): Array<{ testRunId: number; testName: string; testCaseVersionId?: number }> {
  const testStageMapping = config.testStageMapping || {};
  
  return testRuns
    .filter(run => {
      // Check if test suite maps to target testStage
      if (run.testSuiteName) {
        // Try multiple key variations to find the mapping
        const possibleKeys = [
          run.testSuiteName,                    // e.g., "Read only mode"
          `Sealights / ${run.testSuiteName}`,   // e.g., "Sealights / Read only mode"
        ];
        
        let mappedTestStage: string | undefined;
        let matchedKey: string | undefined;
        
        for (const key of possibleKeys) {
          if (testStageMapping[key]) {
            mappedTestStage = testStageMapping[key];
            matchedKey = key;
            break;
          }
        }
        
        if (!mappedTestStage) {
          console.log(`  ⊗ Not in scope: ${run.testName} (suite "${run.testSuiteName}" not found in testStageMapping)`);
          return false;
        }
        
        if (mappedTestStage === targetTestStage) {
          console.log(`  📍 In testStage: ${run.testName} (suite "${run.testSuiteName}" → "${mappedTestStage}")`);
          return true;
        } else {
          console.log(`  ⊗ Different testStage: ${run.testName} (suite maps to "${mappedTestStage}", not "${targetTestStage}")`);
          return false;
        }
      }
      
      // If no test suite name, skip it
      console.log(`  ⊗ No suite name: ${run.testName}`);
      return false;
    })
    .map(run => ({
      testRunId: run.testRunId,
      testName: run.testName,
      testCaseVersionId: run.testCaseVersionId,
    }));
}

// Run the wizard
main();

