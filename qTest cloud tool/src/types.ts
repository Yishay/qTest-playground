// Configuration types
export interface QTestConfig {
  qTestUrl: string;
  auth: {
    username?: string;
    password?: string;
    clientCredentials?: string;
    bearerToken?: string;
  };
  sealights?: {
    token?: string;
    backendUrl?: string; // Optional, defaults to extracting from token
  };
  userLabMapping?: Record<string, string>;
  testStageMapping?: Record<string, string>;
  recommendations?: {
    skipStatusName?: string;
    enableMockMode?: boolean;
  };
}

// qTest API Response types
export interface QTestProject {
  id: number;
  name: string;
}

export interface QTestTestSuite {
  id: number;
  name: string;
  pid?: number;
  type?: string;
}

export interface QTestTestRun {
  id: number;
  name: string;
  test_suite_id?: number;
}

export interface QTestTestLog {
  id: number;
  test_step_log_id?: number;
  exe_start_date?: string;
  exe_end_date?: string;
  status?: {
    name: string;
  };
  user_id?: number;
  test_case_version_id?: number;
  test_case?: {
    id: number;
    name?: string;
  };
}

export interface QTestTestCase {
  id: number;
  name: string;
  external_id?: string;
}

export interface QTestUser {
  id: number;
  username: string;
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
}

// Event output types
export interface TestEvent {
  name: string;
  externalId: string;
  start: number;
  end: number;
  status: 'passed' | 'failed' | 'skipped';
}

export interface TestStageOutput {
  testStage: string;
  projectName: string;
  labId?: string;
  clockDriftMs: number;
  events: TestEvent[];
}

// Recommendations types
export interface SeaLightsRecommendationResponse {
  metadata: {
    appName: string;
    branchName: string;
    buildName: string;
    testStage: string;
    testGroupId: string;
    testSelectionEnabled: boolean;
    isFullRun: boolean;
    status: 'notReady' | 'noHistory' | 'ready' | 'error' | 'wontBeReady';
    fullRunReason?: string;
  };
  excludedTests: Array<{
    testName: string;
  }>;
}

export interface RecommendationResult {
  timestamp: string;
  project: string;
  projectId: number;
  testStage: string;
  user: string;
  labId?: string;
  path: string;
  skipStatus: string;
  sealightsMetadata: SeaLightsRecommendationResponse['metadata'];
  recommendations: Array<{
    testName: string;
    testRunId: number;
    applied: boolean;
    error?: string;
  }>;
  summary: {
    totalRecommendations: number;
    successfullyApplied: number;
    failed: number;
  };
}

export interface QTestStatus {
  id: number;
  name: string;
  color?: string;
}

export interface NavigationNode {
  type: 'project' | 'cycle' | 'suite' | 'folder';
  id: number;
  name: string;
  path: string[];
  hasTests: boolean;
  testRunCount?: number;
}

