import * as fs from 'fs';
import * as path from 'path';
import { TestStageOutput } from './types';

export class FileManager {
  private outputDir: string;

  constructor(outputDir: string = 'output') {
    this.outputDir = outputDir;
    this.ensureOutputDirectory();
  }

  /**
   * Ensure the output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate a safe filename from test stage and project name
   */
  private generateFileName(testStage: string, projectName: string): string {
    // Combine test stage and project name, sanitize for filename
    const combined = `${projectName}___${testStage}`;
    const safe = combined
      .replace(/[^a-zA-Z0-9_\-\s]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    return `${safe}.json`;
  }

  /**
   * Write test stage output to a JSON file
   */
  async writeTestStageOutput(output: TestStageOutput): Promise<string> {
    const fileName = this.generateFileName(output.testStage, output.projectName);
    const filePath = path.join(this.outputDir, fileName);

    // Check if file exists and merge events if it does
    if (fs.existsSync(filePath)) {
      const existingContent = fs.readFileSync(filePath, 'utf-8');
      const existingOutput: TestStageOutput = JSON.parse(existingContent);
      
      // Merge events and sort by start time
      const mergedEvents = [...existingOutput.events, ...output.events];
      mergedEvents.sort((a, b) => a.start - b.start);
      
      output.events = mergedEvents;
    }

    // Write the output
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
    
    return filePath;
  }

  /**
   * Write a summary of all extracted data
   */
  async writeSummary(outputs: TestStageOutput[]): Promise<string> {
    const summary = {
      extractedAt: new Date().toISOString(),
      totalTestStages: outputs.length,
      totalEvents: outputs.reduce((sum, output) => sum + output.events.length, 0),
      testStages: outputs.map(output => ({
        testStage: output.testStage,
        projectName: output.projectName,
        labId: output.labId,
        eventCount: output.events.length,
      })),
    };

    const filePath = path.join(this.outputDir, '_summary.json');
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');
    
    return filePath;
  }

  /**
   * Get the output directory path
   */
  getOutputDir(): string {
    return this.outputDir;
  }
}

