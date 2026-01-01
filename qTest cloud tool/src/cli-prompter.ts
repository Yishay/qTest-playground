import * as readline from 'readline';

export class CLIPrompter {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Ask a question and get user input
   */
  async ask(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Present a list of options and get user selection
   */
  async selectFromList<T>(
    title: string,
    items: T[],
    formatter: (item: T, index: number) => string
  ): Promise<T> {
    console.log(`\n${title}`);
    
    items.forEach((item, index) => {
      console.log(`  ${formatter(item, index + 1)}`);
    });
    
    while (true) {
      const answer = await this.ask(`\n  Enter selection (1-${items.length}): `);
      const selection = parseInt(answer, 10);
      
      if (!isNaN(selection) && selection >= 1 && selection <= items.length) {
        return items[selection - 1];
      }
      
      console.log(`  ❌ Invalid selection. Please enter a number between 1 and ${items.length}.`);
    }
  }

  /**
   * Ask for confirmation (yes/no)
   */
  async confirm(message: string): Promise<boolean> {
    while (true) {
      const answer = await this.ask(`${message} (yes/no): `);
      const normalized = answer.toLowerCase();
      
      if (normalized === 'yes' || normalized === 'y') {
        return true;
      } else if (normalized === 'no' || normalized === 'n') {
        return false;
      }
      
      console.log('  ❌ Please answer "yes" or "no".');
    }
  }

  /**
   * Display a header
   */
  displayHeader(title: string): void {
    console.log('\n========================================');
    console.log(title);
    console.log('========================================\n');
  }

  /**
   * Display a section header
   */
  displaySection(title: string): void {
    console.log(`\n${title}`);
  }

  /**
   * Display success message
   */
  success(message: string): void {
    console.log(`✅ ${message}`);
  }

  /**
   * Display error message
   */
  error(message: string): void {
    console.log(`❌ ${message}`);
  }

  /**
   * Display warning message
   */
  warning(message: string): void {
    console.log(`⚠️  ${message}`);
  }

  /**
   * Display info message
   */
  info(message: string): void {
    console.log(`ℹ️  ${message}`);
  }

  /**
   * Close the readline interface
   */
  close(): void {
    this.rl.close();
  }
}

