import * as fs from 'fs';
import * as path from 'path';
import { SeaLightsRecommendationResponse } from './types';

export interface RecommendationRequest {
  projectName: string;
  testStage: string;
  labId?: string;
  userEmail: string;
  testRuns: Array<{
    testRunId: number;
    testName: string;
  }>;
}

export class SeaLightsClient {
  private mockMode: boolean;
  private mockFilePath: string;

  constructor(mockMode: boolean = true) {
    this.mockMode = mockMode;
    this.mockFilePath = path.join(process.cwd(), 'mock-recommendations.json');
  }

  /**
   * Get test recommendations from SeaLights
   * In mock mode, loads from mock-recommendations.json
   * In production mode, calls SeaLights API
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<SeaLightsRecommendationResponse> {
    if (this.mockMode) {
      return this.getMockRecommendations(request);
    } else {
      return this.getRealRecommendations(request);
    }
  }

  /**
   * Load recommendations from mock file
   */
  private getMockRecommendations(
    request: RecommendationRequest
  ): SeaLightsRecommendationResponse {
    try {
      // Check if mock file exists
      if (!fs.existsSync(this.mockFilePath)) {
        console.log(`⚠️  Mock file not found: ${this.mockFilePath}`);
        console.log('Creating default mock file...');
        this.createDefaultMockFile();
      }

      // Read and parse mock file
      const mockData = fs.readFileSync(this.mockFilePath, 'utf-8');
      const response: SeaLightsRecommendationResponse = JSON.parse(mockData);

      // Update metadata with request details
      response.metadata = {
        ...response.metadata,
        appName: request.projectName,
        testStage: request.testStage,
      };

      return response;
    } catch (error) {
      console.error(`❌ Error reading mock recommendations file: ${error}`);
      throw new Error('Failed to load mock recommendations');
    }
  }

  /**
   * Get recommendations from real SeaLights API
   * TODO: Implement when ready to connect to real API
   */
  private async getRealRecommendations(
    request: RecommendationRequest
  ): Promise<SeaLightsRecommendationResponse> {
    // TODO: Implement real SeaLights API call
    throw new Error('Real SeaLights API not yet implemented. Use mock mode.');
  }

  /**
   * Create a default mock file if it doesn't exist
   */
  private createDefaultMockFile(): void {
    const defaultMock: SeaLightsRecommendationResponse = {
      metadata: {
        appName: 'SampleApp',
        branchName: 'main',
        buildName: 'build-123',
        testStage: 'Regression',
        testGroupId: 'group-1',
        testSelectionEnabled: true,
        isFullRun: false,
        status: 'ready',
      },
      excludedTests: [
        {
          testName: 'Some Test',
        },
        {
          testName: 'Another Test',
        },
      ],
    };

    fs.writeFileSync(
      this.mockFilePath,
      JSON.stringify(defaultMock, null, 2),
      'utf-8'
    );
    console.log(`✅ Created default mock file: ${this.mockFilePath}`);
  }

  /**
   * Match test runs with excluded tests from SeaLights
   * Returns array of test run IDs that should be skipped
   */
  matchTestRuns(
    testRuns: Array<{ testRunId: number; testName: string }>,
    response: SeaLightsRecommendationResponse
  ): Array<{ testRunId: number; testName: string }> {
    const excludedTestNames = new Set(
      response.excludedTests.map((t) => t.testName)
    );

    return testRuns.filter((testRun) =>
      excludedTestNames.has(testRun.testName)
    );
  }
}

