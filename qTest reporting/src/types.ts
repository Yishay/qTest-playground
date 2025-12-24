// Configuration types
export interface Config {
  qTestUrl: string;
  auth: AuthConfig;
}

export interface AuthConfig {
  // Option 1: Username/password authentication (OAuth)
  username?: string;
  password?: string;
  clientCredentials?: string; // Base64 encoded client credentials for OAuth

  // Option 2: Direct bearer token authentication
  bearerToken?: string;
}

// OAuth response
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

// qTest Project
export interface QTestProject {
  id: number;
  name: string;
  description?: string;
  status_id?: number;
  start_date?: string;
  end_date?: string;
}

// qTest User
export interface QTestUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
}

// qTest API response types
export interface QTestTestSuite {
  id: number;
  name: string;
  pid: string;
  parent_id: number | null;
  description?: string;
  created_date?: string;
  last_modified_date?: string;
}

export interface QTestTestRun {
  id: number;
  name: string;
  pid: string;
  test_case_id?: number;
  testCaseId?: number;
  test_suite_id?: number;
  parentId?: number;
  parent_id?: number;
  created_date: string;
  last_modified_date: string;
  properties?: QTestProperty[];
  links?: QTestLink[];
}

export interface QTestTestLog {
  id: number;
  test_run_id: number;
  test_case_version_id: number;
  exe_start_date: string;
  exe_end_date: string;
  status: QTestStatus;
  name?: string;
  note?: string;
  submitted_by?: string;
  submitted_date?: string;
  test_case?: QTestTestCaseReference;
  user_id?: number;
  properties?: QTestProperty[];
}

export interface QTestTestCaseReference {
  id: number;
  name: string;
  pid: string;
}

export interface QTestStatus {
  id: number;
  name: string;
}

export interface QTestProperty {
  field_id: number;
  field_name: string;
  field_value: string | number | boolean;
}

export interface QTestLink {
  rel: string;
  href: string;
}

