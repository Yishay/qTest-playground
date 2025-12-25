# qTest On-Premise Data Extraction Tool

A standalone tool for extracting test execution data from qTest on-premise instances and converting it to event-based JSON format.

## Overview

This tool connects to your qTest instance, extracts test execution data, and generates JSON files containing test start/end events. The output format is compatible with CI/CD pipelines and analytics systems.

## Features

- ✅ Extract test execution data from qTest on-premise
- ✅ Generate event-based JSON output (testStart/testEnd events)
- ✅ **Clock synchronization** with Sealights backend
- ✅ Flexible date range filtering
- ✅ Project-specific extraction
- ✅ User and lab ID mapping
- ✅ Test stage name mapping
- ✅ Automatic file merging for incremental extractions
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
qTest onPrem tool/
├── src/
│   ├── auth.ts              # Authentication handling
│   ├── config.ts            # Configuration loading
│   ├── qtest-client.ts      # qTest API client
│   ├── clock-sync.ts        # Clock synchronization with Sealights
│   ├── event-generator.ts   # Event generation logic
│   ├── file-manager.ts      # File output handling
│   ├── extract.ts           # Main extraction script
│   └── types.ts             # TypeScript type definitions
├── output/                  # Generated output files (created on first run)
├── config.json             # Your configuration (git-ignored)
├── config.example.json     # Configuration template
├── package.json            # NPM package configuration
├── tsconfig.json           # TypeScript configuration
└── README.md              # This file
```

### Running in Development Mode
```bash
npm run extract -- --days 1
```

## License

ISC

## Support

For issues or questions, please contact your system administrator or refer to the qTest API documentation.

