# Recommendations Wizard Design

## Overview
A CLI wizard that guides users through selecting a target location in qTest and applying SeaLights test recommendations.

## User Flow

### 1. Start Wizard
```
========================================
SeaLights Test Recommendations Wizard
========================================

This wizard will help you apply SeaLights test recommendations to your qTest project.
```

### 2. Project Selection
```
📦 Select a Project:
  1. Sealights
  2. Sealights2
  3. MyProject
  
  Enter selection (1-3): _
```

### 3. Navigate Hierarchy (Recursive)
The wizard will navigate through the qTest hierarchy, showing:
- Test Cycles (Releases)
- Test Suites (within cycles or at project level)
- Sub-folders recursively

**Example - Select Release:**
```
📂 Select Release/Cycle for "Sealights":
  1. Release 1
  2. Release 2
  
  Enter selection (1-2): _
```

**Example - Select Test Suite/Folder:**
```
📋 Select Test Suite for "Sealights / Release 1":
  1. Sprint 1
  2. Sprint 2
  3. Regression Tests
  
  Enter selection (1-3): _
```

**Example - Mixed (has tests + folders):**
```
📋 Select location in "Sealights / Release 1 / Sprint 1":
  1. ✓ Tests in current folder (Sealights / Release 1 / Sprint 1) - 15 test runs
  2. 📁 Component Tests
  3. 📁 Integration Tests
  
  Enter selection (1-3): _
```

### 4. Status Validation
Before proceeding, validate that the configured skip status exists:
```
🔍 Validating qTest status configuration...

❌ Status "SL Skipped" not found in project.

Available test run statuses:
  1. Pass
  2. Fail
  3. Blocked
  4. Incomplete
  
Which status should be used for skipped tests? (1-4): _

✅ Selected "Blocked" - saving to config.json for future use.

⚠️  RECOMMENDATION: Create a dedicated "SL Skipped" status in qTest and map it to PASS
   in Automation Settings to prevent repeated recommendations.
```

### 5. Test Stage Selection
Once a location with actual tests is selected:
```
🎯 Select Test Stage:

Available test stages from mapping:
  1. Regression
  2. Progression
  3. (Use original name: "Sealights / Release 1 / Sprint 1")
  
  Enter selection (1-3): _
```

### 6. User Selection
```
👤 Who are these recommendations for?

  1. Current user (y.haspel@tricentis.com)
  2. Mapped users:
     - y.haspel@tricentis.com (lab: some-lab-example)
  3. [TODO] Add new user mapping
  
  Enter selection (1-2): _
```

### 7. Fetch Recommendations from SeaLights
```
🔍 Fetching recommendations from SeaLights...

Request details:
  - Project: Sealights
  - Test Stage: Regression
  - Lab ID: some-lab-example
  - User: y.haspel@tricentis.com
  
⏳ Calling SeaLights API...
✅ Received 12 test recommendations
```

**Mock Response (loaded from `mock-recommendations.json`):**
```json
{
  "metadata": {
    "appName": "Sealights",
    "branchName": "main",
    "buildName": "build-123",
    "testStage": "Regression",
    "testGroupId": "group-1",
    "testSelectionEnabled": true,
    "isFullRun": false,
    "status": "ready"
  },
  "excludedTests": [
    {
      "testName": "test 1"
    },
    {
      "testName": "Another Test"
    }
  ]
}
```

Note: The mock file will be in the project root for easy editing.

### 8. Display & Apply Recommendations
```
📋 SeaLights Recommendations:

SeaLights Status: ready
Test Selection Enabled: Yes
Full Run Required: No

The following tests can be skipped (no relevant code changes detected):
  1. test 1 (TC-001)
  2. Another Test (TC-005)

✅ Applying recommendations to qTest...
```

### 9. Application Results
```
✅ Applying recommendations to qTest...

  Updating TC-001 (Login Test)... ✓
  Updating TC-005 (User Profile Test)... ✓
  
✅ Successfully updated 2 test runs with "SL Skipped" status

📊 Summary:
  - Total recommendations: 2
  - Successfully applied: 2
  - Failed: 0
  
  Output saved to: output/recommendations_2025-12-25_14-30-00.json
```

### 10. Output File Format
```json
{
  "timestamp": "2025-12-25T14:30:00.000Z",
  "project": "Sealights",
  "testStage": "Regression",
  "user": "y.haspel@tricentis.com",
  "labId": "some-lab-example",
  "path": "Sealights / Release 1 / Sprint 1",
  "recommendations": [
    {
      "testName": "Login Test",
      "externalId": "TC-001",
      "testRunId": 12345,
      "reason": "No code changes detected",
      "applied": true,
      "status": "SL Skipped"
    },
    {
      "testName": "User Profile Test",
      "externalId": "TC-005",
      "testRunId": 12346,
      "reason": "Code unchanged, test stable",
      "applied": true,
      "status": "SL Skipped"
    }
  ],
  "summary": {
    "totalRecommendations": 2,
    "successfullyApplied": 2,
    "failed": 0
  }
}
```

## Technical Architecture

### New Files to Create

#### 1. `src/recommendations.ts` (Main CLI Script)
- Entry point for the wizard
- Orchestrates the flow
- CLI interaction using readline

#### 2. `src/recommendations-wizard.ts` (Wizard Logic)
- Implements the step-by-step navigation
- Handles project/cycle/suite selection
- Recursive hierarchy navigation

#### 3. `src/sealights-client.ts` (SeaLights API Client)
- API calls to SeaLights backend
- Mock implementation for initial version
- Real implementation structure for future

#### 4. `src/recommendations-applier.ts` (Apply to qTest)
- Updates test runs with "SL Skipped" status
- Batch operations
- Error handling and retry logic

### Key Components

#### A. Hierarchy Navigator
```typescript
interface NavigationNode {
  type: 'project' | 'cycle' | 'suite' | 'tests';
  id: number;
  name: string;
  path: string[];
  hasTests: boolean;
  hasChildren: boolean;
  testRunCount?: number;
}

class HierarchyNavigator {
  async navigate(projectId: number): Promise<NavigationNode>;
  async getChildren(node: NavigationNode): Promise<NavigationNode[]>;
  async getTestRuns(node: NavigationNode): Promise<TestRun[]>;
}
```

#### B. CLI Prompter
```typescript
class CLIPrompter {
  async selectFromList<T>(
    title: string,
    items: T[],
    formatter: (item: T) => string
  ): Promise<T>;
  
  async confirmAction(message: string): Promise<boolean>;
}
```

#### C. SeaLights Mock Client
```typescript
interface RecommendationRequest {
  projectName: string;
  testStage: string;
  labId: string;
  userEmail: string;
  testRuns: Array<{
    testRunId: number;
    testName: string;
    externalId: string;
  }>;
}

interface Recommendation {
  externalId: string;
  testName: string;
  reason: string;
}

class SeaLightsClient {
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<Recommendation[]>;
}
```

### Configuration Updates

Add to `config.json`:
```json
{
  "recommendations": {
    "skipStatusName": "SL Skipped",
    "enableMockMode": true
  }
}
```

Note: The `skipStatusName` will be automatically set when user selects a status during validation.

### Package.json Script
```json
{
  "scripts": {
    "recommendations": "ts-node src/recommendations.ts",
    "recommendations:prod": "node dist/recommendations.js"
  }
}
```

## API Integration Points

### qTest API Calls Needed
1. `GET /api/v3/projects` - List projects
2. `GET /api/v3/projects/{projectId}/test-cycles` - List test cycles
3. `GET /api/v3/projects/{projectId}/test-suites` - List test suites
4. `GET /api/v3/projects/{projectId}/test-runs` - List test runs
5. `PUT /api/v3/projects/{projectId}/test-runs/{testRunId}` - Update test run status

### SeaLights API (Future)
```
POST /api/v1/test-recommendations
{
  "projectName": "Sealights",
  "testStage": "Regression",
  "labId": "some-lab-example",
  "tests": [
    { "externalId": "TC-001", "testName": "Login Test" },
    { "externalId": "TC-005", "testName": "User Profile Test" }
  ]
}

Response:
{
  "recommendations": [
    {
      "externalId": "TC-001",
      "skip": true,
      "reason": "No code changes detected"
    }
  ]
}
```

## Mock Implementation Strategy

### Phase 1: Mock Mode (Initial)
- Load recommendations from `mock-recommendations.json` file
- Match tests by name from the `excludedTests` array
- Support editing the mock file for different test scenarios
- Use SeaLights metadata format for compatibility

### Mock File Structure (`mock-recommendations.json`)
```json
{
  "metadata": {
    "appName": "string",
    "branchName": "string",
    "buildName": "string",
    "testStage": "string",
    "testGroupId": "string",
    "testSelectionEnabled": true,
    "isFullRun": false,
    "status": "ready",
    "fullRunReason": "Optional reason if isFullRun=true"
  },
  "excludedTests": [
    {
      "testName": "test 1"
    }
  ]
}
```

### Phase 2: Real API Integration
- Replace mock file loading with real SeaLights API calls
- Use actual recommendation logic
- Handle API errors gracefully
- Maintain same response format

## Error Handling

### Common Scenarios
1. **No test runs found**: Display message and exit gracefully
2. **Authentication fails**: Show clear error message
3. **SeaLights API timeout**: Retry with exponential backoff
4. **Update failed**: Continue with other tests, report failures
5. **Status doesn't exist**: Show available statuses, let user pick, save to config
6. **Mock file missing**: Create default mock file with example data
7. **Test name doesn't match**: Log warning, continue with matched tests only
8. **isFullRun=true**: Display message that all tests should run, don't skip any
9. **status=notReady/error**: Display appropriate message and exit

## User Documentation Updates

### README.md Additions

```markdown
## Test Recommendations

The tool includes a wizard for applying SeaLights test recommendations to your qTest project.

### Prerequisites

Before using recommendations:

1. **Create "SL Skipped" Status in qTest:**
   - Go to your project settings in qTest
   - Navigate to Automation Settings > Test Run Status
   - Add a new status (recommended name: "SL Skipped")
   - Map this status to "PASS" in your automation settings
   
   **Why?** This prevents SeaLights from recommending the same tests repeatedly.

2. **Configure SeaLights in config.json:**
   ```json
   {
     "sealights": {
       "token": "your-sealights-agent-token",
       "backendUrl": "https://your-sealights-backend.com"
     }
   }
   ```

### Running the Wizard

```bash
npm run recommendations
```

The wizard will guide you through:
1. Selecting a project
2. Navigating to the target test suite/folder
3. Choosing the test stage
4. Selecting the user
5. Reviewing and applying recommendations

### Output

Recommendations are saved to: `output/recommendations_YYYY-MM-DD_HH-mm-ss.json`
```

## Future Enhancements

1. **Batch Processing**: Process multiple test suites at once
2. **Scheduling**: Run recommendations on a schedule
3. **Integration with CI/CD**: Export recommendations for pipeline integration
4. **Historical Analysis**: Track recommendation accuracy over time
5. **User Mapping Wizard**: Add new users interactively (Option 3 in user selection)
6. **Custom Status Name**: Allow users to configure status name per project
7. **Dry Run Mode**: Preview recommendations without applying them
8. **Filters**: Filter recommendations by confidence score or other criteria

## Testing Strategy

### Manual Testing Scenarios
1. Single project with simple structure
2. Multiple projects
3. Nested test suites (3+ levels deep)
4. Mixed folders (some with tests, some without)
5. Empty test suites
6. Large number of test runs (100+)
7. Network failures during API calls
8. Status update failures

### Mock Data
- Use existing qTest staging instance
- Create test data with known structure
- Verify correct navigation and selection

## Success Criteria

- ✅ User can navigate qTest hierarchy intuitively
- ✅ Clear visual indicators (icons, indentation)
- ✅ Handles errors gracefully with helpful messages
- ✅ Generates proper output files
- ✅ Mock mode works correctly (2 tests marked as skippable)
- ✅ Updates qTest test runs successfully
- ✅ README includes clear setup instructions
- ✅ Can be extended to real SeaLights API easily

