import { QTestClient } from './qtest-client';
import { loadConfig } from './config';

async function checkProjects() {
  const config = loadConfig();
  console.log(`\nConnecting to: ${config.qTestUrl}\n`);
  
  const client = new QTestClient(config);
  const projects = await client.getProjects();
  
  console.log(`Found ${projects.length} projects:\n`);
  for (const project of projects) {
    console.log(`  ${project.id.toString().padStart(6)} - ${project.name}`);
  }
  console.log();
}

if (require.main === module) {
  checkProjects()
    .then(() => process.exit(0))
    .catch(err => { 
      console.error(err); 
      process.exit(1); 
    });
}

