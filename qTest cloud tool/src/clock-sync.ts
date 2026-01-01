import axios from 'axios';
import { QTestConfig } from './types';

export class ClockSync {
  private sealightsToken?: string;
  private sealightsBackendUrl?: string;
  private slDriftMs?: number;

  constructor(config: QTestConfig) {
    if (config.sealights) {
      this.sealightsToken = config.sealights.token;
      // If token is provided, extract URL from it (takes precedence)
      // Otherwise use configured backendUrl
      if (config.sealights.token) {
        this.sealightsBackendUrl = this.extractBackendUrlFromToken(config.sealights.token);
      } else if (config.sealights.backendUrl) {
        this.sealightsBackendUrl = config.sealights.backendUrl;
      }
    }
  }

  /**
   * Extract Sealights backend URL from token
   * JWT tokens typically have the format: header.payload.signature
   * The payload contains server information in the 'x-sl-server' field
   */
  private extractBackendUrlFromToken(token?: string): string {
    if (!token) {
      return 'https://dev-staging.dev.sealights.co';
    }
    
    try {
      // Split token and decode payload (second part)
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        // Look for x-sl-server field (contains the API URL)
        if (payload['x-sl-server']) {
          // x-sl-server contains the full API URL (e.g., https://dev-integration.dev.sealights.co/api)
          // We keep it as-is since /sync is under /api
          return payload['x-sl-server'];
        }
        
        // Fallback: look for other common JWT claims
        if (payload.backendUrl) {
          return payload.backendUrl;
        }
        if (payload.iss && payload.iss.startsWith('http')) {
          return payload.iss;
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not extract backend URL from token, using default');
    }
    
    // Default to dev-staging if extraction fails
    return 'https://dev-staging.dev.sealights.co';
  }

  /**
   * Get current qTest server time from HTTP Date header
   */
  async getQTestServerTime(apiClient: any): Promise<number | null> {
    try {
      // Make a lightweight API call to get server time from Date header
      const response = await apiClient.get('/api/v3/projects', {
        params: { pageSize: 1 }, // Minimize response size
      });
      
      // Parse server time from Date header
      const serverDateHeader = response.headers.date;
      if (!serverDateHeader) {
        console.warn('⚠️  No Date header in qTest response');
        return null;
      }
      
      return new Date(serverDateHeader).getTime();
    } catch (error) {
      console.warn('⚠️  Failed to get qTest server time');
      return null;
    }
  }

  /**
   * Get current Sealights server time using /clock/sync endpoint
   */
  async getSealightsServerTime(): Promise<number | null> {
    // If Sealights is not configured, return null
    if (!this.sealightsBackendUrl) {
      return null;
    }

    try {
      const localTime = Date.now();
      // sealightsBackendUrl includes /api from x-sl-server, but /clock/sync is at base URL
      // Remove /api suffix if present
      let baseUrl = this.sealightsBackendUrl;
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
      }
      const syncUrl = `${baseUrl}/clock/sync?time=${localTime}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Bearer token if configured
      if (this.sealightsToken) {
        headers['Authorization'] = `Bearer ${this.sealightsToken}`;
      }
      console.log('🕐 Sync URL:', syncUrl);
      console.log('🕐 Headers:', JSON.stringify(headers, null, 2));
      const response = await axios.get(syncUrl, {
        headers,
        timeout: 5000,
      });
      
      // The /clock/sync endpoint returns drift information
      // Extract server time from response
      if (response.data && response.data.data) {
        console.log('🕐 Response data:', JSON.stringify(response.data, null, 2));
        // If slDriftMs is provided, calculate server time
        if (typeof response.data.data.slDriftMs === 'number') {
          // slDriftMs = localTime - serverTime, so serverTime = localTime - slDriftMs
          return localTime - response.data.data.slDriftMs;
        }
        // If slServerTime is provided directly
        if (typeof response.data.data.slServerTime === 'number') {
          return response.data.data.slServerTime;
        }
      }
      
      // Fallback: use Date header
      const serverDateHeader = response.headers.date;
      if (serverDateHeader) {
        return new Date(serverDateHeader).getTime();
      }
      
      console.warn('   ⚠️  No server time in Sealights /sync response');
      return null;
    } catch (error) {
      console.warn('⚠️  Failed to get Sealights server time');
      if (axios.isAxiosError(error)) {
        console.warn(`   Error: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Calculate clock drift between qTest and Sealights
   * clockDriftMs = Sealights time - qTest time
   */
  async calculateClockDrift(apiClient: any): Promise<number> {
    console.log('🕐 Calculating clock drift between qTest and Sealights...');
    
    const localTime = Date.now();
    const qTestTime = await this.getQTestServerTime(apiClient);
    const sealightsTime = await this.getSealightsServerTime();
    
    if (qTestTime === null || sealightsTime === null) {
      console.warn('⚠️  Could not calculate clock drift, using clockDriftMs = 0');
      return 0;
    }
    
    // Calculate individual drifts from Integration Runtime
    const qTestDrift = localTime - qTestTime;
    const sealightsDrift = localTime - sealightsTime;
    
    console.log(`   Integration Runtime time: ${localTime}`);
    console.log(`   qTest Server time:        ${qTestTime}`);
    console.log(`   Sealights Server time:    ${sealightsTime}`);
    console.log(`   → Runtime - qTest drift:      ${qTestDrift}ms ${qTestDrift > 0 ? '(Runtime ahead)' : '(qTest ahead)'}`);
    console.log(`   → Runtime - Sealights drift:  ${sealightsDrift}ms ${sealightsDrift > 0 ? '(Runtime ahead)' : '(Sealights ahead)'}`);
    
    // clockDriftMs = Sealights time - qTest time
    const drift = sealightsTime - qTestTime;
    console.log(`   → Final drift (Sealights - qTest): ${drift}ms ${drift > 0 ? '(Sealights ahead)' : drift < 0 ? '(qTest ahead)' : '(perfectly synced)'}`);
    
    return drift;
  }

  /**
   * Adjust a qTest timestamp to Sealights time
   * adjustedTime = originalQTestTime + clockDriftMs
   * 
   * Note: clockDriftMs should be pre-calculated using calculateClockDrift()
   */
  adjustTimestamp(qTestTimestamp: string, clockDriftMs: number): number {
    const originalQTestTime = new Date(qTestTimestamp).getTime();
    const adjustedTime = originalQTestTime + clockDriftMs;
    return adjustedTime;
  }
}

