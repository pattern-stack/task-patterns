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
 * IssueEntity provides convenient methods for issue operations.
 * 
 * Following pragmatic architecture principles:
 * - Handles SDK-natural operations (field updates, native methods)
 * - Provides convenience wrappers for common operations
 * - Complex validation and multi-step operations should use IssueRelationsWorkflow
 * 
 * This entity focuses on:
 * - CRUD operations for issues
 * - Managing comments (SDK native: createComment)
 * - Managing labels (SDK native: updating labelIds[])
 * - Assignment operations (SDK native: updating assigneeId)
 * - Sub-issue management
 * 
 * For complex operations use IssueRelationsWorkflow:
 * - Multi-entity validation
 * - Smart creation with team/user resolution
 * - Bulk operations with error handling
 */
export class IssueEntity {
  private issueService: IssueService;
  private commentService: CommentService;

  constructor(client?: LinearClient) {
    const actualClient = client || linearClient.getClient();
    this.issueService = new IssueService(actualClient);
    this.commentService = new CommentService(actualClient);
  }

  // ============================================
  // Core CRUD Operations
  // ============================================

  /**
   * Create an issue
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
   * Update an issue
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
    const nodes = connection.nodes;
    const pageInfo = connection.pageInfo;

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
  // Assignment Operations (SDK-natural: field updates)
  // ============================================

  /**
   * Assign an issue to a user
   * Simple field update - SDK handles naturally
   */
  async assignToUser(issueId: string, userId: string): Promise<LinearIssue> {
    logger.info(`Assigning issue ${issueId} to user ${userId}`);
    return await this.issueService.update(issueId, { assigneeId: userId });
  }

  /**
   * Unassign an issue
   * Simple field update - SDK handles naturally
   */
  async unassign(issueId: string): Promise<LinearIssue> {
    logger.info(`Unassigning issue ${issueId}`);
    return await this.issueService.update(issueId, { assigneeId: null });
  }

  // ============================================
  // Project & Priority Operations (SDK-natural: field updates)
  // ============================================

  /**
   * Move issue to a project
   * Simple field update - SDK handles naturally
   */
  async moveToProject(issueId: string, projectId: string): Promise<LinearIssue> {
    logger.info(`Moving issue ${issueId} to project ${projectId}`);
    return await this.issueService.update(issueId, { projectId });
  }

  /**
   * Change issue priority
   * Simple field update with basic validation
   */
  async changePriority(issueId: string, priority: number): Promise<LinearIssue> {
    if (priority < 0 || priority > 4) {
      throw new Error('Priority must be between 0 and 4');
    }
    logger.info(`Changing priority of issue ${issueId} to ${priority}`);
    return await this.issueService.update(issueId, { priority });
  }

  // ============================================
  // Label Management (SDK-natural: updating labelIds[])
  // ============================================

  /**
   * Add labels to an issue
   * Simple field update - SDK handles naturally
   */
  async addLabels(issueId: string, labelIds: string[]): Promise<LinearIssue> {
    logger.info(`Adding ${labelIds.length} labels to issue ${issueId}`);
    return await this.issueService.addLabels(issueId, labelIds);
  }

  /**
   * Remove labels from an issue
   * Simple field update - SDK handles naturally
   */
  async removeLabels(issueId: string, labelIds: string[]): Promise<LinearIssue> {
    logger.info(`Removing ${labelIds.length} labels from issue ${issueId}`);
    return await this.issueService.removeLabels(issueId, labelIds);
  }

  // ============================================
  // Comment Management (SDK-natural: createComment)
  // ============================================

  /**
   * Add a comment to an issue
   * SDK native operation
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
}