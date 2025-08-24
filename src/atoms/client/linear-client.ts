import { LinearClient as SDKLinearClient } from '@linear/sdk';
import { config } from '../shared/config';
import { logger } from '../shared/logger';

export class LinearClientManager {
  private static instance: LinearClientManager;
  private client: SDKLinearClient;

  private constructor() {
    const apiKey = config.apiKey;

    if (!apiKey) {
      throw new Error('Linear API key is required');
    }

    this.client = new SDKLinearClient({
      apiKey,
    });

    logger.info('Linear client initialized');
  }

  static getInstance(): LinearClientManager {
    if (!LinearClientManager.instance) {
      LinearClientManager.instance = new LinearClientManager();
    }
    return LinearClientManager.instance;
  }

  getClient(): SDKLinearClient {
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    try {
      const viewer = await this.client.viewer;
      logger.success(`Connected to Linear as: ${viewer.name} (${viewer.email})`);
      return true;
    } catch (error) {
      logger.error('Failed to connect to Linear', error);
      return false;
    }
  }
}

export const linearClient = LinearClientManager.getInstance();
