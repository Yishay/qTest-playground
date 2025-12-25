# Clock Synchronization Feature

## Overview

The qTest OnPrem Tool implements a three-way clock synchronization system to ensure accurate timestamps when integrating test execution data with Sealights and other systems.

## The Three Clocks

### 1. qTest Server Clock
- Source: qTest API responses
- Fields: `exe_start_date`, `exe_end_date`
- Example: `"2024-12-24T10:30:45.123Z"`

### 2. Integration Runtime Clock
- Source: Local machine running the tool
- Obtained: `Date.now()`
- Used as the reference point for drift calculations

### 3. Sealights Backend (BE) Clock
- Source: Sealights cloud infrastructure
- Accessed via: `/api/sync` endpoint
- Returns drift relative to Integration Runtime

## How It Works

### Step 1: Calculate qTest Drift

```typescript
clockDriftMs = Date.now() - new Date(qTestTimestamp).getTime()
```

**Example:**
- qTest reports test started: `1703001234567` (Dec 19, 2023 10:20:34.567)
- Integration Runtime shows: `1703001236801` (Dec 19, 2023 10:20:36.801)
- **clockDriftMs = 2234ms** (Runtime is 2.2 seconds ahead)

### Step 2: Sync with Sealights

```bash
GET https://dev-staging.dev.sealights.co/api/sync?time=1703001236801
Authorization: Bearer {sealights-token}
```

**Response:**
```json
{
  "data": {
    "slDriftMs": -567
  }
}
```

This means Sealights BE is 567ms behind Integration Runtime.

### Step 3: Adjust Event Timestamps

```typescript
adjustedTime = originalQTestTime + clockDriftMs + slDriftMs
```

**Example Calculation:**
```
Original qTest time:  1703001234567
+ clockDriftMs:            + 2234
+ slDriftMs:                - 567
─────────────────────────────────
Adjusted time:        1703001236234
```

## Configuration

### With Sealights Integration

```json
{
  "qTestUrl": "https://your-qtest-instance.qtestnet.com/",
  "auth": { ... },
  "sealights": {
    "token": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9...",
    "backendUrl": "https://dev-staging.dev.sealights.co"
  }
}
```

### Without Sealights Integration

```json
{
  "qTestUrl": "https://your-qtest-instance.qtestnet.com/",
  "auth": { ... }
}
```

Clock sync still works, but only adjusts for qTest drift (no Sealights sync).

## Output Format

### With Sealights Configured

```json
{
  "testStage": "integration_tests",
  "projectName": "MyProject",
  "labId": "lab-west",
  "clockDriftMs": 2234,
  "slDriftMs": -567,
  "events": [
    {
      "type": "testStart",
      "testName": "Login Test",
      "externalId": "TC-001",
      "localTime": 1703001236234
    },
    {
      "type": "testEnd",
      "testName": "Login Test",
      "externalId": "TC-001",
      "result": "passed",
      "localTime": 1703001245890
    }
  ]
}
```

### Without Sealights Configured

```json
{
  "testStage": "integration_tests",
  "projectName": "MyProject",
  "labId": "lab-west",
  "clockDriftMs": 2234,
  "events": [...]
}
```

Note: `slDriftMs` is omitted when Sealights is not configured.

## Why This Matters

### Problem: Clock Skew

Real-world scenario:
1. Test runs on Lab Machine A at 10:00:00 AM
2. Lab machine reports to qTest at 10:00:02 AM (2s delay)
3. qTest stores timestamp as 10:00:02 AM
4. Integration Tool extracts at 10:05:00 AM
5. Sealights BE expects precise timing for correlation

Without sync: Events appear 2+ seconds off, causing correlation issues.

With sync: Events are adjusted to accurate Sealights BE time.

### Benefits

✅ **Accurate Correlation**: Events align with Sealights and CI/CD timestamps
✅ **Transparent**: Drift values visible in output for debugging
✅ **Resilient**: Gracefully degrades if Sealights unavailable
✅ **Efficient**: Syncs once per extraction, not per event
✅ **Optional**: Works with or without Sealights configuration

## Implementation Classes

### `ClockSync` (src/clock-sync.ts)

```typescript
class ClockSync {
  // Calculate qTest vs Runtime drift
  calculateQTestClockDrift(qTestTimestamp: string): number
  
  // Get Sealights vs Runtime drift (calls API, caches result)
  async getSealightsDrift(): Promise<number>
  
  // Adjust a timestamp with both drifts
  async adjustTimestamp(qTestTimestamp: string, clockDriftMs: number): Promise<number>
}
```

### `EventGenerator` (src/event-generator.ts)

Uses `ClockSync` to adjust timestamps when generating events:

```typescript
async generateEvents(...): Promise<TestStageOutput> {
  // Calculate qTest drift using first log
  const clockDriftMs = this.clockSync.calculateQTestClockDrift(firstLog.exe_start_date);
  
  // Get Sealights drift (async, cached)
  const slDriftMs = await this.clockSync.getSealightsDrift();
  
  // Adjust all event timestamps
  for (const log of testLogs) {
    const adjustedTime = await this.clockSync.adjustTimestamp(
      log.exe_start_date,
      clockDriftMs
    );
    // ... create event with adjustedTime
  }
}
```

## Error Handling

### Sealights API Unreachable

```
⚠️  Failed to sync with Sealights BE, using slDriftMs = 0
   Error: timeout of 5000ms exceeded
```

Tool continues with `slDriftMs = 0` (graceful degradation).

### Invalid Sealights Token

```
⚠️  Failed to sync with Sealights BE, using slDriftMs = 0
   Error: Request failed with status code 401
```

Tool continues with `slDriftMs = 0`.

### No Sealights Configuration

```
🕐 Syncing clock with Sealights BE...
   (skipped - Sealights not configured)
```

Only qTest drift is calculated and applied.

## API Contract

### Sealights Sync Endpoint

**Request:**
```
GET {backendUrl}/api/sync?time={localTime}
Authorization: Bearer {token}
```

**Parameters:**
- `localTime`: Current Unix timestamp in milliseconds (Integration Runtime)
- `token`: Sealights agent token

**Response:**
```json
{
  "data": {
    "slDriftMs": <integer>
  }
}
```

**slDriftMs Interpretation:**
- Positive: Sealights BE is ahead of Integration Runtime
- Negative: Sealights BE is behind Integration Runtime
- Zero: Clocks are synchronized

## Testing

### Manual Test

1. Configure Sealights in `config.json`
2. Run extraction: `npm run extract -- --days 1`
3. Check console output:
   ```
   🕐 Syncing clock with Sealights BE...
      Sealights drift: -567ms
   ```
4. Check output file for `slDriftMs` field
5. Verify event timestamps are adjusted

### Without Sealights

1. Remove `sealights` from `config.json`
2. Run extraction: `npm run extract -- --days 1`
3. Verify no Sealights sync attempted
4. Verify `slDriftMs` not present in output
5. Verify events still have adjusted timestamps (qTest drift only)

## Performance Considerations

- **One Sealights API call per extraction** (not per event or test suite)
- **Drift cached** for entire extraction run
- **Async operations** don't block data fetching
- **5-second timeout** prevents hanging on Sealights API

## Future Enhancements

- [ ] Periodic re-sync for long-running extractions
- [ ] Drift history tracking over time
- [ ] Automatic Sealights BE URL detection from token
- [ ] Drift threshold warnings (e.g., > 30 seconds)
- [ ] Support for multiple Sealights backends

