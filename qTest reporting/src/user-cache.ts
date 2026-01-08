import { QTestClient } from './qtest-client';
import { QTestUser } from './types';

/**
 * User cache for lazy loading user information
 * Only fetches user data when needed, not all users upfront
 */
export class UserCache {
  private client: QTestClient;
  private userCache: Map<number, { email: string; name: string }> = new Map();
  private fetchedAll: boolean = false;

  constructor(client: QTestClient) {
    this.client = client;
  }

  /**
   * Get user info by ID - fetches on demand and caches
   */
  async getUserInfo(userId: number): Promise<{ email: string; name: string }> {
    // Check cache first
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    // Try to fetch single user by ID
    try {
      const apiClient = this.client.getApiClient();
      const response = await apiClient.get(`/api/v3/users/${userId}`);
      const user = response.data;

      const info = {
        email: user.email || user.username || `user_${userId}`,
        name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `user_${userId}`,
      };

      this.userCache.set(userId, info);
      return info;
    } catch (error) {
      // If single user fetch fails, return fallback
      const fallback = {
        email: `user_${userId}`,
        name: `User ${userId}`,
      };
      this.userCache.set(userId, fallback);
      return fallback;
    }
  }

  /**
   * Get user email by ID
   */
  async getUserEmail(userId: number): Promise<string> {
    const info = await this.getUserInfo(userId);
    return info.email;
  }

  /**
   * Get user name by ID
   */
  async getUserName(userId: number): Promise<string> {
    const info = await this.getUserInfo(userId);
    return info.name;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cachedUsers: number; fetchedAll: boolean } {
    return {
      cachedUsers: this.userCache.size,
      fetchedAll: this.fetchedAll,
    };
  }
}

