#!/usr/bin/env node

import { loadConfig } from './config';
import { QTestClient } from './qtest-client';

/**
 * List all available projects
 */
async function main() {
  try {
    console.log('========================================');
    console.log('qTest Projects List');
    console.log('========================================\n');

    // Load configuration
    const config = loadConfig();
    const qTestClient = new QTestClient(config);

    // Get all projects
    const projects = await qTestClient.getProjects();
    
    console.log(`\nFound ${projects.length} project(s):\n`);
    
    for (const project of projects) {
      console.log(`${project.id}: ${project.name}`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

