import { QTestClient } from './qtest-client';
import { NavigationNode, QTestTestRun } from './types';
import { AxiosInstance } from 'axios';

export class HierarchyNavigator {
  private client: QTestClient;
  private apiClient: AxiosInstance;

  constructor(client: QTestClient) {
    this.client = client;
    this.apiClient = (client as any).getApiClient();
  }

  /**
   * Get all projects as navigation nodes
   */
  async getProjects(): Promise<NavigationNode[]> {
    const projects = await this.client.getProjects();
    
    const nodes: NavigationNode[] = [];
    for (const project of projects) {
      nodes.push({
        type: 'project',
        id: project.id,
        name: project.name,
        path: [project.name],
        hasTests: false, // Projects don't have direct tests
      });
    }
    
    return nodes;
  }

  /**
   * Get children of a navigation node (cycles, suites, etc.)
   */
  async getChildren(node: NavigationNode): Promise<NavigationNode[]> {
    const projectId = this.getProjectId(node);
    
    if (node.type === 'project') {
      return this.getProjectChildren(projectId, node.path);
    } else if (node.type === 'cycle') {
      return this.getCycleChildren(projectId, node.id, node.path);
    } else if (node.type === 'suite') {
      return this.getSuiteChildren(projectId, node.id, node.path);
    }
    
    return [];
  }

  /**
   * Get test runs for a specific node
   */
  async getTestRuns(node: NavigationNode): Promise<QTestTestRun[]> {
    const projectId = this.getProjectId(node);
    
    if (node.type === 'suite') {
      return this.client.getTestRuns(projectId, node.id);
    }
    
    return [];
  }

  /**
   * Get children at project level (releases, test-suites, and test-runs)
   * Supports both qTest Cloud (releases endpoint) and On-Prem (root cycles)
   */
  private async getProjectChildren(
    projectId: number,
    parentPath: string[]
  ): Promise<NavigationNode[]> {
    const children: NavigationNode[] = [];

    // 1. Try to get releases/root cycles (Cloud vs On-Prem support)
    let foundReleases = false;
    
    // Try Cloud approach first: GET /releases endpoint
    try {
      const releasesResponse = await this.apiClient.get(
        `/api/v3/projects/${projectId}/releases`
      );
      let releases = releasesResponse.data || [];
      
      if (releases.length > 0) {
        foundReleases = true;
        
        // Sort releases by order or id
        releases = this.sortItems(releases);
        
        console.log(`   Found ${releases.length} release(s)`);
        
        for (const release of releases) {
          children.push({
            type: 'cycle',
            id: release.id,
            name: release.name,
            path: [...parentPath, release.name],
            hasTests: false, // Releases don't have direct test runs
          });
        }
      }
    } catch (error: any) {
      // Releases endpoint might not exist or return empty in On-Prem
      console.log(`   No releases found via /releases endpoint`);
    }
    
    // If no releases found via Cloud approach, try On-Prem approach
    if (!foundReleases) {
      try {
        const rootCyclesResponse = await this.apiClient.get(
          `/api/v3/projects/${projectId}/test-cycles`,
          { params: { parentId: 0, parentType: 'root' } }
        );
        let rootCycles = rootCyclesResponse.data || [];
        
        if (rootCycles.length > 0) {
          // Sort cycles by order or id
          rootCycles = this.sortItems(rootCycles);
          
          console.log(`   Found ${rootCycles.length} root test cycle(s)`);
          
          for (const cycle of rootCycles) {
            children.push({
              type: 'cycle',
              id: cycle.id,
              name: cycle.name,
              path: [...parentPath, cycle.name],
              hasTests: false, // Cycles don't have direct test runs
            });
          }
        }
      } catch (error: any) {
        console.log(`   No root test cycles found: ${error.message}`);
      }
    }

    // 2. Get test suites at project level (not in releases)
    try {
      let suites = await this.client.getTestSuites(projectId);
      
      // Sort suites by order or id
      suites = this.sortItems(suites);
      
      console.log(`   Found ${suites.length} test suite(s) at project level`);
      
      for (const suite of suites) {
        const testRunCount = await this.countTestRuns(projectId, suite.id);
        console.log(`      Suite "${suite.name}": ${testRunCount} test run(s)`);
        children.push({
          type: 'suite',
          id: suite.id,
          name: suite.name,
          path: [...parentPath, suite.name],
          hasTests: testRunCount > 0,
          testRunCount,
        });
      }
    } catch (error: any) {
      console.log(`   Error fetching test suites: ${error.message}`);
    }

    console.log(`   Total children found: ${children.length}`);
    return children;
  }

  /**
   * Get children within a release or test cycle
   * For releases: get test cycles within the release
   * For test cycles: get BOTH child test cycles AND test suites
   * Order: test suites first, then nested test cycles (to match qTest UI)
   */
  private async getCycleChildren(
    projectId: number,
    cycleId: number,
    parentPath: string[]
  ): Promise<NavigationNode[]> {
    const children: NavigationNode[] = [];
    const childCycles: NavigationNode[] = [];
    const childSuites: NavigationNode[] = [];

    // 1. Try to get child test cycles (works for both releases and test cycles)
    // First try with 'release' parent type
    try {
      const cyclesResponse = await this.apiClient.get(
        `/api/v3/projects/${projectId}/test-cycles`,
        { params: { parentId: cycleId, parentType: 'release' } }
      );
      
      let cycles = cyclesResponse.data || [];
      if (cycles.length > 0) {
        // Sort cycles by order
        cycles = this.sortItems(cycles);
        
        console.log(`   Found ${cycles.length} test cycle(s) in release`);
        
        for (const cycle of cycles) {
          childCycles.push({
            type: 'cycle',
            id: cycle.id,
            name: cycle.name,
            path: [...parentPath, cycle.name],
            hasTests: false, // Test cycles themselves don't have direct tests
          });
        }
      }
    } catch (error: any) {
      // Silently handle - this is expected when there are no cycles at this level
    }

    // Also try with 'test-cycle' parent type (for nested test cycles)
    try {
      const cyclesResponse = await this.apiClient.get(
        `/api/v3/projects/${projectId}/test-cycles`,
        { params: { parentId: cycleId, parentType: 'test-cycle' } }
      );
      
      let cycles = cyclesResponse.data || [];
      if (cycles.length > 0) {
        // Sort cycles by order
        cycles = this.sortItems(cycles);
        
        console.log(`   Found ${cycles.length} child test cycle(s) in test cycle`);
        
        for (const cycle of cycles) {
          childCycles.push({
            type: 'cycle',
            id: cycle.id,
            name: cycle.name,
            path: [...parentPath, cycle.name],
            hasTests: false, // Test cycles themselves don't have direct tests
          });
        }
      }
    } catch (error: any) {
      // Silently handle - this is expected when there are no child cycles
    }

    // 2. Also get test suites at this level
    try {
      const suitesResponse = await this.apiClient.get(
        `/api/v3/projects/${projectId}/test-suites`,
        { params: { parentId: cycleId, parentType: 'test-cycle' } }
      );
      
      let suites = suitesResponse.data || [];
      if (suites.length > 0) {
        // Sort suites by order
        suites = this.sortItems(suites);
        
        console.log(`   Found ${suites.length} test suite(s) in test cycle`);
        
        for (const suite of suites) {
          const testRunCount = await this.countTestRuns(projectId, suite.id);
          console.log(`      Suite "${suite.name}": ${testRunCount} test run(s)`);
          childSuites.push({
            type: 'suite',
            id: suite.id,
            name: suite.name,
            path: [...parentPath, suite.name],
            hasTests: testRunCount > 0,
            testRunCount,
          });
        }
      }
    } catch (error: any) {
      // Silently handle - this is expected when there are no suites at this level
    }

    // Return test suites first, then nested test cycles (matches qTest UI order)
    return [...childSuites, ...childCycles];
  }

  /**
   * Get children within a test suite (sub-suites)
   */
  private async getSuiteChildren(
    projectId: number,
    suiteId: number,
    parentPath: string[]
  ): Promise<NavigationNode[]> {
    const children: NavigationNode[] = [];

    try {
      const suitesResponse = await this.apiClient.get(
        `/api/v3/projects/${projectId}/test-suites`,
        { params: { parentId: suiteId, parentType: 'test-suite' } }
      );
      
      let subSuites = suitesResponse.data || [];
      
      // Sort suites by order
      subSuites = this.sortItems(subSuites);
      
      console.log(`   Found ${subSuites.length} sub-suite(s)`);
      
      for (const suite of subSuites) {
        const testRunCount = await this.countTestRuns(projectId, suite.id);
        console.log(`      Sub-suite "${suite.name}": ${testRunCount} test run(s)`);
        children.push({
          type: 'suite',
          id: suite.id,
          name: suite.name,
          path: [...parentPath, suite.name],
          hasTests: testRunCount > 0,
          testRunCount,
        });
      }
    } catch (error: any) {
      console.log(`   Error fetching sub-suites: ${error.message}`);
    }

    return children;
  }

  /**
   * Count test runs in a test suite
   */
  private async countTestRuns(projectId: number, suiteId: number): Promise<number> {
    try {
      const testRuns = await this.client.getTestRuns(projectId, suiteId);
      return testRuns.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract project ID from navigation node path
   */
  private getProjectId(node: NavigationNode): number {
    // For project nodes, the ID is already the project ID
    if (node.type === 'project') {
      return node.id;
    }
    
    // For other nodes, we need to track the project ID separately
    // This will be handled by storing projectId in the node during navigation
    return (node as any).projectId || node.id;
  }

  /**
   * Format path as string
   */
  formatPath(node: NavigationNode): string {
    return node.path.join(' / ');
  }

  /**
   * Sort items by order property (as shown in qTest UI)
   * Falls back to id if order is not available
   */
  private sortItems(items: any[]): any[] {
    return items.sort((a, b) => {
      // First try to sort by 'order' property
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      
      // Fallback to 'pid' (position ID) if available
      if (a.pid !== undefined && b.pid !== undefined) {
        return a.pid - b.pid;
      }
      
      // Fallback to id
      if (a.id !== undefined && b.id !== undefined) {
        return a.id - b.id;
      }
      
      // Last resort: alphabetical by name
      if (a.name && b.name) {
        return a.name.localeCompare(b.name);
      }
      
      return 0;
    });
  }
}

