import { Issue, LinearClient } from '@linear/sdk';
import { IssueEntity } from '@molecules/entities/issue.entity';
import { UserService } from '@features/user/service';
import { WorkflowStateService } from '@features/workflow-state/service';
import { logger } from '@atoms/shared/logger';
import { NotFoundError } from '@atoms/types/common';
import { linearClient } from '@atoms/client/linear-client';

export interface BulkUpdateResult {
  updated: Issue[];
  failed: Array<{
    identifier: string;
    error: string;
    issue?: Issue;
  }>;
  summary: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * Workflow for bulk operations across multiple issues and entities
 */
export class BulkOperationsWorkflow {
  private issueEntity: IssueEntity;
  private userService: UserService;
  private workflowStateService: WorkflowStateService;

  constructor(client?: LinearClient) {
    const actualClient = client || linearClient.getClient();
    this.issueEntity = new IssueEntity(actualClient);
    this.userService = new UserService(actualClient);
    this.workflowStateService = new WorkflowStateService(actualClient);
  }

  /**
   * Bulk assign issues to a user
   */
  async bulkAssign(issueIdentifiers: string[], assigneeEmail: string): Promise<BulkUpdateResult> {
    try {
      logger.info(`Bulk assigning ${issueIdentifiers.length} issues to ${assigneeEmail}`);

      // Resolve assignee
      const user = await this.userService.getByEmail(assigneeEmail);
      if (!user) {
        throw new NotFoundError('User', assigneeEmail);
      }

      const result: BulkUpdateResult = {
        updated: [],
        failed: [],
        summary: '',
        totalCount: issueIdentifiers.length,
        successCount: 0,
        failureCount: 0,
      };

      // Resolve all issue identifiers
      const resolvedIssues = await this.issueEntity.resolveIdentifiers(issueIdentifiers);

      // Process each issue
      for (const [identifier, issue] of resolvedIssues.entries()) {
        if (!issue) {
          result.failed.push({
            identifier,
            error: 'Issue not found',
          });
          result.failureCount++;
          continue;
        }

        try {
          const updated = await this.issueEntity.assignToUser(issue.id, user.id);
          result.updated.push(updated);
          result.successCount++;
        } catch (error: unknown) {
          result.failed.push({
            identifier,
            error: error instanceof Error ? error.message : 'Unknown error',
            issue,
          });
          result.failureCount++;
        }
      }

      const userName = user.displayName || user.name || 'User';
      result.summary = `Assigned ${result.successCount}/${result.totalCount} issues to ${userName}`;
      if (result.failureCount > 0) {
        result.summary += `. ${result.failureCount} failed.`;
      }

      return result;
    } catch (error) {
      logger.error('Bulk assign failed', error);
      throw error;
    }
  }

  /**
   * Move multiple issues to a new status
   */
  async moveToStatus(
    issueIdentifiers: string[],
    statusName: string,
    comment?: string,
  ): Promise<BulkUpdateResult> {
    try {
      logger.info(`Moving ${issueIdentifiers.length} issues to status: ${statusName}`);

      const result: BulkUpdateResult = {
        updated: [],
        failed: [],
        summary: '',
        totalCount: issueIdentifiers.length,
        successCount: 0,
        failureCount: 0,
      };

      // Resolve all issue identifiers
      const resolvedIssues = await this.issueEntity.resolveIdentifiers(issueIdentifiers);

      // Process each issue
      for (const [identifier, issue] of resolvedIssues.entries()) {
        if (!issue) {
          result.failed.push({
            identifier,
            error: 'Issue not found',
          });
          result.failureCount++;
          continue;
        }

        try {
          const updated = await this.issueEntity.moveToStatus(issue.id, statusName);
          result.updated.push(updated);
          result.successCount++;

          // Add comment if provided
          if (comment) {
            try {
              await this.issueEntity.addCommentToIssue(issue.id, comment);
            } catch (error) {
              logger.warn(`Failed to add comment to issue ${identifier}`, error);
            }
          }
        } catch (error: unknown) {
          result.failed.push({
            identifier,
            error: error instanceof Error ? error.message : 'Unknown error',
            issue,
          });
          result.failureCount++;
        }
      }

      result.summary = `Moved ${result.successCount}/${result.totalCount} issues to ${statusName}`;
      if (result.failureCount > 0) {
        result.summary += `. ${result.failureCount} failed.`;
      }

      return result;
    } catch (error) {
      logger.error('Failed to move issues to status', error);
      throw error;
    }
  }

  /**
   * Bulk update priority for multiple issues
   */
  async bulkUpdatePriority(
    issueIdentifiers: string[],
    priority: number,
  ): Promise<BulkUpdateResult> {
    try {
      logger.info(`Bulk updating priority for ${issueIdentifiers.length} issues to ${priority}`);

      if (priority < 0 || priority > 4) {
        throw new Error('Priority must be between 0 and 4');
      }

      const result: BulkUpdateResult = {
        updated: [],
        failed: [],
        summary: '',
        totalCount: issueIdentifiers.length,
        successCount: 0,
        failureCount: 0,
      };

      // Resolve all issue identifiers
      const resolvedIssues = await this.issueEntity.resolveIdentifiers(issueIdentifiers);

      // Process each issue
      for (const [identifier, issue] of resolvedIssues.entries()) {
        if (!issue) {
          result.failed.push({
            identifier,
            error: 'Issue not found',
          });
          result.failureCount++;
          continue;
        }

        try {
          const updated = await this.issueEntity.changePriority(issue.id, priority);
          result.updated.push(updated);
          result.successCount++;
        } catch (error: unknown) {
          result.failed.push({
            identifier,
            error: error instanceof Error ? error.message : 'Unknown error',
            issue,
          });
          result.failureCount++;
        }
      }

      const priorityNames = ['None', 'Urgent', 'High', 'Medium', 'Low'];
      result.summary = `Updated ${result.successCount}/${result.totalCount} issues to ${priorityNames[priority]} priority`;
      if (result.failureCount > 0) {
        result.summary += `. ${result.failureCount} failed.`;
      }

      return result;
    } catch (error) {
      logger.error('Bulk priority update failed', error);
      throw error;
    }
  }

  /**
   * Bulk add labels to multiple issues
   */
  async bulkAddLabels(issueIdentifiers: string[], labelIds: string[]): Promise<BulkUpdateResult> {
    try {
      logger.info(`Adding ${labelIds.length} labels to ${issueIdentifiers.length} issues`);

      const result: BulkUpdateResult = {
        updated: [],
        failed: [],
        summary: '',
        totalCount: issueIdentifiers.length,
        successCount: 0,
        failureCount: 0,
      };

      // Resolve all issue identifiers
      const resolvedIssues = await this.issueEntity.resolveIdentifiers(issueIdentifiers);

      // Process each issue
      for (const [identifier, issue] of resolvedIssues.entries()) {
        if (!issue) {
          result.failed.push({
            identifier,
            error: 'Issue not found',
          });
          result.failureCount++;
          continue;
        }

        try {
          const updated = await this.issueEntity.addLabels(issue.id, labelIds);
          result.updated.push(updated);
          result.successCount++;
        } catch (error: unknown) {
          result.failed.push({
            identifier,
            error: error instanceof Error ? error.message : 'Unknown error',
            issue,
          });
          result.failureCount++;
        }
      }

      result.summary = `Added labels to ${result.successCount}/${result.totalCount} issues`;
      if (result.failureCount > 0) {
        result.summary += `. ${result.failureCount} failed.`;
      }

      return result;
    } catch (error) {
      logger.error('Bulk add labels failed', error);
      throw error;
    }
  }
}
