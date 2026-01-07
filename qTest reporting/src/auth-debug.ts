import axios from 'axios';
import { AuthConfig, OAuthTokenResponse } from './types';

export class QTestAuthDebug {
  private qTestUrl: string;
  private authConfig: AuthConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private usesBearerToken: boolean;

  constructor(qTestUrl: string, authConfig: AuthConfig) {
    this.qTestUrl = qTestUrl;
    this.authConfig = authConfig;
    this.usesBearerToken = !!authConfig.bearerToken;

    console.log('\n🔍 DEBUG: QTestAuth Constructor');
    console.log('✓ qTestUrl:', qTestUrl);
    console.log('✓ usesBearerToken:', this.usesBearerToken);

    // If using bearer token, set it immediately
    if (this.usesBearerToken && authConfig.bearerToken) {
      this.accessToken = authConfig.bearerToken;
      this.tokenExpiresAt = null;
      console.log('✓ Bearer token configured\n');
    } else {
      console.log('✓ OAuth authentication mode (username/password)\n');
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    console.log('🔍 DEBUG: getAccessToken called');
    
    // If using bearer token, return it directly
    if (this.usesBearerToken) {
      if (!this.accessToken) {
        throw new Error('Bearer token is not configured');
      }
      console.log('✓ Returning bearer token\n');
      return this.accessToken;
    }

    // Check if we have a valid OAuth token
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      console.log('✓ Using cached OAuth token (still valid)\n');
      return this.accessToken;
    }

    // Authenticate and get new token
    console.log('⚡ Authenticating to get new token...');
    await this.authenticate();

    if (!this.accessToken) {
      throw new Error('Failed to obtain access token');
    }

    return this.accessToken;
  }

  /**
   * Authenticate with qTest using username/password to get OAuth token
   */
  private async authenticate(): Promise<void> {
    if (this.usesBearerToken) {
      return;
    }

    const tokenUrl = `${this.qTestUrl}/oauth/token`;

    console.log('\n🔍 DEBUG: authenticate() - OAuth Configuration');
    console.log('✓ Token URL:', tokenUrl);
    console.log('✓ Username:', this.authConfig.username);
    console.log('✓ Password length:', this.authConfig.password?.length || 0, 'characters');
    console.log('✓ Password first char:', this.authConfig.password ? this.authConfig.password[0] : 'N/A');
    console.log('✓ Password last char:', this.authConfig.password ? this.authConfig.password[this.authConfig.password.length - 1] : 'N/A');
    console.log('✓ ClientCredentials:', this.authConfig.clientCredentials);
    console.log('✓ ClientCredentials decoded:', Buffer.from(this.authConfig.clientCredentials || '', 'base64').toString('utf-8'));

    if (!this.authConfig.username || !this.authConfig.password || !this.authConfig.clientCredentials) {
      throw new Error('Username, password, and clientCredentials are required for OAuth authentication');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', this.authConfig.username);
    params.append('password', this.authConfig.password);

    console.log('\n📤 DEBUG: Request Details');
    console.log('✓ Method: POST');
    console.log('✓ URL:', tokenUrl);
    console.log('✓ Content-Type: application/x-www-form-urlencoded');
    console.log('✓ Authorization: Basic', this.authConfig.clientCredentials);
    console.log('✓ Body parameters:');
    console.log('  - grant_type: password');
    console.log('  - username:', this.authConfig.username);
    console.log('  - password: [' + '*'.repeat(this.authConfig.password.length) + ']');

    try {
      console.log('\n⏳ Sending authentication request...\n');
      
      const response = await axios.post<OAuthTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${this.authConfig.clientCredentials}`,
        },
      });

      console.log('✅ DEBUG: Response received');
      console.log('✓ Status:', response.status, response.statusText);
      console.log('✓ Access token received:', response.data.access_token ? 'YES (length: ' + response.data.access_token.length + ')' : 'NO');
      console.log('✓ Token type:', response.data.token_type);
      console.log('✓ Expires in:', response.data.expires_in, 'seconds');

      this.accessToken = response.data.access_token;

      // Set token expiration (default to 1 hour if not provided, with 5 min buffer)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

      console.log('✅ Successfully authenticated with qTest using OAuth\n');
    } catch (error) {
      console.log('\n❌ DEBUG: Authentication failed');
      
      if (axios.isAxiosError(error)) {
        console.log('✗ Error type: Axios Error');
        console.log('✗ Status code:', error.response?.status);
        console.log('✗ Status text:', error.response?.statusText);
        console.log('✗ Response headers:', JSON.stringify(error.response?.headers, null, 2));
        console.log('✗ Response data:', JSON.stringify(error.response?.data, null, 2));
        console.log('✗ Request URL:', error.config?.url);
        console.log('✗ Request method:', error.config?.method);
        console.log('✗ Request headers:', JSON.stringify(error.config?.headers, null, 2));
        
        const message = error.response?.data?.error_description || error.response?.data?.error || error.message;
        
        console.log('\n💡 Common Solutions:');
        console.log('1. Verify username exactly matches your qTest login email');
        console.log('2. Try resetting your qTest password');
        console.log('3. Check if password contains special characters that need escaping');
        console.log('4. Verify qTestUrl matches your actual qTest instance URL');
        console.log('5. Try logging into qTest web interface with same credentials');
        console.log('6. Check if your account is locked or requires password change\n');
        
        throw new Error(`qTest authentication failed: ${message}`);
      }
      
      console.log('✗ Error type: Non-Axios Error');
      console.log('✗ Error:', error);
      throw error;
    }
  }
}

