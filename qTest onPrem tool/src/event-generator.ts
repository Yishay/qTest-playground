import {
  QTestTestLog,
  QTestTestCase,
  TestEvent,
  TestStageOutput,
  QTestConfig,
} from './types';
import { ClockSync } from './clock-sync';

export class EventGenerator {
  private config: QTestConfig;
  private testStageMapping: Record<string, string>;
  private userLabMapping: Record<string, string>;
  private clockSync: ClockSync;

  constructor(config: QTestConfig) {
    this.config = config;
    this.testStageMapping = config.testStageMapping || {};
    this.userLabMapping = config.userLabMapping || {};
    this.clockSync = new ClockSync(config);
  }

  /**
   * Convert test logs to event-based output with clock synchronization
   */
  async generateEvents(
    testLogs: Array<{
      log: QTestTestLog;
      testCase: QTestTestCase;
      userEmail: string;
    }>,
    projectName: string,
    testSuiteName: string,
    apiClient: any
  ): Promise<TestStageOutput> {
    const events: TestEvent[] = [];

    // Calculate clock drift between qTest and Sealights
    const clockDriftMs = await this.clockSync.calculateClockDrift(apiClient);

    for (const { log, testCase } of testLogs) {
      const name = testCase.name;
      const externalId = testCase.external_id || testCase.id.toString();
      const status = this.mapStatus(log.status?.name);

      // Generate single event with start/end times
      if (log.exe_start_date && log.exe_end_date) {
        const start = this.clockSync.adjustTimestamp(log.exe_start_date, clockDriftMs);
        const end = this.clockSync.adjustTimestamp(log.exe_end_date, clockDriftMs);
        
        events.push({
          name,
          externalId,
          start,
          end,
          status,
        });
      }
    }

    // Sort events by start time
    events.sort((a, b) => a.start - b.start);

    // Determine test stage (apply mapping if configured)
    const originalTestStage = `${projectName} / ${testSuiteName}`;
    const testStage = this.testStageMapping[originalTestStage] || testSuiteName;

    // Determine lab ID (use first user's email if available)
    const firstUserEmail = testLogs.length > 0 ? testLogs[0].userEmail : undefined;
    const labId = firstUserEmail ? this.userLabMapping[firstUserEmail] : undefined;

    return {
      testStage,
      projectName,
      labId,
      clockDriftMs,
      events,
    };
  }

  /**
   * Map qTest status to event result
   */
  private mapStatus(status: string | undefined): 'passed' | 'failed' | 'skipped' {
    if (!status) return 'skipped';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('pass')) return 'passed';
    if (statusLower.includes('fail')) return 'failed';
    if (statusLower.includes('skip') || statusLower.includes('block')) return 'skipped';
    
    // Default to passed for unknown statuses
    return 'passed';
  }
}

