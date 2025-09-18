import { z } from 'zod';
import dotenv from 'dotenv';
import { settings } from '../../organisms/cli/settings';

dotenv.config();

const envSchema = z.object({
  LINEAR_API_KEY: z.string().optional(), // Made optional since we have global config
  LINEAR_WORKSPACE_ID: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      console.error('Invalid environment configuration:', parsed.error.flatten());
      process.exit(1);
    }

    this.config = parsed.data;

    // Check if we have an API key from any source (env or global config)
    const globalApiKey = settings.getGlobal('linearApiKey');
    if (!this.config.LINEAR_API_KEY && !globalApiKey) {
      console.error('Invalid environment configuration:', {
        formErrors: [],
        fieldErrors: { LINEAR_API_KEY: ['Required'] },
      });
      process.exit(1);
    }
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  get(): Config {
    // Merge env config with global settings
    const globalApiKey = settings.getGlobal('linearApiKey') as string;
    return {
      ...this.config,
      LINEAR_API_KEY: this.config.LINEAR_API_KEY || globalApiKey || '',
    };
  }

  get apiKey(): string {
    const globalApiKey = settings.getGlobal('linearApiKey') as string;
    return this.config.LINEAR_API_KEY || globalApiKey || '';
  }

  get workspaceId(): string | undefined {
    return this.config.LINEAR_WORKSPACE_ID;
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }
}

export const config = ConfigManager.getInstance();
