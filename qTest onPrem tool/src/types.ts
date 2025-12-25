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

