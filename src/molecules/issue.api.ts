import type { LinearClient } from '@linear/sdk';
import { IssueEntity } from './entities/issue.entity';
import { BulkOperationsWorkflow } from './workflows/bulk-operations.workflow';
import { SmartSearchWorkflow } from './workflows/smart-search.workflow';
import { IssueRelationsWorkflow, QuickCreateOptions } from './workflows/issue-relations.workflow';
import { IssueService } from '@features/issue/service';
import { TeamService } from '@features/team/service';
import { IssueCreate, IssueUpdate, IssueFilter } from '@features/issue/schemas';
import { CommentService } from '@features/comment/service';
import { logger } from '@atoms/shared/logger';

/**
 * Template definitions for common issue types
 */
interface IssueTemplate {
  title?: string;
  description?: string;
  priority?: 0 | 1 | 2 | 3 | 4;
  labels?: string[];
  estimate?: number;
}

const ISSUE_TEMPLATES: Record<string, IssueTemplate> = {
  bug: {
    description: `## Bug Description
[Describe the bug]

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Version: 
- OS: 
- Browser (if applicable): `,
    priority: 2,
    labels: ['bug']
  },
  feature: {
    description: `## Feature Request
[Describe the feature]

## Use Case
[Why is this needed?]

## Acceptance Criteria
- [ ] 
- [ ] 
- [ ] 

## Technical Notes
[Any technical considerations]`,
    priority: 1,
    labels: ['feature']
  },
  task: {
    description: `## Task Description
[What needs to be done]

## Acceptance Criteria
- [ ] 
- [ ] 
- [ ] 

## Notes
[Additional context]`,
    priority: 1,
    labels: ['task']
  },
  refactor: {
    description: `## Refactoring Goal
[What are we refactoring and why]

## Current State
[Describe current implementation]

## Proposed Changes
- 
- 
- 

## Testing Plan
[How will we verify the refactor]`,
    priority: 1,
    labels: ['refactor']
  }
};

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
    return this.relationsWorkflow.quickCreate(title, teamKey, options);
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
    
    // Fix the options type - IssueEntity.list expects 'first' to be required if provided
    const pagination = options ? { first: options.first || 50 } : undefined;
    return this.issueEntity.list(filter, pagination);
  }

  /**
   * Resolve an identifier to an issue
   */
  async resolveIdentifier(identifier: string) {
    // IssueEntity doesn't have resolveIdentifier, use getByIdentifier instead
    return this.issueEntity.getByIdentifier(identifier);
  }

  // ==================== Relationship Operations ====================

  /**
   * Assign issue to a user (by ID or email)
   */
  async assignToUser(issueId: string, userIdOrEmail: string) {
    // Check if it's an email and needs user resolution
    if (userIdOrEmail.includes('@')) {
      // Use relationsWorkflow to create with user resolution
      const user = await this.client.users({ filter: { email: { eq: userIdOrEmail } } });
      const userNode = user.nodes[0];
      if (!userNode) {
        throw new Error(`User not found with email: ${userIdOrEmail}`);
      }
      return this.issueEntity.assignToUser(issueId, userNode.id);
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
   * Update issue priority (alias for changePriority)
   */
  async updatePriority(issueId: string, priority: 0 | 1 | 2 | 3 | 4) {
    return this.changePriority(issueId, priority);
  }

  /**
   * Update issue status by name
   * @param issueId - Issue ID or identifier
   * @param statusName - Name of the status (e.g., "In Progress", "Done")
   */
  async updateStatus(issueId: string, statusName: string) {
    // First get the issue to find its team
    const issue = await this.issueEntity.get(issueId) || await this.issueEntity.getByIdentifier(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    const team = await issue.team;
    if (!team) {
      throw new Error('Issue has no team');
    }

    // Get workflow states for the team
    const states = await team.states();
    const targetState = states.nodes.find(s => s.name === statusName);
    
    if (!targetState) {
      throw new Error(`Status '${statusName}' not found for team ${team.key}`);
    }

    // Update the issue with the new state
    return this.issueEntity.update(issue.id, { stateId: targetState.id });
  }

  /**
   * Update issue description
   * @param issueId - Issue ID or identifier
   * @param description - New description content
   */
  async updateDescription(issueId: string, description: string) {
    // Resolve identifier if needed
    const issue = await this.issueEntity.get(issueId) || await this.issueEntity.getByIdentifier(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }
    
    return this.issueEntity.update(issue.id, { description });
  }

  /**
   * Update issue with full data object
   * @param issueId - Issue ID or identifier
   * @param data - Update data matching IssueUpdate schema
   */
  async updateIssue(issueId: string, data: IssueUpdate) {
    // Resolve identifier if needed
    const issue = await this.issueEntity.get(issueId) || await this.issueEntity.getByIdentifier(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }
    
    return this.issueEntity.update(issue.id, data);
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
    // IssueEntity only has addComment, not addCommentToIssue
    return this.issueEntity.addComment(issueId, body);
  }

  /**
   * Create an issue from a predefined template
   * @param templateName - Name of the template (bug, feature, task, refactor)
   * @param teamKey - Team key where issue will be created
   * @param data - Override/additional data for the issue
   * @returns Created issue
   */
  async createWithTemplate(
    templateName: string, 
    teamKey: string,
    data: Partial<IssueCreate> & { title: string }
  ) {
    const template = ISSUE_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found. Available templates: ${Object.keys(ISSUE_TEMPLATES).join(', ')}`);
    }

    // Merge template with provided data
    // Resolve team first to get teamId
    const teamId = await this.teamService.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const issueData: IssueCreate = {
      ...template,
      ...data,
      title: data.title,
      teamId,
      // Merge description if both exist
      description: data.description || template.description,
      // Merge labels if both exist
      labelIds: [...(template.labels || []), ...(data.labelIds || [])]
    };

    logger.info(`Creating issue from template '${templateName}' for team ${teamKey}`);
    
    // Use issueEntity.create directly since we already have teamId
    return this.issueEntity.create(issueData);
  }

  /**
   * Get available templates
   * @returns List of available template names and their descriptions
   */
  static getAvailableTemplates() {
    return Object.keys(ISSUE_TEMPLATES).map(name => ({
      name,
      template: ISSUE_TEMPLATES[name]
    }));
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
    // BulkOperationsWorkflow doesn't have bulkArchive, use the base method
    const results = await Promise.allSettled(
      identifiers.map(async (id) => {
        const issue = await this.issueEntity.getByIdentifier(id);
        if (issue) {
          await issue.archive();
          return { id, success: true };
        }
        return { id, success: false, error: 'Issue not found' };
      })
    );
    
    const updated = results.filter(r => r.status === 'fulfilled' && r.value.success).map(r => (r as any).value.id);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).map(r => (r as any).value?.id || 'unknown');
    
    return {
      updated,
      failed,
      summary: `Archived ${updated.length} issues, ${failed.length} failed`,
      totalCount: identifiers.length,
      successCount: updated.length,
      failureCount: failed.length
    };
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
    // SmartSearchWorkflow doesn't have searchWithFilters, use the search method with empty query
    return this.searchWorkflow.search('', { ...filters, limit: options?.limit });
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
    // Resolve team first
    const teamId = await this.teamService.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    // Build the full data object
    const issueData: IssueCreate = {
      title,
      teamId,
      description: options?.description,
      priority: options?.priority,
      labelIds: options?.labels,
      // TODO: Resolve assigneeEmail and projectName if provided
    };

    return this.relationsWorkflow.createWithValidation(issueData);
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
      commentCount: comments.nodes.length,
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