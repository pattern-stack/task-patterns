import {
  Issue as LinearIssue,
  Comment,
  Attachment,
  User,
  Team,
  Project,
  IssueLabel,
  LinearClient,
} from '@linear/sdk';
import { IssueService } from '@features/issue/service';
import { CommentService } from '@features/comment/service';
import { IssueCreate, IssueUpdate, IssueFilter, IssueBulkUpdate } from '@features/issue/schemas';
import { CommentCreate } from '@features/comment/schemas';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, Pagination } from '@atoms/types/common';
import { linearClient } from '@atoms/client/linear-client';

export interface IssueWithRelations {
  issue: LinearIssue;
  team?: Team;
  project?: Project;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  labels?: IssueLabel[];
}

/**
 * IssueEntity handles pure issue operations and issue-owned relationships.
 * 
 * This entity focuses on:
 * - CRUD operations for issues
 * - Managing comments (issues own comments)
 * - Managing labels (through issue service)
 * - Fetching issue relations
 * 
 * For cross-entity operations like validation, assignment, or team resolution,
 * use IssueRelationsWorkflow instead.
 */
export class IssueEntity {
  private issueService: IssueService;
  private commentService: CommentService;

  constructor(client?: LinearClient) {
    const actualClient = client || linearClient.getClient();
    this.issueService = new IssueService(actualClient);
    this.commentService = new CommentService(actualClient);
  }

  /**
   * Create an issue without validation
   * For validated creation, use IssueRelationsWorkflow.createWithValidation
   */
  async create(data: IssueCreate): Promise<LinearIssue> {
    logger.info(`Creating issue: ${data.title}`);
    return await this.issueService.create(data);
  }

  /**
   * Get an issue by ID
   */
  async get(id: string): Promise<LinearIssue | null> {
    return await this.issueService.get(id);
  }

  /**
   * Get an issue by identifier (e.g., "ENG-123")
   */
  async getByIdentifier(identifier: string): Promise<LinearIssue | null> {
    return await this.issueService.getByIdentifier(identifier);
  }

  /**
   * Get an issue with all its relations
   */
  async getWithRelations(id: string): Promise<IssueWithRelations | null> {
    const issue = await this.issueService.get(id);
    if (!issue) {
      return null;
    }

    const [team, assignee, comments, attachments, labels] = await Promise.all([
      issue.team,
      issue.assignee,
      issue.comments(),
      issue.attachments(),
      issue.labels(),
    ]);

    let project: Project | undefined = undefined;
    if (issue.project) {
      project = await issue.project;
    }

    return {
      issue,
      team,
      project,
      assignee,
      comments: comments.nodes,
      attachments: attachments.nodes,
      labels: labels.nodes,
    };
  }

  /**
   * Update an issue without validation
   * For validated updates, use IssueRelationsWorkflow
   */
  async update(id: string, data: IssueUpdate): Promise<LinearIssue> {
    logger.info(`Updating issue: ${id}`);
    return await this.issueService.update(id, data);
  }

  /**
   * Delete an issue
   */
  async delete(id: string): Promise<boolean> {
    logger.info(`Deleting issue: ${id}`);
    return await this.issueService.delete(id);
  }

  /**
   * Archive an issue
   */
  async archive(id: string): Promise<boolean> {
    logger.info(`Archiving issue: ${id}`);
    return await this.issueService.archive(id);
  }

  /**
   * List issues with filters
   */
  async list(filter?: IssueFilter, pagination?: Pagination) {
    const connection = await this.issueService.list(filter, pagination);
    const nodes = await connection.nodes;
    const pageInfo = await connection.pageInfo;

    return {
      issues: nodes,
      pageInfo,
      totalCount: nodes.length,
    };
  }

  /**
   * Bulk update multiple issues
   */
  async bulkUpdate(data: IssueBulkUpdate) {
    logger.info(`Bulk updating ${data.issueIds.length} issues`);
    return await this.issueService.bulkUpdate(data);
  }

  // ============================================
  // Comment Management (Issues own comments)
  // ============================================

  /**
   * Add a comment to an issue
   */
  async addComment(issueId: string, body: string): Promise<Comment> {
    logger.info(`Adding comment to issue: ${issueId}`);

    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    const commentData: CommentCreate = {
      issueId: issue.id,
      body,
    };

    return await this.commentService.create(commentData);
  }

  /**
   * Get comments for an issue
   */
  async getComments(issueId: string, pagination?: Pagination) {
    return await this.commentService.listByIssue(issueId, pagination);
  }

  /**
   * Delete a comment from an issue
   */
  async deleteComment(commentId: string): Promise<boolean> {
    return await this.commentService.delete(commentId);
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, body: string): Promise<Comment> {
    return await this.commentService.update(commentId, { body });
  }

  // ============================================
  // Label Management (delegated to IssueService)
  // ============================================

  /**
   * Add labels to an issue
   */
  async addLabels(issueId: string, labelIds: string[]): Promise<LinearIssue> {
    return await this.issueService.addLabels(issueId, labelIds);
  }

  /**
   * Remove labels from an issue
   */
  async removeLabels(issueId: string, labelIds: string[]): Promise<LinearIssue> {
    return await this.issueService.removeLabels(issueId, labelIds);
  }

  // ============================================
  // Sub-issue Management
  // ============================================

  /**
   * Get sub-issues of an issue
   */
  async getSubIssues(issueId: string) {
    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    const children = await issue.children();
    return children.nodes;
  }

  /**
   * Create a sub-issue
   * Note: For validated creation with team resolution, use IssueRelationsWorkflow.createSubIssue
   */
  async createSubIssue(parentId: string, data: IssueCreate): Promise<LinearIssue> {
    const parent = await this.issueService.get(parentId);
    if (!parent) {
      throw new NotFoundError('Parent issue', parentId);
    }

    // If teamId not provided, inherit from parent
    let teamId = data.teamId;
    if (!teamId && parent.team) {
      const parentTeam = await parent.team;
      teamId = parentTeam.id;
    }

    const subIssueData: IssueCreate = {
      ...data,
      parentId,
      teamId: teamId!,
    };

    return await this.issueService.create(subIssueData);
  }

  // ============================================
  // Deprecated Methods (for backward compatibility)
  // Use IssueRelationsWorkflow instead
  // ============================================

  /**
   * @deprecated Use IssueRelationsWorkflow.moveToProject instead
   */
  async moveToProject(issueId: string, projectId: string): Promise<LinearIssue> {
    logger.warn('IssueEntity.moveToProject is deprecated. Use IssueRelationsWorkflow.moveToProject');
    return await this.issueService.update(issueId, { projectId });
  }

  /**
   * @deprecated Use IssueRelationsWorkflow.assignToUser instead
   */
  async assignToUser(issueId: string, userId: string): Promise<LinearIssue> {
    logger.warn('IssueEntity.assignToUser is deprecated. Use IssueRelationsWorkflow.assignToUser');
    return await this.issueService.update(issueId, { assigneeId: userId });
  }

  /**
   * @deprecated Use IssueRelationsWorkflow.unassign instead
   */
  async unassign(issueId: string): Promise<LinearIssue> {
    logger.warn('IssueEntity.unassign is deprecated. Use IssueRelationsWorkflow.unassign');
    return await this.issueService.update(issueId, { assigneeId: null });
  }

  /**
   * @deprecated Use IssueRelationsWorkflow.changePriority instead
   */
  async changePriority(issueId: string, priority: number): Promise<LinearIssue> {
    logger.warn('IssueEntity.changePriority is deprecated. Use IssueRelationsWorkflow.changePriority');
    if (priority < 0 || priority > 4) {
      throw new Error('Priority must be between 0 and 4');
    }
    return await this.issueService.update(issueId, { priority });
  }
}