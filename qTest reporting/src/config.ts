import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

const CONFIG_FILE_NAME = 'config.json';

export function loadConfig(): Config {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE_NAME);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found at ${configPath}. Please create a config.json file based on config.example.json`
    );
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(configContent);

  validateConfig(config);

  return config;
}

function validateConfig(config: Config): void {
  // Validate qTestUrl
  if (!config.qTestUrl || typeof config.qTestUrl !== 'string' || !config.qTestUrl.startsWith('http')) {
    throw new Error('qTestUrl must be a valid URL starting with http:// or https://');
  }

  // Validate auth
  if (!config.auth) {
    throw new Error('auth configuration is required');
  }

  // Check for valid authentication method
  const hasBearerToken = config.auth.bearerToken && typeof config.auth.bearerToken === 'string';
  const hasUsernamePassword = config.auth.username && config.auth.password && config.auth.clientCredentials;

  if (!hasBearerToken && !hasUsernamePassword) {
    throw new Error(
      'auth configuration must include either:\n' +
      '  - bearerToken: a valid bearer token string, OR\n' +
      '  - username, password, and clientCredentials for OAuth authentication'
    );
  }

  // Log which auth method is being used
  if (hasBearerToken) {
    console.log('Using bearer token authentication');
  } else {
    console.log('Using username/password OAuth authentication');
  }
}

