/**
 * Configuration Module
 * 
 * Provides hierarchical configuration management with support for:
 * - Local project configuration (package.json or .tp-config.json)
 * - Global user configuration (~/.task-pattern/config.json)
 * - Environment variables
 */

export { projectDiscovery, type ProjectRoot } from './project-discovery';
export { localConfigManager, type LocalConfig, LocalConfigManager } from './local-config';
export { 
  hierarchicalConfig, 
  type MergedConfig, 
  type ConfigSource,
  HierarchicalConfigManager 
} from './hierarchical-config';
export { enhancedConfig, EnhancedConfigManager } from './enhanced-config';