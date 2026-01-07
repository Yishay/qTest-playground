#!/usr/bin/env node

import { loadConfig } from './config';
import { QTestAuthDebug } from './auth-debug';
import axios from 'axios';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         qTest Authentication Debug Tool v1.1                   ║');
console.log('║                                                                 ║');
console.log('║  This tool tests authentication AND validates token works      ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function testAuthentication() {
  try {
    console.log('📋 Step 1: Loading configuration from config.json...\n');
    const config = loadConfig();
    
    console.log('✅ Configuration loaded successfully');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('🔍 Configuration Summary:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('qTest URL:', config.qTestUrl);
    console.log('qTest URL length:', config.qTestUrl.length, 'characters');
    console.log('qTest URL ends with /:', config.qTestUrl.endsWith('/'));
    
    const isBearerToken = !!config.auth.bearerToken;
    
    if (isBearerToken) {
      console.log('Authentication Type: Bearer Token');
      console.log('Bearer Token length:', config.auth.bearerToken!.length, 'characters');
      console.log('Bearer Token preview:', config.auth.bearerToken!.substring(0, 20) + '...');
      
      // Check for common bearer token issues
      const issues: string[] = [];
      
      if (config.auth.bearerToken!.includes('\n') || config.auth.bearerToken!.includes('\r')) {
        issues.push('⚠️  Bearer token contains line breaks - remove them!');
      }
      
      if (config.auth.bearerToken!.startsWith(' ') || config.auth.bearerToken!.endsWith(' ')) {
        issues.push('⚠️  Bearer token has leading/trailing spaces - remove them!');
      }
      
      if (config.auth.bearerToken === 'your-generated-token-here') {
        issues.push('⚠️  Bearer token is still the placeholder value!');
      }
      
      if (config.auth.bearerToken!.toLowerCase().startsWith('bearer ')) {
        issues.push('⚠️  Bearer token should NOT include "Bearer " word - remove it!');
      }
      
      if (config.auth.bearerToken!.length < 20) {
        issues.push('⚠️  Bearer token seems too short');
      }
      
      if (issues.length > 0) {
        console.log('\n⚠️  Potential Configuration Issues:');
        console.log('─────────────────────────────────────────────────────────────');
        issues.forEach(issue => console.log(issue));
      }
    } else {
      console.log('Authentication Type: OAuth (username/password)');
      console.log('Username:', config.auth.username);
      console.log('Username length:', config.auth.username?.length || 0, 'characters');
      console.log('Password length:', config.auth.password?.length || 0, 'characters');
      console.log('ClientCredentials:', config.auth.clientCredentials);
      
      // Check for common issues
      const issues: string[] = [];
      
      if (!config.auth.username) {
        issues.push('⚠️  Username is empty');
      } else if (!config.auth.username.includes('@')) {
        issues.push('⚠️  Username doesn\'t look like an email address');
      }
      
      if (!config.auth.password) {
        issues.push('⚠️  Password is empty');
      } else if (config.auth.password.length < 4) {
        issues.push('⚠️  Password seems too short');
      }
      
      if (!config.auth.clientCredentials) {
        issues.push('⚠️  ClientCredentials is empty');
      } else if (config.auth.clientCredentials !== 'bGluaC1sb2dpbjo=') {
        issues.push('⚠️  ClientCredentials doesn\'t match standard value (bGluaC1sb2dpbjo=)');
      }
      
      if (!config.qTestUrl.startsWith('http://') && !config.qTestUrl.startsWith('https://')) {
        issues.push('⚠️  qTestUrl doesn\'t start with http:// or https://');
      }
      
      if (!config.qTestUrl.endsWith('/')) {
        issues.push('⚠️  qTestUrl doesn\'t end with / (should it?)');
      }
      
      if (issues.length > 0) {
        console.log('\n⚠️  Potential Configuration Issues:');
        console.log('─────────────────────────────────────────────────────────────');
        issues.forEach(issue => console.log(issue));
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📋 Step 2: Initializing authentication client...\n');
    const auth = new QTestAuthDebug(config.qTestUrl, config.auth);
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📋 Step 3: Attempting to authenticate...\n');
    const token = await auth.getAccessToken();
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✅  AUTHENTICATION STEP 1 SUCCESSFUL');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Access Token received:');
    console.log('  Length:', token.length, 'characters');
    console.log('  Preview:', token.substring(0, 30) + '...' + token.substring(token.length - 10));
    
    // Step 4: Test the token by making an actual API call
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('📋 Step 4: Testing token with actual API call...\n');
    console.log('Making test call to: ' + config.qTestUrl + 'api/v3/projects');
    console.log('Authorization: Bearer [token]');
    console.log('Method: GET\n');
    
    console.log('⏳ Sending request...\n');
    
    try {
      const testResponse = await axios.get(`${config.qTestUrl}api/v3/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('✅ DEBUG: API call successful');
      console.log('✓ Status:', testResponse.status, testResponse.statusText);
      console.log('✓ Response received:', Array.isArray(testResponse.data) ? `${testResponse.data.length} projects` : 'project data');
      
      if (Array.isArray(testResponse.data) && testResponse.data.length > 0) {
        console.log('\n📊 Sample projects found:');
        testResponse.data.slice(0, 3).forEach((project: any) => {
          console.log(`  - ${project.name} (ID: ${project.id})`);
        });
        if (testResponse.data.length > 3) {
          console.log(`  ... and ${testResponse.data.length - 3} more`);
        }
      }
      
      console.log('\n═══════════════════════════════════════════════════════════════\n');
      console.log('✅ ✅ ✅  ALL TESTS PASSED! ✅ ✅ ✅');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('✅ Authentication: Working');
      console.log('✅ Token validity: Confirmed');
      console.log('✅ API access: Verified\n');
      console.log('🎉 Your credentials are correct and the token is valid!\n');
      console.log('You can now run the report tool:');
      console.log('  npm run report -- --days 30\n');
      
      process.exit(0);
      
    } catch (apiError) {
      console.log('\n❌ DEBUG: API call failed (but authentication succeeded)');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      if (axios.isAxiosError(apiError)) {
        console.log('✗ Status code:', apiError.response?.status);
        console.log('✗ Status text:', apiError.response?.statusText);
        console.log('✗ Error data:', JSON.stringify(apiError.response?.data, null, 2));
        console.log('✗ Request URL:', apiError.config?.url);
        
        if (apiError.response?.status === 401) {
          console.log('\n❌ ERROR: Invalid or Expired Token');
          console.log('═══════════════════════════════════════════════════════════════\n');
          
          if (isBearerToken) {
            console.log('Your Bearer Token is being rejected by qTest.\n');
            console.log('💡 Common causes:');
            console.log('1. Token has expired (tokens typically expire after some time)');
            console.log('2. Token was copied incorrectly (extra spaces, line breaks)');
            console.log('3. Token is from wrong qTest instance');
            console.log('4. Token doesn\'t have sufficient permissions\n');
            
            console.log('🔧 SOLUTIONS:\n');
            console.log('Solution 1: Generate a NEW token');
            console.log('  1. Login to qTest web interface');
            console.log('  2. Go to: Resources → API & SDK');
            console.log('  3. Click "Generate Token"');
            console.log('  4. Copy the ENTIRE token (don\'t include any spaces)');
            console.log('  5. Replace bearerToken value in config.json');
            console.log('  6. Make sure token is on ONE line, no line breaks\n');
            
            console.log('Solution 2: Check your config.json format');
            console.log('  Ensure it looks like this:');
            console.log('  {');
            console.log('    "qTestUrl": "https://your-qtest.com/",');
            console.log('    "auth": {');
            console.log('      "bearerToken": "your-token-here"');
            console.log('    }');
            console.log('  }\n');
            
            console.log('Solution 3: Verify qTestUrl matches token source');
            console.log('  - Token must be from the same qTest instance');
            console.log('  - URL in config.json: ' + config.qTestUrl);
            console.log('  - Check this matches where you generated the token\n');
          } else {
            console.log('Your OAuth token was generated but is now invalid.\n');
            console.log('💡 This is unusual. Possible causes:');
            console.log('1. OAuth token expired very quickly (server config issue)');
            console.log('2. Account permissions changed after authentication');
            console.log('3. qTest server configuration issue\n');
            
            console.log('🔧 Try switching to Bearer Token method instead\n');
          }
        } else if (apiError.response?.status === 403) {
          console.log('\n❌ ERROR: Permission Denied');
          console.log('═══════════════════════════════════════════════════════════════\n');
          console.log('Your token is valid, but doesn\'t have permission to access projects.\n');
          console.log('💡 Ask your qTest administrator to grant you:');
          console.log('  - Project access permissions');
          console.log('  - API access permissions\n');
        }
      }
      
      throw new Error('Token validation failed: ' + (apiError as Error).message);
    }
  } catch (error) {
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('❌ ❌ ❌  AUTHENTICATION FAILED ❌ ❌ ❌');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (error instanceof Error) {
      console.log('Error message:', error.message);
      console.log('\nFull error stack:');
      console.log(error.stack);
    } else {
      console.log('Unknown error:', error);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 TROUBLESHOOTING CHECKLIST');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('1. ✓ Verify qTestUrl in config.json matches your browser URL');
    console.log('   Example: https://yourcompany.qtestnet.com/\n');
    
    console.log('2. ✓ Verify username is your qTest login email');
    console.log('   Example: "username": "your.name@company.com"\n');
    
    console.log('3. ✓ Verify password is correct');
    console.log('   - Try logging into qTest web with this password');
    console.log('   - Check for special characters that need escaping\n');
    
    console.log('4. ✓ Check clientCredentials value');
    console.log('   Should be: "clientCredentials": "bGluaC1sb2dpbjo="\n');
    
    console.log('5. ✓ Check your config.json structure:');
    console.log('   {');
    console.log('     "qTestUrl": "https://...",');
    console.log('     "auth": {');
    console.log('       "username": "...",');
    console.log('       "password": "...",');
    console.log('       "clientCredentials": "..."');
    console.log('     }');
    console.log('   }\n');
    
    console.log('6. ✓ Special character escaping in JSON:');
    console.log('   If password contains:');
    console.log('   " (quote) → use \\"');
    console.log('   \\ (backslash) → use \\\\');
    console.log('   Example: Password "Test\\"123\\\\" for Test"123\\\n');
    
    console.log('7. ✓ For Bearer Token issues:');
    console.log('   - Regenerate token in qTest (Resources → API & SDK)');
    console.log('   - Copy entire token without spaces or line breaks');
    console.log('   - Verify qTestUrl matches where token was generated');
    console.log('   - Check token hasn\'t expired\n');
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    process.exit(1);
  }
}

testAuthentication();

