import { Issue, Comment } from '@linear/sdk';
import { IssueManagerEntity } from '@molecules/entities/issue-manager.entity';
import { IssueService } from '@features/issue/service';
import { CommentService } from '@features/comment/service';
import { TeamService } from '@features/team/service';
import { UserService } from '@features/user/service';
import { LabelService } from '@features/label/service';
import { WorkflowStateService } from '@features/workflow-state/service';
import { ProjectService } from '@features/project/service';
import { logger } from '@atoms/shared/logger';
import { ValidationError } from '@atoms/types/common';
import {
  QuickCreateOptions,
  IssueCreationResult,
  SmartSearchOptions,
  SmartSearchResult,
  BulkUpdateResult,
  CommentOptions,
} from '@molecules/entities/types/issue-manager.types';

/**
 * High-level tool for issue management operations
 * This is the primary interface for 60% of Linear interactions
 */
export class IssueManagerTool {
  private issueManager: IssueManagerEntity;

  constructor() {
    // Initialize the entity with all required services
    this.issueManager = new IssueManagerEntity(
      new IssueService(),
      new CommentService(),
      new TeamService(),
      new UserService(),
      new LabelService(),
      new WorkflowStateService(),
      new ProjectService(),
    );
  }

  /**
   * Quick issue creation with smart defaults
   * @param title Issue title
   * @param teamKey Team key (e.g., "eng", "design")
   * @param options Additional options
   */
  async quickCreate(
    title: string,
    teamKey: string,
    options?: QuickCreateOptions,
  ): Promise<IssueCreationResult> {
    // Validate inputs
    if (!title || title.trim().length === 0) {
      throw new ValidationError('Issue title is required');
    }
    if (!teamKey || teamKey.trim().length === 0) {
      throw new ValidationError('Team key is required');
    }

    logger.info(`IssueManagerTool: Creating issue "${title}" for team ${teamKey}`);

    try {
      const result = await this.issueManager.quickCreate(title.trim(), teamKey.trim(), options);

      if (result.warnings && result.warnings.length > 0) {
        logger.warn('Issue created with warnings:', result.warnings);
      }

      return result;
    } catch (error) {
      logger.error('IssueManagerTool: Failed to create issue', error);
      throw error;
    }
  }

  /**
   * Move multiple issues to a new status
   * @param issueIdentifiers Array of issue identifiers (ENG-123, #123, UUID)
   * @param status Target status name (e.g., "In Progress", "Done")
   * @param comment Optional comment to add
   */
  async moveToStatus(
    issueIdentifiers: string[],
    status: string,
    comment?: string,
  ): Promise<BulkUpdateResult> {
    // Validate inputs
    if (!issueIdentifiers || issueIdentifiers.length === 0) {
      throw new ValidationError('At least one issue identifier is required');
    }
    if (!status || status.trim().length === 0) {
      throw new ValidationError('Target status is required');
    }

    logger.info(`IssueManagerTool: Moving ${issueIdentifiers.length} issues to ${status}`);

    try {
      return await this.issueManager.moveToStatus(issueIdentifiers, status.trim(), comment);
    } catch (error) {
      logger.error('IssueManagerTool: Failed to move issues', error);
      throw error;
    }
  }

  /**
   * Smart search with natural language query
   * @param query Natural language search query
   * @param options Additional search options
   */
  async smartSearch(query: string, options?: SmartSearchOptions): Promise<SmartSearchResult> {
    // Validate inputs
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query is required');
    }

    logger.info(`IssueManagerTool: Searching for "${query}"`);

    try {
      const result = await this.issueManager.smartSearch(query.trim(), options);

      logger.info(
        `IssueManagerTool: Found ${result.issues.length} issues (confidence: ${result.confidence})`,
      );

      return result;
    } catch (error) {
      logger.error('IssueManagerTool: Search failed', error);
      throw error;
    }
  }

  /**
   * Bulk assign issues to a user
   * @param issueIdentifiers Array of issue identifiers
   * @param assignee Assignee email or username
   */
  async bulkAssign(issueIdentifiers: string[], assignee: string): Promise<BulkUpdateResult> {
    // Validate inputs
    if (!issueIdentifiers || issueIdentifiers.length === 0) {
      throw new ValidationError('At least one issue identifier is required');
    }
    if (!assignee || assignee.trim().length === 0) {
      throw new ValidationError('Assignee is required');
    }

    logger.info(`IssueManagerTool: Assigning ${issueIdentifiers.length} issues to ${assignee}`);

    try {
      return await this.issueManager.bulkAssign(issueIdentifiers, assignee.trim());
    } catch (error) {
      logger.error('IssueManagerTool: Bulk assign failed', error);
      throw error;
    }
  }

  /**
   * Add a quick comment to an issue
   * @param issueIdentifier Issue identifier (ENG-123, #123, UUID)
   * @param comment Comment text
   * @param options Comment options
   */
  async addQuickComment(
    issueIdentifier: string,
    comment: string,
    options?: CommentOptions,
  ): Promise<Comment> {
    // Validate inputs
    if (!issueIdentifier || issueIdentifier.trim().length === 0) {
      throw new ValidationError('Issue identifier is required');
    }
    if (!comment || comment.trim().length === 0) {
      throw new ValidationError('Comment text is required');
    }

    logger.info(`IssueManagerTool: Adding comment to ${issueIdentifier}`);

    try {
      return await this.issueManager.addQuickComment(
        issueIdentifier.trim(),
        comment.trim(),
        options,
      );
    } catch (error) {
      logger.error('IssueManagerTool: Failed to add comment', error);
      throw error;
    }
  }

  /**
   * Resolve an issue identifier to an Issue object
   * @param identifier Issue identifier (ENG-123, #123, UUID)
   */
  async resolveIdentifier(identifier: string): Promise<Issue | null> {
    if (!identifier || identifier.trim().length === 0) {
      return null;
    }

    try {
      return await this.issueManager.resolveIdentifier(identifier.trim());
    } catch (error) {
      logger.error(`IssueManagerTool: Failed to resolve identifier ${identifier}`, error);
      return null;
    }
  }

  /**
   * Get tool information
   */
  getInfo(): Record<string, unknown> {
    return {
      name: 'IssueManagerTool',
      version: '1.0.0',
      description: 'High-level tool for Linear issue management',
      capabilities: [
        'Quick issue creation with smart defaults',
        'Bulk status updates',
        'Natural language search',
        'Bulk assignment',
        'Quick commenting',
        'Identifier resolution (ENG-123, #123, UUID)',
      ],
      usage: {
        quickCreate:
          'tool.quickCreate("Bug in login", "eng", { priority: 1, assignee: "john@example.com" })',
        moveToStatus: 'tool.moveToStatus(["ENG-123", "ENG-124"], "In Review", "Ready for review")',
        smartSearch: 'tool.smartSearch("high priority bugs assigned to me")',
        bulkAssign: 'tool.bulkAssign(["ENG-123", "ENG-124"], "jane@example.com")',
        addQuickComment: 'tool.addQuickComment("ENG-123", "Fixed in latest commit")',
      },
    };
  }
}
