# qTest On-Premise Tool - Project Information

## What is This Tool?

This is a **data extraction tool** that pulls test execution data from qTest and converts it into **event-based JSON files**. It's designed for on-premise qTest instances but works with cloud instances too.

## Key Differences from qTest Reporting Tool

| Feature | qTest Reporting Tool | qTest OnPrem Tool |
|---------|---------------------|-------------------|
| **Output Format** | CSV file (tabular) | JSON files (events) |
| **Data Structure** | One row per test execution | testStart/testEnd event pairs |
| **Use Case** | Human-readable reports | CI/CD integration, analytics |
| **File Organization** | Single CSV per extraction | One JSON per test stage |
| **Incremental Updates** | Overwrites each time | Merges with existing data |
| **Clock Sync** | None | Sealights BE sync with drift compensation |
| **Webhook Integration** | None | None (standalone) |

## Architecture

### Core Components

1. **auth.ts** - Handles qTest authentication (OAuth & Bearer Token)
2. **config.ts** - Loads and validates configuration
3. **qtest-client.ts** - API client for qTest v3 API
4. **clock-sync.ts** - **NEW**: Clock synchronization with Sealights BE
5. **event-generator.ts** - Converts test logs to events
6. **file-manager.ts** - Writes JSON output files
7. **extract.ts** - Main orchestration script
8. **types.ts** - TypeScript type definitions

### Data Flow

```
┌─────────────┐
│   qTest     │
│   Server    │
└──────┬──────┘
       │
       │ API Calls
       ↓
┌─────────────┐
│  QTestClient│
└──────┬──────┘
       │
       │ Test Logs
       ↓
┌──────────────┐
│EventGenerator│
└──────┬───────┘
       │
       │ Events
       ↓
┌─────────────┐
│FileManager  │
└──────┬──────┘
       │
       ↓
   output/
   ├── project___teststage.json
   ├── project___teststage2.json
   └── _summary.json
```

## Event Format

The tool generates two types of events:

### testStart Event
```json
{
  "type": "testStart",
  "testName": "Login Test",
  "externalId": "TC-001",
  "localTime": 1703001234567
}
```

### testEnd Event
```json
{
  "type": "testEnd",
  "testName": "Login Test",
  "externalId": "TC-001",
  "result": "passed",
  "localTime": 1703001245678
}
```

## Output File Structure

### Test Stage File
Each test stage gets its own JSON file:

```json
{
  "testStage": "integration_tests",
  "projectName": "MyProject",
  "labId": "lab-west-coast",
  "clockDriftMs": 1234,
  "slDriftMs": -567,
  "events": [...]
}
```

**Clock Synchronization:**
- `clockDriftMs`: Integration Runtime - qTest Server time difference
- `slDriftMs`: Integration Runtime - Sealights BE time difference
- Event timestamps are adjusted: `localTime = qTestTime + clockDriftMs + slDriftMs`

### Summary File
One summary file per extraction:

```json
{
  "extractedAt": "2024-12-24T10:30:00.000Z",
  "totalTestStages": 5,
  "totalEvents": 1234,
  "testStages": [...]
}
```

## Configuration Mappings

### User Lab Mapping
Associates users with lab IDs for tracking which lab ran tests:

```json
{
  "userLabMapping": {
    "john@company.com": "lab-west-coast",
    "jane@company.com": "lab-east-coast"
  }
}
```

### Test Stage Mapping
Renames test stages for cleaner output:

```json
{
  "testStageMapping": {
    "MyProject / Integration Tests Suite": "integration_tests",
    "MyProject / Component Tests Suite": "component_tests"
  }
}
```

## Typical Use Cases

1. **CI/CD Integration** - Feed test events into build pipelines
2. **Analytics Systems** - Import into data warehouses for analysis
3. **Test Reporting Dashboards** - Build custom visualizations
4. **Compliance Tracking** - Generate audit trails of test executions
5. **Performance Analysis** - Analyze test duration trends

## Clock Synchronization

### Three-Clock System

The tool manages synchronization between three different clocks:

1. **qTest Server Clock** - Timestamps in qTest API responses (`exe_start_date`, `exe_end_date`)
2. **Integration Runtime Clock** - The local machine running this tool
3. **Sealights BE Clock** - The Sealights backend server

### How It Works

#### Step 1: Calculate qTest Clock Drift
```
clockDriftMs = Integration Runtime Time - qTest Server Time
```

Example: If qTest reports a test started at `1703001234567` but Integration Runtime shows `1703001236801`:
```
clockDriftMs = 1703001236801 - 1703001234567 = 2234ms
```

#### Step 2: Get Sealights Clock Drift
Call Sealights sync API:
```
GET https://dev-staging.dev.sealights.co/api/sync?time={localTime}
Authorization: Bearer {sealights-token}
```

Response:
```json
{
  "data": {
    "slDriftMs": -567
  }
}
```

#### Step 3: Adjust All Timestamps
```
adjustedTime = originalQTestTime + clockDriftMs + slDriftMs
```

Using our example:
```
adjustedTime = 1703001234567 + 2234 + (-567) = 1703001236234
```

### Why This Matters

Different systems have slightly different clocks. When correlating test events with other systems (like CI/CD, build servers, or Sealights), accurate timestamps are critical. The three-way synchronization ensures:

- Test events are accurately timestamped relative to Sealights backend
- Clock drift is documented and visible in output files
- Historical data can be reprocessed if clock drift is discovered

### Implementation Details

**Efficiency:**
- qTest drift calculated once per test suite (uses first test log)
- Sealights drift fetched once per extraction run (cached)
- Timestamps adjusted in memory before writing to files

**Error Handling:**
- If Sealights sync fails, `slDriftMs = 0` (graceful degradation)
- If Sealights not configured, only qTest drift is calculated
- Warnings logged but extraction continues

**Output:**
```json
{
  "testStage": "integration_tests",
  "projectName": "MyProject",
  "clockDriftMs": 2234,      // qTest vs Integration Runtime
  "slDriftMs": -567,          // Integration Runtime vs Sealights BE
  "events": [
    {
      "localTime": 1703001236234  // Already adjusted by both drifts
    }
  ]
}
```

### Configuration

```json
{
  "sealights": {
    "token": "your-agent-token",
    "backendUrl": "https://dev-staging.dev.sealights.co"
  }
}
```

If `sealights` is omitted from config:
- `slDriftMs` will be `undefined` in output
- Only qTest clock drift is calculated
- Events use qTest timestamps adjusted by Integration Runtime drift only

## Technical Details

### API Endpoints Used
- `GET /api/v3/projects` - List projects
- `GET /api/v3/projects/{id}/test-suites` - List test suites
- `GET /api/v3/projects/{id}/test-runs` - List test runs
- `GET /api/v3/projects/{id}/test-runs/{id}/test-logs` - Get execution logs
- `GET /api/v3/projects/{id}/test-cases/{id}` - Get test details
- `GET /api/v3/users` - List users

### Authentication Methods
1. **OAuth** - Username/password + client credentials
2. **Bearer Token** - Long-lived API token

### Error Handling
- Graceful failure per test suite/project
- Continues processing even if one project fails
- Logs warnings for missing data
- Exits with error code only on critical failures

## Incremental Extraction

The tool supports incremental extraction:

1. Run initial extraction: `npm run extract -- --days 30`
2. New tests are executed
3. Run again: `npm run extract -- --days 7`
4. **Result**: Events are merged, sorted by time, duplicates handled

File merge logic:
- If file exists, load existing events
- Append new events
- Sort all events by `localTime`
- Write back to file

This allows for continuous extraction without data loss.

## Status Mapping

qTest statuses are mapped to three standard results:

| qTest Status | Event Result |
|--------------|--------------|
| Pass, Passed | `passed` |
| Fail, Failed | `failed` |
| Skip, Skipped, Blocked | `skipped` |
| Unknown | `passed` (default) |

## Performance Considerations

- Processes projects sequentially to avoid API rate limits
- Fetches users once at startup for efficiency
- Caches test case details during processing
- Writes files incrementally (doesn't hold all data in memory)

## Security Notes

- `config.json` is git-ignored (contains credentials)
- Example config provided without real credentials
- Credentials never logged or written to output
- All API calls use HTTPS

## Future Enhancements (Potential)

- [ ] Parallel project processing with rate limiting
- [ ] Resume capability for interrupted extractions
- [ ] Compressed output (gzip) for large datasets
- [ ] Direct database export option
- [ ] REST API mode for on-demand extraction
- [ ] Docker containerization
- [ ] Webhook receiver for real-time extraction

## Comparison to Original Webhook Integration

The original project had:
- **Webhook server** - Receives events from qTest
- **Real-time processing** - Events processed as they arrive
- **Clock drift compensation** - Adjusts for time differences

This tool has:
- **Polling extraction** - Queries qTest on demand
- **Batch processing** - Processes historical data
- **No clock drift** - Uses qTest timestamps directly

Both produce the same event format, but serve different purposes:
- **Webhook**: Real-time integration for CI/CD
- **OnPrem Tool**: Historical data extraction for analytics

