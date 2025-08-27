import type { LinearClient } from '@linear/sdk';
import { IssueLabel } from '@linear/sdk';
import { LabelService } from '@features/label/service';
import { TeamService } from '@features/team/service';
import { LabelCreate, LabelUpdate, LabelFilter } from '@features/label/schemas';
import { logger } from '@atoms/shared/logger';
import { BatchOperationResult } from '@atoms/types/common';

/**
 * Label template definitions for common label sets
 */
export interface LabelTemplate {
  name: string;
  description: string;
  labels: Array<{
    category: string;
    values: Array<{
      name: string;
      color?: string;
      description?: string;
    }>;
  }>;
}

/**
 * Predefined label templates
 */
export const LABEL_TEMPLATES: Record<string, LabelTemplate> = {
  'task-patterns': {
    name: 'Task Patterns Template',
    description: 'Standard label hierarchy for task-patterns project',
    labels: [
      {
        category: 'type',
        values: [
          { name: 'feature', color: '#16a34a', description: 'New functionality' },
          { name: 'bug', color: '#dc2626', description: 'Defects and issues' },
          { name: 'refactor', color: '#8b5cf6', description: 'Code improvements' },
          { name: 'docs', color: '#0ea5e9', description: 'Documentation' },
          { name: 'test', color: '#f59e0b', description: 'Testing' },
          { name: 'chore', color: '#6b7280', description: 'Maintenance tasks' },
        ]
      },
      {
        category: 'domain',
        values: [
          { name: 'tasks', color: '#14b8a6', description: 'Task/issue management' },
          { name: 'teams', color: '#14b8a6', description: 'Team operations' },
          { name: 'labels', color: '#14b8a6', description: 'Label management' },
          { name: 'projects', color: '#14b8a6', description: 'Project features' },
          { name: 'sync', color: '#14b8a6', description: 'Integration/sync' },
          { name: 'reporting', color: '#14b8a6', description: 'Analytics/insights' },
        ]
      },
      {
        category: 'layer',
        values: [
          { name: 'atoms', color: '#00b894', description: 'Foundation layer' },
          { name: 'features', color: '#00b894', description: 'Data services' },
          { name: 'molecules', color: '#00b894', description: 'Domain logic' },
          { name: 'organisms', color: '#00b894', description: 'User interfaces' },
        ]
      }
    ]
  },
  'engineering': {
    name: 'Engineering Template',
    description: 'Common engineering labels',
    labels: [
      {
        category: 'type',
        values: [
          { name: 'feature', color: '#16a34a' },
          { name: 'bug', color: '#dc2626' },
          { name: 'tech-debt', color: '#8b5cf6' },
          { name: 'security', color: '#f97316' },
        ]
      },
      {
        category: 'priority',
        values: [
          { name: 'p0', color: '#dc2626', description: 'Urgent' },
          { name: 'p1', color: '#f59e0b', description: 'High' },
          { name: 'p2', color: '#3b82f6', description: 'Medium' },
          { name: 'p3', color: '#6b7280', description: 'Low' },
        ]
      }
    ]
  }
};

/**
 * LabelAPI - High-level API facade for label management
 * 
 * Features:
 * - Hierarchical label creation (category:value)
 * - Bulk operations
 * - Template-based setup
 * - Team-scoped operations
 */
export class LabelAPI {
  private labelService: LabelService;
  private teamService: TeamService;

  constructor(private client: LinearClient) {
    this.labelService = new LabelService(client);
    this.teamService = new TeamService(client);
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new label
   */
  async create(data: LabelCreate & { team?: string }): Promise<IssueLabel> {
    // Resolve team if provided as key
    if (data.team && !data.teamId) {
      const teamId = await this.teamService.resolveTeamId(data.team);
      if (!teamId) {
        throw new Error(`Team not found: ${data.team}`);
      }
      data.teamId = teamId;
      delete (data as any).team;
    }

    return this.labelService.create(data);
  }

  /**
   * Get a label by ID
   */
  async get(id: string): Promise<IssueLabel | null> {
    return this.labelService.get(id);
  }

  /**
   * Get a label by name
   */
  async getByName(name: string, teamId?: string): Promise<IssueLabel | null> {
    return this.labelService.getByName(name, teamId);
  }

  /**
   * Update a label
   */
  async update(id: string, data: LabelUpdate): Promise<IssueLabel> {
    return this.labelService.update(id, data);
  }

  /**
   * Delete a label
   */
  async delete(id: string): Promise<boolean> {
    return this.labelService.delete(id);
  }

  /**
   * List labels with optional filters
   */
  async list(filter?: LabelFilter, options?: { first?: number }): Promise<IssueLabel[]> {
    const result = await this.labelService.list(filter, options);
    return result.nodes;
  }

  /**
   * List labels for a specific team
   */
  async listByTeam(teamKey: string): Promise<IssueLabel[]> {
    const teamId = await this.teamService.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }
    
    const result = await this.labelService.listByTeam(teamId);
    return result.nodes;
  }

  // ==================== Hierarchical Operations ====================

  /**
   * Create a hierarchical label (category:value format)
   * @param category The category part (e.g., "type")
   * @param value The value part (e.g., "feature")
   * @param teamKey The team to create the label for
   * @param options Additional label options
   */
  async createHierarchical(
    category: string,
    value: string,
    teamKey: string,
    options?: {
      color?: string;
      description?: string;
    }
  ): Promise<IssueLabel> {
    const labelName = `${category}:${value}`;
    
    logger.info(`Creating hierarchical label: ${labelName} for team ${teamKey}`);

    // Check if parent category exists
    let parentLabel = await this.getByName(category, teamKey);
    
    if (!parentLabel) {
      // Create parent category label
      logger.debug(`Creating parent category: ${category}`);
      parentLabel = await this.create({
        name: category,
        color: '#6b7280', // Default gray for categories
        description: `Category: ${category}`,
        team: teamKey
      });
    }

    // Create child label with parent reference
    return this.create({
      name: labelName,
      color: options?.color || '#3b82f6', // Default blue
      description: options?.description,
      parentId: parentLabel.id,
      team: teamKey
    });
  }

  /**
   * Parse a hierarchical label name
   */
  parseHierarchical(labelName: string): { category: string; value: string } | null {
    const parts = labelName.split(':');
    if (parts.length === 2) {
      return {
        category: parts[0].trim(),
        value: parts[1].trim()
      };
    }
    return null;
  }

  /**
   * Get all labels in a hierarchy
   */
  async getHierarchy(teamKey: string): Promise<Map<string, IssueLabel[]>> {
    const labels = await this.listByTeam(teamKey);
    const hierarchy = new Map<string, IssueLabel[]>();

    for (const label of labels) {
      const parsed = this.parseHierarchical(label.name);
      if (parsed) {
        const category = parsed.category;
        if (!hierarchy.has(category)) {
          hierarchy.set(category, []);
        }
        hierarchy.get(category)!.push(label);
      }
    }

    return hierarchy;
  }

  // ==================== Bulk Operations ====================

  /**
   * Create multiple labels at once
   */
  async bulkCreate(
    labels: Array<LabelCreate & { team?: string }>
  ): Promise<BatchOperationResult<IssueLabel>> {
    const results = await Promise.allSettled(
      labels.map(label => this.create(label))
    );

    const successful: IssueLabel[] = [];
    const failed: Array<{ item: LabelCreate; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          item: labels[index],
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    return {
      successful,
      failed,
      totalCount: labels.length,
      successCount: successful.length,
      failedCount: failed.length
    };
  }

  /**
   * Delete multiple labels at once
   */
  async bulkDelete(labelIds: string[]): Promise<BatchOperationResult<string>> {
    const results = await Promise.allSettled(
      labelIds.map(id => this.delete(id))
    );

    const successful: string[] = [];
    const failed: Array<{ item: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successful.push(labelIds[index]);
      } else {
        failed.push({
          item: labelIds[index],
          error: result.status === 'rejected' 
            ? result.reason?.message 
            : 'Failed to delete'
        });
      }
    });

    return {
      successful,
      failed,
      totalCount: labelIds.length,
      successCount: successful.length,
      failedCount: failed.length
    };
  }

  /**
   * Create multiple hierarchical labels
   */
  async bulkCreateHierarchical(
    teamKey: string,
    labels: Array<{
      category: string;
      value: string;
      color?: string;
      description?: string;
    }>
  ): Promise<BatchOperationResult<IssueLabel>> {
    const results = await Promise.allSettled(
      labels.map(label => 
        this.createHierarchical(
          label.category,
          label.value,
          teamKey,
          { color: label.color, description: label.description }
        )
      )
    );

    const successful: IssueLabel[] = [];
    const failed: Array<{ item: any; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          item: labels[index],
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    return {
      successful,
      failed,
      totalCount: labels.length,
      successCount: successful.length,
      failedCount: failed.length
    };
  }

  // ==================== Template Operations ====================

  /**
   * Apply a label template to a team
   */
  async applyTemplate(
    templateName: string,
    teamKey: string,
    options?: {
      skipExisting?: boolean;
      dryRun?: boolean;
    }
  ): Promise<{
    created: IssueLabel[];
    skipped: string[];
    errors: Array<{ label: string; error: string }>;
  }> {
    const template = LABEL_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found. Available: ${Object.keys(LABEL_TEMPLATES).join(', ')}`);
    }

    logger.info(`Applying template '${templateName}' to team ${teamKey}`);

    const created: IssueLabel[] = [];
    const skipped: string[] = [];
    const errors: Array<{ label: string; error: string }> = [];

    // Get existing labels to check for duplicates
    const existingLabels = options?.skipExisting ? await this.listByTeam(teamKey) : [];
    const existingNames = new Set(existingLabels.map(l => l.name));

    for (const category of template.labels) {
      for (const value of category.values) {
        const labelName = `${category.category}:${value.name}`;
        
        // Skip if exists
        if (existingNames.has(labelName)) {
          skipped.push(labelName);
          continue;
        }

        // Dry run mode
        if (options?.dryRun) {
          logger.info(`[DRY RUN] Would create: ${labelName}`);
          continue;
        }

        try {
          const label = await this.createHierarchical(
            category.category,
            value.name,
            teamKey,
            {
              color: value.color,
              description: value.description
            }
          );
          created.push(label);
          logger.success(`Created label: ${labelName}`);
        } catch (error: any) {
          errors.push({
            label: labelName,
            error: error.message || 'Unknown error'
          });
          logger.error(`Failed to create label: ${labelName}`, error);
        }
      }
    }

    return { created, skipped, errors };
  }

  /**
   * Get available templates
   */
  static getAvailableTemplates(): Array<{
    name: string;
    template: LabelTemplate;
  }> {
    return Object.entries(LABEL_TEMPLATES).map(([name, template]) => ({
      name,
      template
    }));
  }

  /**
   * Preview what a template would create
   */
  static previewTemplate(templateName: string): Array<string> {
    const template = LABEL_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const labels: string[] = [];
    for (const category of template.labels) {
      for (const value of category.values) {
        labels.push(`${category.category}:${value.name}`);
      }
    }
    return labels;
  }

  // ==================== Utility Operations ====================

  /**
   * Find labels matching a pattern
   */
  async findByPattern(pattern: string, teamKey?: string): Promise<IssueLabel[]> {
    const labels = teamKey 
      ? await this.listByTeam(teamKey)
      : (await this.list()).nodes;

    const regex = new RegExp(pattern, 'i');
    return labels.filter(label => regex.test(label.name));
  }

  /**
   * Merge duplicate labels
   */
  async mergeDuplicates(
    sourceId: string,
    targetId: string
  ): Promise<{
    issuesUpdated: number;
    sourceDeleted: boolean;
  }> {
    logger.info(`Merging label ${sourceId} into ${targetId}`);

    // Get issues with source label
    const issues = await this.labelService.getIssues(sourceId);
    
    // Add target label to all issues that had source
    const updateResults = await this.labelService.bulkAddToIssues(
      issues.nodes.map(i => i.id),
      targetId
    );

    // Delete source label
    const sourceDeleted = await this.delete(sourceId);

    return {
      issuesUpdated: updateResults.successCount,
      sourceDeleted
    };
  }

  /**
   * Validate label name format
   */
  static validateLabelName(name: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Label name cannot be empty');
    }

    if (name.length > 50) {
      errors.push('Label name cannot exceed 50 characters');
    }

    // Check for hierarchical format if contains colon
    if (name.includes(':')) {
      const parts = name.split(':');
      if (parts.length !== 2) {
        errors.push('Hierarchical labels must have exactly one colon (category:value)');
      }
      if (parts.some(p => p.trim().length === 0)) {
        errors.push('Both category and value must be non-empty');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}