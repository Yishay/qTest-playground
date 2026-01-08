import axios, { AxiosInstance } from 'axios';
import { QTestAuth } from './auth';
import {
  Config,
  QTestProject,
  QTestUser,
  QTestTestSuite,
  QTestTestRun,
  QTestTestLog,
} from './types';

export class QTestClient {
  private qTestUrl: string;
  private auth: QTestAuth;
  private client: AxiosInstance;

  constructor(config: Config) {
    this.qTestUrl = config.qTestUrl;
    this.auth = new QTestAuth(config.qTestUrl, config.auth);

    this.client = axios.create({
      baseURL: config.qTestUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add interceptor to inject auth token
    this.client.interceptors.request.use(async (requestConfig) => {
      const token = await this.auth.getAccessToken();
      requestConfig.headers.Authorization = `Bearer ${token}`;
      return requestConfig;
    });
  }

  /**
   * Get all projects the user has access to
   */
  async getProjects(): Promise<QTestProject[]> {
    const response = await this.client.get<QTestProject[]>('/api/v3/projects');
    return response.data;
  }

  /**
   * Get all Test-Suites for a specific project
   */
  async getTestSuites(projectId: number): Promise<QTestTestSuite[]> {
    const response = await this.client.get<QTestTestSuite[]>(
      `/api/v3/projects/${projectId}/test-suites`
    );
    return response.data;
  }

  /**
   * Get all Test-Logs for a specific Test-Run
   */
  async getTestLogsForRun(projectId: number, testRunId: number): Promise<QTestTestLog[]> {
    const response = await this.client.get(
      `/api/v3/projects/${projectId}/test-runs/${testRunId}/test-logs`
    );
    
    // Handle paginated response format
    if (response.data && Array.isArray(response.data.items)) {
      return response.data.items;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  }

  /**
   * Get Test-Logs for a project with optional date range filtering
   * This is more efficient than traversing the hierarchy when you need all logs
   */
  async getTestLogsForProject(
    projectId: number,
    startDate?: Date,
    endDate?: Date,
    pageSize: number = 999
  ): Promise<QTestTestLog[]> {
    const params: any = {
      pageSize,
      page: 1,
    };

    // Add date filters if provided
    if (startDate) {
      params.exe_start_date = startDate.toISOString();
    }
    if (endDate) {
      params.exe_end_date = endDate.toISOString();
    }

    const response = await this.client.get(
      `/api/v3/projects/${projectId}/test-logs`,
      { params }
    );

    // Handle paginated response format
    if (response.data && Array.isArray(response.data.items)) {
      return response.data.items;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  /**
   * Get all users in the system
   */
  async getUsers(): Promise<QTestUser[]> {
    const response = await this.client.get<QTestUser[]>('/api/v3/users');
    return response.data;
  }

  /**
   * Get Test-Runs for a test suite with optional date range filtering
   */
  async getTestRunsForSuite(
    projectId: number,
    testSuiteId: number,
    startDate?: Date,
    endDate?: Date,
    pageSize: number = 100
  ): Promise<QTestTestRun[]> {
    const params: any = {
      parentId: testSuiteId,
      parentType: 'test-suite',
      pageSize,
    };

    // Add date filters if provided (filters by execution date)
    if (startDate) {
      params.exe_start_date = startDate.toISOString();
    }
    if (endDate) {
      params.exe_end_date = endDate.toISOString();
    }

    const response = await this.client.get(
      `/api/v3/projects/${projectId}/test-runs`,
      { params }
    );

    // Handle paginated response format
    if (response.data && Array.isArray(response.data.items)) {
      return response.data.items;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  /**
   * Get a Test Case by ID
   */
  async getTestCase(projectId: number, testCaseId: number): Promise<{ id: number; name: string }> {
    const response = await this.client.get(
      `/api/v3/projects/${projectId}/test-cases/${testCaseId}`
    );
    return response.data;
  }

  /**
   * Get the raw Axios client for advanced queries
   */
  getApiClient(): AxiosInstance {
    return this.client;
  }
}

