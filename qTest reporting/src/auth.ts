import axios from 'axios';
import { AuthConfig, OAuthTokenResponse } from './types';

export class QTestAuth {
  private qTestUrl: string;
  private authConfig: AuthConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private usesBearerToken: boolean;

  constructor(qTestUrl: string, authConfig: AuthConfig) {
    this.qTestUrl = qTestUrl;
    this.authConfig = authConfig;
    this.usesBearerToken = !!authConfig.bearerToken;

    // If using bearer token, set it immediately
    if (this.usesBearerToken && authConfig.bearerToken) {
      this.accessToken = authConfig.bearerToken;
      this.tokenExpiresAt = null;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // If using bearer token, return it directly
    if (this.usesBearerToken) {
      if (!this.accessToken) {
        throw new Error('Bearer token is not configured');
      }
      return this.accessToken;
    }

    // Check if we have a valid OAuth token
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Authenticate and get new token
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

    if (!this.authConfig.username || !this.authConfig.password || !this.authConfig.clientCredentials) {
      throw new Error('Username, password, and clientCredentials are required for OAuth authentication');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', this.authConfig.username);
    params.append('password', this.authConfig.password);

    try {
      const response = await axios.post<OAuthTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${this.authConfig.clientCredentials}`,
        },
      });

      this.accessToken = response.data.access_token;

      // Set token expiration (default to 1 hour if not provided, with 5 min buffer)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

      console.log('Successfully authenticated with qTest using OAuth');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error_description || error.message;
        throw new Error(`qTest authentication failed: ${message}`);
      }
      throw error;
    }
  }
}

