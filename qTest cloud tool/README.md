# qTest Cloud Tool

A comprehensive tool for qTest integration with SeaLights, featuring test execution data extraction and AI-powered test recommendations.

## Overview

This tool connects to your qTest instance, extracts test execution data, and generates JSON files containing test start/end events. The output format is compatible with CI/CD pipelines and analytics systems.

## Features

### Data Extraction
- ✅ Extract test execution data from qTest (cloud and on-premise)
- ✅ Generate event-based JSON output (testStart/testEnd events)
- ✅ **Clock synchronization** with Sealights backend
- ✅ Flexible date range filtering
- ✅ Project-specific extraction
- ✅ Automatic file merging for incremental extractions

### Test Recommendations
- ✅ **AI-powered test recommendations** from SeaLights
- ✅ Interactive CLI wizard for easy navigation
- ✅ Automatic status validation and configuration
- ✅ Apply skip recommendations directly to qTest
- ✅ Full audit trail with JSON output

### Bulk Import from Test Design (NEW!)
- ✅ **Import test cases** from Test Design modules to Test Execution
- ✅ Navigate and select modules with full hierarchy support
- ✅ Create test runs automatically in selected location
- ✅ Apply initial status to imported tests
- ✅ Support for nested module structures

### General
- ✅ User and lab ID mapping
- ✅ Test stage name mapping
- ✅ OAuth and Bearer Token authentication support

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- Access to a qTest instance (on-premise or cloud)
- qTest API credentials (OAuth or Bearer Token)

## Installation

1. Clone or extract this tool to your desired location

2. Install dependencies:
```bash
npm install
```

3. Create your `config.json` file:
```bash
cp config.example.json config.json
```

4. Edit `config.json` with your qTest credentials

## Configuration

Edit `config.json` with your qTest instance details:

```json
{
  "qTestUrl": "https://your-qtest-instance.qtestnet.com/",
  "auth": {
    "username": "your.email@company.com",
    "password": "your-password",
    "clientCredentials": "base64-encoded-credentials"
  },
  "sealights": {
    "token": "your-sealights-agent-token",
    "backendUrl": "https://dev-staging.dev.sealights.co"
  },
  "userLabMapping": {
    "user.email@company.com": "lab-123"
  },
  "testStageMapping": {
    "Project Name / Test Suite Name": "Custom Stage Name"
  }
}
```

### Authentication Options

**Option 1: OAuth (Username/Password)**
```json
{
  "auth": {
    "username": "your.email@company.com",
    "password": "your-password",
    "clientCredentials": "base64-encoded-credentials"
  }
}
```

**Option 2: Bearer Token**
```json
{
  "auth": {
    "bearerToken": "your-bearer-token-here"
  }
}
```

### Sealights Integration (Optional)

**Clock Synchronization**: Syncs timestamps with Sealights backend for accurate reporting
```json
{
  "sealights": {
    "token": "your-sealights-agent-token",
    "backendUrl": "https://dev-staging.dev.sealights.co"
  }
}
```

The tool will:
1. Calculate drift between qTest Server and Integration Runtime (`clockDriftMs`)
2. Call Sealights `/api/sync` endpoint to get drift with Sealights BE (`slDriftMs`)
3. Adjust all event timestamps: `adjustedTime = originalQTestTime + clockDriftMs + slDriftMs`

If Sealights is not configured, clock sync is skipped and original qTest timestamps are used.

### Optional Mappings

**User Lab Mapping**: Associates user emails with lab IDs
```json
{
  "userLabMapping": {
    "john.doe@company.com": "lab-west-coast",
    "jane.smith@company.com": "lab-east-coast"
  }
}
```

**Test Stage Mapping**: Renames test stages in output
```json
{
  "testStageMapping": {
    "MyProject / Integration Tests": "integration_tests",
    "MyProject / Component Tests": "component_tests"
  }
}
```

## Usage

### Extract Last 7 Days (Default)
```bash
npm run extract
```

### Extract Specific Number of Days
```bash
npm run extract -- --days 30
```

### Extract All Available Data
```bash
npm run extract -- --all
```

### Extract Specific Project Only
```bash
npm run extract -- --project 12345
```

### Combine Options
```bash
npm run extract -- --days 90 --project 12345
```

---

## Test Recommendations Wizard

The tool includes an interactive wizard for applying SeaLights test recommendations to your qTest project.

---

## Bulk Import from Test Design

Import test cases from Test Design modules into Test Execution locations.

### Running the Bulk Import Wizard

```bash
npm run bulk-import
```

### What It Does

1. **Navigate Test Execution** - Select where to import tests (Release → Cycle → Suite)
2. **Navigate Test Design** - Select which module to import from
3. **Import Tests** - Creates test runs for all test cases in the module
4. **Apply Status** - Sets initial status for newly created tests

### Key Features

- **Stop at Any Level**: Can select any location in Test Execution hierarchy
- **Full Hierarchy Import**: Imports selected module and all its children
- **Module Navigation**: Option to drill down or select current module
- **Automatic Test Run Creation**: Creates test runs linked to test cases

### Example Use Cases

- Setting up a new release with tests from a specific module
- Copying test structure from Test Design to a new test cycle
- Bulk creating test runs for regression testing

**📖 For detailed guide, see [BULK-IMPORT-GUIDE.md](./BULK-IMPORT-GUIDE.md)**

---

### Prerequisites for Recommendations

Before using the recommendations feature:

#### 1. Configure SeaLights Integration (Optional but Recommended)
Add SeaLights configuration to your `config.json`:
```json
{
  "sealights": {
    "token": "your-sealights-agent-token",
    "backendUrl": "https://your-sealights-backend.com"
  }
}
```

**Note:** Currently operates in mock mode by default. Edit `mock-recommendations.json` to test different scenarios.

#### 2. Recommended: Create Dedicated Status in qTest

For best results, create a dedicated status for skipped tests:

1. Go to your project settings in qTest
2. Navigate to **Automation Settings** > **Test Run Status**
3. Add a new status (recommended name: **"SL Skipped"**)
4. Map this status to **PASS** in your automation settings

**Why?** Mapping to PASS prevents SeaLights from repeatedly recommending the same tests.

**Don't worry:** If you haven't created this status yet, the wizard will let you select an existing status and save your preference for future use.

### Running the Recommendations Wizard

```bash
npm run recommendations
```

### Wizard Flow

The wizard will guide you through:

1. **Select Project** - Choose from your qTest projects
2. **Navigate Hierarchy** - Browse through test cycles → test suites → folders
3. **Validate Status** - Ensure skip status exists (or select an alternative)
4. **Select Test Stage** - Choose from mapped stages or use original name
5. **Select User** - Pick user from your configuration
6. **Fetch Recommendations** - Get recommendations from SeaLights (or mock)
7. **Apply Updates** - Automatically update qTest test runs
8. **View Summary** - See results and output file location

### Example Session

```
========================================
SeaLights Test Recommendations Wizard
========================================

Step 1: Select Project
📦 Select a Project:
  1. Sealights
  2. Sealights2

  Enter selection (1-2): 1

✅ Selected: Sealights

Step 2: Navigate to Test Location
📂 Select location in "Sealights":
  1. 📁 Release 1
  2. 📁 Release 2

  Enter selection (1-2): 1

📋 Select location in "Sealights / Release 1":
  1. ✓ Tests in current folder - 15 test run(s)
  2. 📁 Sprint 1
  3. 📁 Sprint 2

  Enter selection (1-3): 2

✅ Selected location: Sealights / Release 1 / Sprint 1

Step 3: Validate Status Configuration
🔍 Validating qTest status configuration...
✅ Found status "SL Skipped" (ID: 123)

Step 4: Select Test Stage
🎯 Select Test Stage:
  1. Regression
  2. Progression
  3. (Use original name: "Sealights / Release 1 / Sprint 1")

  Enter selection (1-3): 1

✅ Selected test stage: Regression

Step 5: Select User
👤 Who are these recommendations for?
  1. Current user (y.haspel@tricentis.com) - lab: some-lab-example

  Enter selection: 1

✅ Selected user: y.haspel@tricentis.com
   Lab ID: some-lab-example

Step 6: Fetching Test Runs
📋 Loading test runs from selected location...
✅ Found 12 test runs

Step 7: Fetch Recommendations from SeaLights

🔍 Fetching recommendations from SeaLights...

Request details:
  - Project: Sealights
  - Test Stage: Regression
  - Lab ID: some-lab-example
  - User: y.haspel@tricentis.com
  - Test Runs: 12

✅ Received response from SeaLights

Step 8: Apply Recommendations

📋 SeaLights Recommendations:

SeaLights Status: ready
Test Selection Enabled: Yes
Full Run Required: No

The following 2 test(s) can be skipped:

  1. Some Test (Run ID: 12345)
  2. Another Test (Run ID: 12346)

✅ Applying recommendations to qTest using status "SL Skipped"...

  ✅ Updated Some Test (ID: 12345)
  ✅ Updated Another Test (ID: 12346)

Summary

✅ Successfully updated 2 test run(s) with "SL Skipped" status

📊 Summary:
  - Total recommendations: 2
  - Successfully applied: 2
  - Failed: 0

💾 Output saved to: output/recommendations_2025-12-25T14-30-00-000Z.json

✅ Recommendations wizard complete!
```

### Mock Mode

The tool includes a mock mode for testing and development:

1. **Edit Mock Data**: Modify `mock-recommendations.json` in the project root
2. **Test Names**: Add test names to `excludedTests` array to simulate recommendations
3. **Metadata**: Adjust metadata fields to test different scenarios

Example `mock-recommendations.json`:
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
      "testName": "Some Test"
    },
    {
      "testName": "Another Test"
    }
  ]
}
```

### Configuration Options

Add to your `config.json`:

```json
{
  "recommendations": {
    "skipStatusName": "SL Skipped",
    "enableMockMode": true
  }
}
```

- `skipStatusName`: Preferred status name (auto-configured by wizard)
- `enableMockMode`: Use mock data instead of real SeaLights API

### Output Format

Recommendations are saved to `output/recommendations_YYYY-MM-DDTHH-mm-ss-SSSZ.json`:

```json
{
  "timestamp": "2025-12-25T14:30:00.000Z",
  "project": "Sealights",
  "projectId": 12345,
  "testStage": "Regression",
  "user": "y.haspel@tricentis.com",
  "labId": "some-lab-example",
  "path": "Sealights / Release 1 / Sprint 1",
  "skipStatus": "SL Skipped",
  "sealightsMetadata": {
    "appName": "Sealights",
    "status": "ready",
    "testSelectionEnabled": true,
    "isFullRun": false
  },
  "recommendations": [
    {
      "testName": "Some Test",
      "testRunId": 12345,
      "applied": true
    }
  ],
  "summary": {
    "totalRecommendations": 2,
    "successfullyApplied": 2,
    "failed": 0
  }
}
```

---

## Output Format

The tool generates JSON files in the `output/` directory with the following structure:

### Individual Test Stage Files
```json
{
  "testStage": "integration_tests",
  "projectName": "MyProject",
  "labId": "lab-west-coast",
  "clockDriftMs": 1234,
  "slDriftMs": -567,
  "events": [
    {
      "type": "testStart",
      "testName": "Login Test",
      "externalId": "TC-001",
      "localTime": 1703001234567
    },
    {
      "type": "testEnd",
      "testName": "Login Test",
      "externalId": "TC-001",
      "result": "passed",
      "localTime": 1703001245678
    }
  ]
}
```

**Clock Drift Fields:**
- `clockDriftMs`: Drift between Integration Runtime and qTest Server (ms)
- `slDriftMs`: Drift between Integration Runtime and Sealights BE (ms, only if Sealights configured)
- Event `localTime` values are already adjusted by both drifts

### Summary File
```json
{
  "extractedAt": "2024-12-24T10:30:00.000Z",
  "totalTestStages": 5,
  "totalEvents": 1234,
  "testStages": [
    {
      "testStage": "integration_tests",
      "projectName": "MyProject",
      "labId": "lab-west-coast",
      "eventCount": 456
    }
  ]
}
```

## File Naming

Output files are named based on project and test stage:
- Format: `{project_name}___{test_stage_name}.json`
- Example: `myproject___integration_tests.json`
- Special characters are replaced with underscores
- Names are lowercased for consistency

## Event Types

### Test Start Event
```json
{
  "type": "testStart",
  "testName": "Test Name",
  "externalId": "TC-001",
  "localTime": 1703001234567
}
```

### Test End Event
```json
{
  "type": "testEnd",
  "testName": "Test Name",
  "externalId": "TC-001",
  "result": "passed",
  "localTime": 1703001245678
}
```

**Result values**: `passed`, `failed`, `skipped`

## Building for Production

To compile TypeScript to JavaScript:

```bash
npm run build
```

To run the compiled version:

```bash
npm run extract:prod
```

## Troubleshooting

### Authentication Errors
- Verify your credentials in `config.json`
- For OAuth: Ensure clientCredentials is base64 encoded
- For Bearer Token: Check token is valid and not expired

### No Data Found
- Check date range with `--days` parameter
- Verify you have access to projects in qTest
- Try `--all` to see if any data exists
- Use `--project <ID>` to target specific project

### API Rate Limiting
- The tool processes data sequentially to avoid overwhelming the API
- For large extractions, consider using `--project` to process one project at a time

## Development

### Project Structure
```
qTest cloud tool/
├── src/
│   ├── auth.ts                    # Authentication handling
│   ├── config.ts                  # Configuration loading
│   ├── qtest-client.ts            # qTest API client
│   ├── clock-sync.ts              # Clock synchronization with Sealights
│   ├── event-generator.ts         # Event generation logic
│   ├── file-manager.ts            # File output handling
│   ├── extract.ts                 # Main extraction script
│   ├── recommendations.ts         # Recommendations wizard (NEW!)
│   ├── sealights-client.ts        # SeaLights API client (NEW!)
│   ├── hierarchy-navigator.ts     # qTest hierarchy navigation (NEW!)
│   ├── recommendations-applier.ts # Apply recommendations to qTest (NEW!)
│   ├── status-validator.ts        # Status validation logic (NEW!)
│   ├── cli-prompter.ts            # CLI interaction utilities (NEW!)
│   └── types.ts                   # TypeScript type definitions
├── output/                        # Generated output files (created on first run)
├── config.json                    # Your configuration (git-ignored)
├── config.example.json            # Configuration template
├── mock-recommendations.json      # Mock SeaLights response (NEW!)
├── package.json                   # NPM package configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

### Running in Development Mode
```bash
npm run extract -- --days 1
```

## License

ISC

## Support

For issues or questions, please contact your system administrator or refer to the qTest API documentation.

