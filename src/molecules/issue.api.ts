import type { LinearClient } from '@linear/sdk';
import { IssueEntity, QuickCreateOptions } from './entities/issue.entity';
import { BulkOperationsWorkflow } from './workflows/bulk-operations.workflow';
import { SmartSearchWorkflow } from './workflows/smart-search.workflow';
import { IssueRelationsWorkflow } from './workflows/issue-relations.workflow';
import { IssueService } from '@features/issue/service';
import { TeamService } from '@features/team/service';
import { IssueCreate, IssueUpdate, IssueFilter } from '@features/issue/schemas';
import { CommentService } from '@features/comment/service';
import { logger } from '@atoms/shared/logger';

/**
 * IssueAPI - High-level API facade for all issue operations
 * 
 * This facade combines:
 * - IssueEntity for domain operations
 * - Workflows for complex business logic
 * - Services for direct data access
 * 
 * The CLI and MCP should use this API exclusively for issue operations.
 */
export class IssueAPI {
  private issueEntity: IssueEntity;
  private bulkWorkflow: BulkOperationsWorkflow;
  private searchWorkflow: SmartSearchWorkflow;
  private relationsWorkflow: IssueRelationsWorkflow;
  private issueService: IssueService;
  private teamService: TeamService;
  private commentService: CommentService;

  constructor(private client: LinearClient) {
    this.issueEntity = new IssueEntity(client);
    this.bulkWorkflow = new BulkOperationsWorkflow(client);
    this.searchWorkflow = new SmartSearchWorkflow(client);
    this.relationsWorkflow = new IssueRelationsWorkflow(client);
    this.issueService = new IssueService(client);
    this.teamService = new TeamService(client);
    this.commentService = new CommentService(client);
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new issue with team resolution
   */
  async create(data: IssueCreate & { team?: string }) {
    // If team is provided as a key, resolve it
    if (data.team) {
      const teamId = await this.teamService.resolveTeamId(data.team);
      if (!teamId) {
        throw new Error(`Team not found: ${data.team}`);
      }
      data.teamId = teamId;
      delete (data as any).team;
    }
    
    return this.issueEntity.create(data);
  }

  /**
   * Quick create with smart defaults and resolution
   */
  async quickCreate(title: string, teamKey: string, options?: QuickCreateOptions) {
    return this.issueEntity.quickCreate(title, teamKey, options);
  }

  /**
   * Get issue by ID
   */
  async get(id: string) {
    return this.issueEntity.get(id);
  }

  /**
   * Get issue by identifier (e.g., "ENG-123")
   */
  async getByIdentifier(identifier: string) {
    return this.issueEntity.getByIdentifier(identifier);
  }

  /**
   * Get issue with all relations
   */
  async getWithRelations(id: string) {
    return this.issueEntity.getWithRelations(id);
  }

  /**
   * Update an issue
   */
  async update(id: string, data: IssueUpdate) {
    return this.issueEntity.update(id, data);
  }

  /**
   * Delete an issue
   */
  async delete(id: string) {
    return this.issueEntity.delete(id);
  }

  /**
   * List issues with filters
   */
  async list(filter?: IssueFilter & { team?: string }, options?: { first?: number }) {
    // If team is provided as a key, resolve it
    if (filter?.team) {
      const teamId = await this.teamService.resolveTeamId(filter.team);
      if (!teamId) {
        throw new Error(`Team not found: ${filter.team}`);
      }
      filter.teamId = teamId;
      delete (filter as any).team;
    }
    
    return this.issueEntity.list(filter, options);
  }

  /**
   * Resolve an identifier to an issue
   */
  async resolveIdentifier(identifier: string) {
    return this.issueEntity.resolveIdentifier(identifier);
  }

  // ==================== Relationship Operations ====================

  /**
   * Assign issue to a user (by ID or email)
   */
  async assignToUser(issueId: string, userIdOrEmail: string) {
    // Check if it's an email
    if (userIdOrEmail.includes('@')) {
      return this.relationsWorkflow.assignToUser(issueId, userIdOrEmail);
    }
    return this.issueEntity.assignToUser(issueId, userIdOrEmail);
  }

  /**
   * Unassign an issue
   */
  async unassign(issueId: string) {
    return this.issueEntity.unassign(issueId);
  }

  /**
   * Add labels to an issue
   */
  async addLabels(issueId: string, labelIds: string[]) {
    return this.issueEntity.addLabels(issueId, labelIds);
  }

  /**
   * Remove labels from an issue
   */
  async removeLabels(issueId: string, labelIds: string[]) {
    return this.issueEntity.removeLabels(issueId, labelIds);
  }

  /**
   * Move issue to a project
   */
  async moveToProject(issueId: string, projectId: string) {
    return this.issueEntity.moveToProject(issueId, projectId);
  }

  /**
   * Change issue priority
   */
  async changePriority(issueId: string, priority: 0 | 1 | 2 | 3 | 4) {
    return this.issueEntity.changePriority(issueId, priority);
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueId: string, body: string) {
    return this.issueEntity.addComment(issueId, body);
  }

  /**
   * Add comment to issue (alternative method for compatibility)
   */
  async addCommentToIssue(issueId: string, body: string) {
    return this.issueEntity.addCommentToIssue(issueId, body);
  }

  // ==================== Bulk Operations ====================

  /**
   * Bulk assign issues to a user
   */
  async bulkAssign(identifiers: string[], userEmail: string) {
    return this.bulkWorkflow.bulkAssign(identifiers, userEmail);
  }

  /**
   * Move multiple issues to a new status
   */
  async bulkMoveToStatus(identifiers: string[], statusName: string, comment?: string) {
    return this.bulkWorkflow.moveToStatus(identifiers, statusName, comment);
  }

  /**
   * Update priority for multiple issues
   */
  async bulkUpdatePriority(identifiers: string[], priority: 0 | 1 | 2 | 3 | 4) {
    return this.bulkWorkflow.bulkUpdatePriority(identifiers, priority);
  }

  /**
   * Archive multiple issues
   */
  async bulkArchive(identifiers: string[]) {
    return this.bulkWorkflow.bulkArchive(identifiers);
  }

  // ==================== Search Operations ====================

  /**
   * Smart search using natural language
   */
  async search(query: string, options?: { team?: string; limit?: number; includeArchived?: boolean }) {
    return this.searchWorkflow.search(query, options);
  }

  /**
   * Search with specific filters
   */
  async searchWithFilters(filters: any, options?: { limit?: number }) {
    return this.searchWorkflow.searchWithFilters(filters, options);
  }

  // ==================== Workflow Operations ====================

  /**
   * Create issue with smart validation and resolution
   */
  async createWithValidation(
    title: string,
    teamKey: string,
    options?: {
      assigneeEmail?: string;
      labels?: string[];
      projectName?: string;
      priority?: 0 | 1 | 2 | 3 | 4;
      description?: string;
    }
  ) {
    return this.relationsWorkflow.createWithValidation(title, teamKey, options);
  }

  // ==================== Utility Operations ====================

  /**
   * Get issue metrics
   */
  async getMetrics(issueId: string) {
    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    const comments = await this.commentService.listByIssue(issueId);
    const team = await issue.team;
    const assignee = await issue.assignee;
    const project = await issue.project;
    const labels = await issue.labels();

    return {
      issue,
      commentCount: comments.length,
      team: team ? { id: team.id, name: team.name, key: team.key } : null,
      assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
      project: project ? { id: project.id, name: project.name } : null,
      labels: labels.nodes.map(l => ({ id: l.id, name: l.name, color: l.color })),
      cycleTime: issue.completedAt && issue.startedAt
        ? new Date(issue.completedAt).getTime() - new Date(issue.startedAt).getTime()
        : null,
    };
  }

  /**
   * Validate issue data before creation
   */
  async validateCreateData(data: IssueCreate & { team?: string }): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    // Validate team
    if (data.team) {
      const teamId = await this.teamService.resolveTeamId(data.team);
      if (!teamId) {
        errors.push(`Team not found: ${data.team}`);
      }
    } else if (!data.teamId) {
      errors.push('Team ID or key is required');
    }

    // Validate priority
    if (data.priority !== undefined && (data.priority < 0 || data.priority > 4)) {
      errors.push('Priority must be between 0 and 4');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}