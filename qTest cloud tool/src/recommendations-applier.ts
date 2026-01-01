import { QTestClient } from './qtest-client';
import { QTestStatus } from './types';
import { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface ApplyResult {
  testRunId: number;
  testName: string;
  applied: boolean;
  error?: string;
}

export class RecommendationsApplier {
  private client: QTestClient;
  private apiClient: AxiosInstance;
  private statusFieldIdCache: Map<number, number> = new Map();

  constructor(client: QTestClient) {
    this.client = client;
    this.apiClient = (client as any).getApiClient();
  }

  /**
   * Get all available test run statuses for a project
   */
  async getAvailableStatuses(projectId: number): Promise<QTestStatus[]> {
    try {
      // qTest Cloud uses settings/test-runs/fields endpoint
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/settings/test-runs/fields`
      );
      
      const fields = response.data || [];
      
      // Find the Status field
      const statusField = fields.find((field: any) => 
        field.label === 'Status' || field.original_name === 'StatusTestRun'
      );
      
      if (!statusField || !statusField.allowed_values) {
        throw new Error('Status field not found or has no allowed values');
      }
      
      // Cache the status field ID for later use in updates
      this.statusFieldIdCache.set(projectId, statusField.id);
      
      // Map allowed_values to QTestStatus format
      return statusField.allowed_values
        .filter((v: any) => v.is_active)
        .map((v: any) => ({
          id: v.value,
          name: v.label,
          color: v.color,
        }));
    } catch (error) {
      console.error('Error fetching test run statuses:', error);
      throw error;
    }
  }

  /**
   * Find a status by name
   */
  async findStatusByName(
    projectId: number,
    statusName: string
  ): Promise<QTestStatus | null> {
    const statuses = await this.getAvailableStatuses(projectId);
    const found = statuses.find(
      (s) => s.name.toLowerCase() === statusName.toLowerCase()
    );
    return found || null;
  }

  /**
   * Apply skip status to multiple test runs
   */
  async applySkipStatus(
    projectId: number,
    testRuns: Array<{ testRunId: number; testName: string; testCaseVersionId?: number }>,
    statusId: number,
    errorLogger?: any
  ): Promise<ApplyResult[]> {
    const results: ApplyResult[] = [];

    for (const testRun of testRuns) {
      try {
        await this.updateTestRunStatus(projectId, testRun.testRunId, statusId, testRun.testCaseVersionId);
        results.push({
          testRunId: testRun.testRunId,
          testName: testRun.testName,
          applied: true,
        });
      } catch (error: any) {
        // Log error silently to file if logger provided
        if (errorLogger) {
          errorLogger.logVersionError(
            testRun.testName,
            testRun.testRunId,
            testRun.testCaseVersionId || 0,
            error
          );
        }
        results.push({
          testRunId: testRun.testRunId,
          testName: testRun.testName,
          applied: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Update a single test run status by submitting a test log
   */
  private async updateTestRunStatus(
    projectId: number,
    testRunId: number,
    statusId: number,
    providedTestCaseVersionId?: number
  ): Promise<void> {
    try {
      let testCaseVersionId = providedTestCaseVersionId;
      
      // If test case version ID not provided, fetch it from the test run
      if (!testCaseVersionId) {
        const testRunResponse = await this.apiClient.get(
          `/api/v3/projects/${projectId}/test-runs/${testRunId}`
        );
        
        testCaseVersionId = testRunResponse.data.test_case_version_id;
        
        if (!testCaseVersionId) {
          throw new Error(`Test run ${testRunId} has no test case version`);
        }
      }

      // qTest Cloud updates test run status by submitting a test log
      // Must include test_case_version_id for approved version
      const testLog = {
        status: {
          id: statusId
        },
        exe_start_date: new Date().toISOString(),
        exe_end_date: new Date().toISOString(),
        test_case_version_id: testCaseVersionId
      };

      await this.apiClient.post(
        `/api/v3/projects/${projectId}/test-runs/${testRunId}/test-logs`,
        testLog
      );
    } catch (error) {
      // Don't log to console - errors are logged by the caller via ErrorLogger
      throw error;
    }
  }

  /**
   * Save results to output file
   */
  async saveResults(
    results: any,
    outputDir: string = 'output'
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recommendations_${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Write file
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2), 'utf-8');

    return filepath;
  }
}

