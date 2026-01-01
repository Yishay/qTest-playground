import { QTestClient } from './qtest-client';
import { AxiosInstance } from 'axios';

export interface ModuleNode {
  id: number;
  name: string;
  path: string[];
  parentId?: number;
  hasChildren: boolean;
  childCount?: number;
}

export interface ModuleHierarchy {
  id: number;
  name: string;
  testCases: any[];
  children: ModuleHierarchy[];
}

/**
 * Navigator for Test Design modules hierarchy
 */
export class ModuleNavigator {
  private client: QTestClient;
  private apiClient: AxiosInstance;

  constructor(client: QTestClient) {
    this.client = client;
    this.apiClient = (client as any).getApiClient();
  }

  /**
   * Get all root modules for a project
   */
  async getRootModules(projectId: number): Promise<ModuleNode[]> {
    try {
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/modules`
      );
      
      let modules = response.data || [];
      
      if (modules.length === 0) {
        console.log(`   No modules found in project`);
        return [];
      }
      
      // Build a map of all modules by ID
      const moduleMap = new Map<number, any>();
      modules.forEach((m: any) => {
        moduleMap.set(m.id, m);
      });
      
      // Find root modules (modules whose parent_id is not in the module list)
      // This means the parent is the project itself
      const rootModules = modules.filter((m: any) => {
        // If no parent_id or parent_id is 0, it's a root
        if (!m.parent_id || m.parent_id === 0) {
          return true;
        }
        // If parent_id exists but is not in our module list, it's a root
        // (parent is the project itself)
        return !moduleMap.has(m.parent_id);
      });
      
      // Sort modules
      const sortedModules = this.sortItems(rootModules);
      
      console.log(`   Found ${sortedModules.length} root module(s)`);
      
      const nodes: ModuleNode[] = [];
      for (const module of sortedModules) {
        const childCount = await this.countChildren(projectId, module.id);
        nodes.push({
          id: module.id,
          name: module.name,
          path: [module.name],
          parentId: module.parent_id,
          hasChildren: childCount > 0,
          childCount,
        });
      }
      
      return nodes;
    } catch (error: any) {
      console.error(`   Error fetching root modules: ${error.message}`);
      return [];
    }
  }

  /**
   * Get child modules of a parent module
   */
  async getChildModules(projectId: number, parentModule: ModuleNode): Promise<ModuleNode[]> {
    try {
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/modules`,
        { params: { parentId: parentModule.id } }
      );
      
      let modules = response.data || [];
      
      // Sort modules
      modules = this.sortItems(modules);
      
      console.log(`   Found ${modules.length} child module(s) under "${parentModule.name}"`);
      
      const nodes: ModuleNode[] = [];
      for (const module of modules) {
        const childCount = await this.countChildren(projectId, module.id);
        nodes.push({
          id: module.id,
          name: module.name,
          path: [...parentModule.path, module.name],
          parentId: module.parent_id,
          hasChildren: childCount > 0,
          childCount,
        });
      }
      
      return nodes;
    } catch (error: any) {
      console.error(`   Error fetching child modules: ${error.message}`);
      return [];
    }
  }

  /**
   * Count children modules
   */
  private async countChildren(projectId: number, moduleId: number): Promise<number> {
    try {
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/modules`,
        { params: { parentId: moduleId } }
      );
      
      const modules = response.data || [];
      return modules.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get the full module hierarchy starting from a module
   * This will be used to get all test cases in the module and its children
   */
  async getModuleHierarchy(projectId: number, moduleId: number): Promise<any> {
    try {
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/modules/${moduleId}`
      );
      return response.data;
    } catch (error: any) {
      console.error(`   Error fetching module hierarchy: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all test cases in a module (including descendants)
   */
  async getTestCasesInModule(
    projectId: number,
    moduleId: number,
    includeDescendants: boolean = true
  ): Promise<any[]> {
    if (!includeDescendants) {
      return this.getTestCasesInModuleDirect(projectId, moduleId);
    }
    
    // Recursively get all test cases from this module and all child modules
    const allTestCases: any[] = [];
    await this.collectTestCasesRecursively(projectId, moduleId, allTestCases);
    
    console.log(`   Found ${allTestCases.length} test case(s) in module hierarchy`);
    return allTestCases;
  }

  /**
   * Recursively collect test cases from a module and all its children
   */
  private async collectTestCasesRecursively(
    projectId: number,
    moduleId: number,
    allTestCases: any[],
    moduleName?: string
  ): Promise<void> {
    // Get test cases directly in this module
    const testCases = await this.getTestCasesInModuleDirect(projectId, moduleId, moduleName);
    allTestCases.push(...testCases);
    
    // Get child modules
    try {
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/modules`,
        { params: { parentId: moduleId } }
      );
      
      const childModules = response.data || [];
      
      // Recursively get test cases from each child module
      for (const childModule of childModules) {
        await this.collectTestCasesRecursively(
          projectId, 
          childModule.id, 
          allTestCases,
          childModule.name
        );
      }
    } catch (error: any) {
      // No child modules or error - that's okay
    }
  }

  /**
   * Get test cases directly in a module (not including children)
   */
  private async getTestCasesInModuleDirect(
    projectId: number,
    moduleId: number,
    moduleName?: string,
    includeUnapproved: boolean = true
  ): Promise<any[]> {
    try {
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/test-cases`,
        {
          params: {
            parentId: moduleId,
            parentType: 'module',
          },
        }
      );
      
      let testCases = response.data || [];
      
      // Handle paginated response
      if (testCases.items && Array.isArray(testCases.items)) {
        testCases = testCases.items;
      }
      
      const totalTestCases = testCases.length;
      
      // Filter by approval status if requested
      if (!includeUnapproved && testCases.length > 0) {
        testCases = testCases.filter((tc: any) => {
          // Check if test case has properties
          if (!tc.properties || !Array.isArray(tc.properties)) {
            return false; // Exclude if no properties
          }
          
          // Find the Status property
          const statusProp = tc.properties.find((prop: any) => 
            prop.field_name === 'Status'
          );
          
          // Only include if status is "Approved" (field_value typically "202" for Approved)
          // Check both field_value_name and typical approved field values
          const isApproved = statusProp && (
            statusProp.field_value_name === 'Approved' ||
            statusProp.field_value === '202' ||
            statusProp.field_value === 202
          );
          
          return isApproved;
        });
      }
      
      if (totalTestCases > 0) {
        const moduleLabel = moduleName ? `"${moduleName}"` : `ID ${moduleId}`;
        if (!includeUnapproved && testCases.length < totalTestCases) {
          const unapprovedCount = totalTestCases - testCases.length;
          console.log(`   Found ${totalTestCases} test case(s) in module ${moduleLabel} (${testCases.length} approved, ${unapprovedCount} unapproved - excluded)`);
        } else {
          console.log(`   Found ${testCases.length} test case(s) in module ${moduleLabel}`);
        }
      }
      
      return testCases;
    } catch (error: any) {
      const moduleLabel = moduleName ? `"${moduleName}"` : `ID ${moduleId}`;
      console.error(`   Error fetching test cases from module ${moduleLabel}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get full module hierarchy with test cases
   */
  async getModuleHierarchyWithTestCases(
    projectId: number,
    moduleId: number,
    moduleName: string,
    includeUnapproved: boolean = true
  ): Promise<ModuleHierarchy> {
    const hierarchy: ModuleHierarchy = {
      id: moduleId,
      name: moduleName,
      testCases: [],
      children: [],
    };

    // Get test cases in this module
    hierarchy.testCases = await this.getTestCasesInModuleDirect(
      projectId,
      moduleId,
      moduleName,
      includeUnapproved
    );

    // Get child modules
    try {
      const response = await this.apiClient.get(
        `/api/v3/projects/${projectId}/modules`,
        { params: { parentId: moduleId } }
      );

      let childModules = response.data || [];
      
      // Sort child modules to maintain the correct order
      childModules = this.sortItems(childModules);

      // Recursively build hierarchy for each child
      for (const childModule of childModules) {
        const childHierarchy = await this.getModuleHierarchyWithTestCases(
          projectId,
          childModule.id,
          childModule.name,
          includeUnapproved
        );
        hierarchy.children.push(childHierarchy);
      }
    } catch (error: any) {
      // No child modules - that's okay
    }

    return hierarchy;
  }

  /**
   * Format module path as string
   */
  formatPath(module: ModuleNode): string {
    return module.path.join(' / ');
  }

  /**
   * Sort items by order property
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

