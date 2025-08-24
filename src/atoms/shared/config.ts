import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  LINEAR_API_KEY: z.string().min(1, 'LINEAR_API_KEY is required'),
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
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  get(): Config {
    return this.config;
  }

  get apiKey(): string {
    return this.config.LINEAR_API_KEY;
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
