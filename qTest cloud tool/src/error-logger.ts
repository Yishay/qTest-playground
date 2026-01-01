import * as fs from 'fs';
import * as path from 'path';

/**
 * Error logger that writes to file without console output
 */
export class ErrorLogger {
  private logFilePath: string;
  private errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    context?: string;
    details?: any;
  }> = [];

  constructor(logFileName: string = 'bulk-import-errors.log') {
    const outputDir = path.join(process.cwd(), 'output');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    this.logFilePath = path.join(outputDir, logFileName);
    
    // Clear previous log file
    if (fs.existsSync(this.logFilePath)) {
      fs.unlinkSync(this.logFilePath);
    }
  }

  /**
   * Log an error silently (no console output)
   */
  logError(type: string, message: string, context?: string, details?: any): void {
    const error = {
      timestamp: new Date().toISOString(),
      type,
      message,
      context,
      details: this.sanitizeDetails(details),
    };
    
    this.errors.push(error);
    this.writeToFile(error);
  }

  /**
   * Log a version approval error
   */
  logVersionError(testName: string, testRunId: number, versionId: number, error: any): void {
    this.logError(
      'VERSION_NOT_APPROVED',
      `Test case version not approved`,
      `Test: ${testName} (Run ID: ${testRunId})`,
      {
        testRunId,
        versionId,
        errorMessage: error.message,
        statusCode: error.response?.status,
      }
    );
  }

  /**
   * Log a test run creation error
   */
  logTestRunCreationError(testName: string, suiteName: string, error: any): void {
    this.logError(
      'TEST_RUN_CREATION_FAILED',
      `Failed to create test run`,
      `Test: ${testName}, Suite: ${suiteName}`,
      {
        testName,
        suiteName,
        errorMessage: error.message,
        statusCode: error.response?.status,
        errorData: error.response?.data,
      }
    );
  }

  /**
   * Log a hierarchy creation error
   */
  logHierarchyCreationError(itemType: string, itemName: string, error: any): void {
    this.logError(
      'HIERARCHY_CREATION_FAILED',
      `Failed to create ${itemType}`,
      `${itemType}: ${itemName}`,
      {
        itemType,
        itemName,
        errorMessage: error.message,
        statusCode: error.response?.status,
        errorData: error.response?.data,
      }
    );
  }

  /**
   * Get error summary
   */
  getSummary(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const error of this.errors) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }
    
    return {
      total: this.errors.length,
      byType,
    };
  }

  /**
   * Get log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Sanitize error details to avoid circular references and large objects
   */
  private sanitizeDetails(details: any): any {
    if (!details) return undefined;
    
    try {
      // Convert to JSON and back to remove circular references
      return JSON.parse(JSON.stringify(details, (key, value) => {
        // Limit string length
        if (typeof value === 'string' && value.length > 500) {
          return value.substring(0, 500) + '... (truncated)';
        }
        return value;
      }));
    } catch (e) {
      return { error: 'Could not serialize details' };
    }
  }

  /**
   * Write error to file
   */
  private writeToFile(error: any): void {
    try {
      const line = this.formatErrorLine(error);
      fs.appendFileSync(this.logFilePath, line + '\n', 'utf-8');
    } catch (e) {
      // Silently fail - we don't want to break the flow if logging fails
    }
  }

  /**
   * Format error as a single line for the log file
   */
  private formatErrorLine(error: any): string {
    let line = `[${error.timestamp}] ${error.type}: ${error.message}`;
    
    if (error.context) {
      line += ` | Context: ${error.context}`;
    }
    
    if (error.details) {
      const detailsStr = JSON.stringify(error.details);
      if (detailsStr.length < 200) {
        line += ` | Details: ${detailsStr}`;
      } else {
        line += ` | Details: ${detailsStr.substring(0, 200)}... (see full log)`;
      }
    }
    
    return line;
  }

  /**
   * Write final summary to log file
   */
  writeSummary(): void {
    if (!this.hasErrors()) return;
    
    const summary = this.getSummary();
    const summaryText = `\n${'='.repeat(80)}\nERROR SUMMARY\n${'='.repeat(80)}\n` +
      `Total errors: ${summary.total}\n\n` +
      `Breakdown by type:\n` +
      Object.entries(summary.byType)
        .map(([type, count]) => `  - ${type}: ${count}`)
        .join('\n') +
      `\n${'='.repeat(80)}\n`;
    
    try {
      fs.appendFileSync(this.logFilePath, summaryText, 'utf-8');
    } catch (e) {
      // Silently fail
    }
  }
}

