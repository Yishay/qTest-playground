import * as fs from 'fs';
import * as path from 'path';
import { QTestConfig, QTestStatus } from './types';
import { RecommendationsApplier } from './recommendations-applier';
import { CLIPrompter } from './cli-prompter';

export class StatusValidator {
  private applier: RecommendationsApplier;
  private prompter: CLIPrompter;
  private configPath: string;

  constructor(
    applier: RecommendationsApplier,
    prompter: CLIPrompter,
    configPath: string = 'config.json'
  ) {
    this.applier = applier;
    this.prompter = prompter;
    this.configPath = configPath;
  }

  /**
   * Validate that the configured skip status exists
   * If not, prompt user to select one and save to config
   */
  async validateAndGetStatus(
    projectId: number,
    config: QTestConfig
  ): Promise<{ status: QTestStatus; statusName: string }> {
    const desiredStatusName =
      config.recommendations?.skipStatusName || 'SL Skipped';

    console.log('\n🔍 Validating qTest status configuration...');

    // Try to find the status
    const status = await this.applier.findStatusByName(
      projectId,
      desiredStatusName
    );

    if (status) {
      this.prompter.success(
        `Found status "${status.name}" (ID: ${status.id})`
      );
      return { status, statusName: status.name };
    }

    // Status not found, let user select one
    this.prompter.error(`Status "${desiredStatusName}" not found in project.`);

    const availableStatuses = await this.applier.getAvailableStatuses(
      projectId
    );

    if (availableStatuses.length === 0) {
      throw new Error('No test run statuses found in project');
    }

    const selectedStatus = await this.prompter.selectFromList(
      '\nAvailable test run statuses:',
      availableStatuses,
      (status, index) => `${index}. ${status.name}`
    );

    console.log(
      `\n✅ Selected "${selectedStatus.name}" - saving to config.json for future use.`
    );

    // Save to config
    await this.updateConfigWithStatus(selectedStatus.name);

    // Show recommendation
    this.prompter.warning(
      'RECOMMENDATION: Create a dedicated "SL Skipped" status in qTest and map it to PASS'
    );
    console.log(
      '   in Automation Settings to prevent repeated recommendations.\n'
    );

    return { status: selectedStatus, statusName: selectedStatus.name };
  }

  /**
   * Update config.json with the selected status
   */
  private async updateConfigWithStatus(statusName: string): Promise<void> {
    try {
      const configFullPath = path.join(process.cwd(), this.configPath);
      const configContent = fs.readFileSync(configFullPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Ensure recommendations object exists
      if (!config.recommendations) {
        config.recommendations = {};
      }

      // Update skip status name
      config.recommendations.skipStatusName = statusName;
      config.recommendations.enableMockMode = config.recommendations.enableMockMode ?? true;

      // Write back to file with pretty formatting
      fs.writeFileSync(
        configFullPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('⚠️  Failed to update config.json:', error);
      console.log('   Please manually add the following to your config.json:');
      console.log('   "recommendations": {');
      console.log(`     "skipStatusName": "${statusName}",`);
      console.log('     "enableMockMode": true');
      console.log('   }');
    }
  }
}

