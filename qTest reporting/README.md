# qTest Test Execution Reporting Tool

A standalone tool for generating comprehensive test execution reports from qTest, organized by user and date.

## Features

- 📊 Query test executions across all qTest projects or specific projects
- 📅 Flexible date range filtering (last N days, or all time)
- 👥 Groups test executions by date and user
- 📈 Multiple output formats:
  - **Console**: Human-readable formatted output
  - **JSON**: Structured data with full details and statistics
  - **CSV**: Spreadsheet-ready format for analysis
- ⚡ Handles qTest's hierarchical structure (Projects → Test Cycles → Test Suites → Test Runs → Test Logs)
- 🔐 Supports both OAuth (username/password) and Bearer Token authentication

## Installation

```bash
npm install
```

## Configuration

1. Copy the example configuration file:

```bash
cp config.example.json config.json
```

2. Edit `config.json` with your qTest credentials:

```json
{
  "qTestUrl": "https://your-qtest-instance.qtestnet.com/",
  "auth": {
    "username": "your.email@company.com",
    "password": "your-password",
    "clientCredentials": "base64-encoded-credentials"
  }
}
```

### Authentication Methods

**Option 1: Username/Password (OAuth)**
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

## Usage

### Basic Commands

```bash
# Run report for the last 7 days (default)
npm run report

# Last 30 days
npm run report -- --days 30

# Last 90 days
npm run report -- --days 90

# All test executions (no date filter)
npm run report -- --all

# Specific project only
npm run report -- --project 1636

# Show help
npm run report -- --help
```

### Using Compiled Version

```bash
# Build the project
npm run build

# Run the compiled version
npm run report:prod -- --days 30
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--days <N>` | Number of days to look back (default: 7) | `--days 30` |
| `--all` | Show all test executions regardless of date | `--all` |
| `--project <ID>` | Only query specific project by ID | `--project 1636` |
| `--help`, `-h` | Show help message | `--help` |

## Output

The tool generates three types of output:

### 1. Console Report

Formatted, human-readable output displayed in the terminal:

```
====================================================================================================
TEST EXECUTION REPORT BY USER BY DAY
Period: 2025-12-16 to 2025-12-23 (7 days)
====================================================================================================

====================================================================================================
DATE: 2025-12-22
====================================================================================================

  User: John Doe (john.doe@example.com)
  Total Tests: 8
  ------------------------------------------------------------------------------------------------

    Project: My Project (8 tests)
      - [Passed] Some Test (ID: 1549)
        Start: 3:37:33 PM | End: 3:45:59 PM
      - [Failed] Another Test (ID: 1550)
        Start: 3:57:49 PM | End: 3:59:00 PM

====================================================================================================

SUMMARY:
  Total Executions: 8
  Unique Users: 1
  Unique Tests: 2
  Projects: My Project
```

### 2. JSON Report

Saved to `output/test-execution-report-YYYY-MM-DD.json`:

```json
{
  "reportGenerated": "2025-12-23T10:30:00.000Z",
  "options": {
    "days": 7,
    "showAll": false,
    "projectId": null
  },
  "period": {
    "start": "2025-12-16",
    "end": "2025-12-23"
  },
  "summary": {
    "totalExecutions": 8,
    "uniqueUsers": 1,
    "uniqueTests": 2,
    "projects": ["My Project"]
  },
  "executionsByDateAndUser": [...],
  "allExecutions": [...]
}
```

### 3. CSV Report

Saved to `output/test-execution-report-YYYY-MM-DD.csv`:

```csv
Date,User,User Email,Project,Test Name,Test Case ID,Start Time,End Time,Status
"2025-12-22","John Doe","john.doe@example.com","My Project","Some Test",1549,"2025-12-22T13:37:33+00:00","2025-12-22T13:45:59+00:00","Passed"
```

Perfect for importing into Excel, Google Sheets, or data analysis tools.

## How It Works

1. **Authenticates** with qTest using your credentials
2. **Queries** all projects (or specific project if specified)
3. **Traverses** the qTest hierarchy:
   - Projects → Test Cycles → Test Suites → Test Runs → Test Logs
4. **Extracts** execution details including:
   - Test name and ID
   - Start and end times
   - Status (Passed/Failed/Blocked/Incomplete)
   - User who executed the test
5. **Filters** by date range
6. **Groups** executions by date and user
7. **Generates** reports in multiple formats

## Use Cases

### Weekly Team Report
```bash
npm run report
```

### Monthly Summary
```bash
npm run report -- --days 30
```

### Project-Specific Analysis
```bash
npm run report -- --project 1636 --days 60
```

### Comprehensive Audit
```bash
npm run report -- --all
```

## Troubleshooting

### No Test Executions Found

If you see "No test executions found", try:

- Extending the date range: `npm run report -- --days 90`
- Querying all time: `npm run report -- --all`
- Checking a specific project: `npm run report -- --project <ID>`
- Verifying that test executions exist in your qTest projects

### Authentication Errors

Ensure your `config.json` has valid credentials:
- For OAuth: username, password, and clientCredentials are all required
- For Bearer Token: the token must be valid and not expired

### API Rate Limiting

For large projects with many test executions:
- The tool automatically handles pagination
- Processing may take several minutes
- Consider filtering by specific project ID to reduce scope

## Project Structure

```
qTest reporting/
├── src/
│   ├── auth.ts           # qTest authentication
│   ├── config.ts         # Configuration loading and validation
│   ├── qtest-client.ts   # qTest API client
│   ├── report.ts         # Main reporting script
│   └── types.ts          # TypeScript type definitions
├── output/               # Generated reports (created automatically)
├── config.json          # Your configuration (gitignored)
├── config.example.json  # Example configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

- Node.js 16.x or higher
- Access to a qTest instance
- Valid qTest credentials (OAuth or Bearer Token)

## License

ISC

## Support

For issues or questions, please check:
- qTest API documentation
- Your qTest instance's API endpoints
- Network connectivity to your qTest instance

