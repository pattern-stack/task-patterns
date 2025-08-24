import { Issue, IssueConnection, LinearDocument } from '@linear/sdk';

type IssueCreateInput = LinearDocument.IssueCreateInput;
type IssueUpdateInput = LinearDocument.IssueUpdateInput;
type LinearIssueFilter = LinearDocument.IssueFilter;
import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import {
  NotFoundError,
  ValidationError,
  BatchOperationResult,
  Pagination,
} from '@atoms/types/common';
import { IssueCreate, IssueUpdate, IssueFilter, IssueBulkUpdate } from './schemas';

export class IssueService {
  private client = linearClient.getClient();

  async create(data: IssueCreate): Promise<Issue> {
    try {
      logger.debug('Creating issue', data);

      const input: IssueCreateInput = {
        title: data.title,
        description: data.description,
        teamId: data.teamId,
        assigneeId: data.assigneeId,
        priority: data.priority,
        estimate: data.estimate,
        labelIds: data.labelIds,
        projectId: data.projectId,
        cycleId: data.cycleId,
        parentId: data.parentId,
        dueDate: data.dueDate,
      };

      const payload = await this.client.createIssue(input);

      if (!payload.success || !payload.issue) {
        throw new ValidationError('Failed to create issue');
      }

      const issue = await payload.issue;
      logger.success(`Issue created: ${issue.identifier}`);

      return issue;
    } catch (error) {
      logger.error('Failed to create issue', error);
      throw error;
    }
  }

  async get(id: string): Promise<Issue | null> {
    try {
      logger.debug(`Fetching issue: ${id}`);
      const issue = await this.client.issue(id);
      return issue;
    } catch (error) {
      logger.debug(`Issue not found: ${id}`);
      return null;
    }
  }

  async getByIdentifier(identifier: string): Promise<Issue | null> {
    try {
      logger.debug(`Fetching issue by identifier: ${identifier}`);

      const issues = await this.client.issues({
        filter: {
          searchableContent: { contains: identifier },
        },
        first: 1,
      });

      const nodes = await issues.nodes;
      if (nodes.length === 0) {
        return null;
      }

      const issue = nodes.find((i) => i.identifier === identifier);
      return issue || null;
    } catch (error) {
      logger.debug(`Issue not found: ${identifier}`);
      return null;
    }
  }

  async update(id: string, data: IssueUpdate): Promise<Issue> {
    try {
      logger.debug(`Updating issue: ${id}`, data);

      const issue = await this.get(id);
      if (!issue) {
        throw new NotFoundError('Issue', id);
      }

      const input: IssueUpdateInput = {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        priority: data.priority,
        estimate: data.estimate,
        labelIds: data.labelIds,
        projectId: data.projectId,
        cycleId: data.cycleId,
        parentId: data.parentId,
        dueDate: data.dueDate,
        stateId: data.stateId,
      };

      const payload = await this.client.updateIssue(id, input);

      if (!payload.success || !payload.issue) {
        throw new ValidationError('Failed to update issue');
      }

      const updatedIssue = await payload.issue;
      logger.success(`Issue updated: ${updatedIssue.identifier}`);

      return updatedIssue;
    } catch (error) {
      logger.error(`Failed to update issue ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      logger.debug(`Deleting issue: ${id}`);

      const issue = await this.get(id);
      if (!issue) {
        throw new NotFoundError('Issue', id);
      }

      const payload = await this.client.deleteIssue(id);

      if (!payload.success) {
        throw new ValidationError('Failed to delete issue');
      }

      logger.success(`Issue deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete issue ${id}`, error);
      throw error;
    }
  }

  async archive(id: string): Promise<boolean> {
    try {
      logger.debug(`Archiving issue: ${id}`);

      const issue = await this.get(id);
      if (!issue) {
        throw new NotFoundError('Issue', id);
      }

      const payload = await this.client.archiveIssue(id);

      if (!payload.success) {
        throw new ValidationError('Failed to archive issue');
      }

      logger.success(`Issue archived: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to archive issue ${id}`, error);
      throw error;
    }
  }

  async list(filter?: IssueFilter, pagination?: Pagination): Promise<IssueConnection> {
    try {
      logger.debug('Listing issues', { filter, pagination });

      const linearFilter: LinearIssueFilter = {};

      if (filter) {
        if (filter.teamId) {
          linearFilter.team = { id: { eq: filter.teamId } };
        }
        if (filter.assigneeId) {
          linearFilter.assignee = { id: { eq: filter.assigneeId } };
        }
        if (filter.creatorId) {
          linearFilter.creator = { id: { eq: filter.creatorId } };
        }
        if (filter.projectId) {
          linearFilter.project = { id: { eq: filter.projectId } };
        }
        if (filter.cycleId) {
          linearFilter.cycle = { id: { eq: filter.cycleId } };
        }
        if (filter.priority !== undefined) {
          linearFilter.priority = { eq: filter.priority };
        }
        if (filter.state) {
          linearFilter.state = { type: { eq: filter.state } };
        }
        if (filter.searchQuery) {
          linearFilter.searchableContent = { contains: filter.searchQuery };
        }
      }

      const issues = await this.client.issues({
        filter: linearFilter,
        includeArchived: filter?.includeArchived,
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return issues;
    } catch (error) {
      logger.error('Failed to list issues', error);
      throw error;
    }
  }

  async bulkUpdate(data: IssueBulkUpdate): Promise<BatchOperationResult<Issue>> {
    const results: BatchOperationResult<Issue> = {
      success: false,
      succeeded: [],
      failed: [],
      totalCount: data.issueIds.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const issueId of data.issueIds) {
      try {
        const updated = await this.update(issueId, data.update);
        results.succeeded.push(updated);
        results.successCount++;
      } catch (error: unknown) {
        results.failed.push({
          item: issueId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.failureCount++;
      }
    }

    results.success = results.failureCount === 0;

    logger.info(`Bulk update completed: ${results.successCount}/${results.totalCount} succeeded`);

    return results;
  }

  async addComment(issueId: string, body: string): Promise<boolean> {
    try {
      logger.debug(`Adding comment to issue ${issueId}`);

      const payload = await this.client.createComment({
        issueId,
        body,
      });

      if (!payload.success) {
        throw new ValidationError('Failed to add comment');
      }

      logger.success('Comment added');
      return true;
    } catch (error) {
      logger.error(`Failed to add comment to issue ${issueId}`, error);
      throw error;
    }
  }

  async addLabels(issueId: string, labelIds: string[]): Promise<Issue> {
    try {
      const issue = await this.get(issueId);
      if (!issue) {
        throw new NotFoundError('Issue', issueId);
      }

      const currentLabelIds = (await issue.labels()).nodes.map((l) => l.id);
      const newLabelIds = [...new Set([...currentLabelIds, ...labelIds])];

      return await this.update(issueId, { labelIds: newLabelIds });
    } catch (error) {
      logger.error(`Failed to add labels to issue ${issueId}`, error);
      throw error;
    }
  }

  async removeLabels(issueId: string, labelIds: string[]): Promise<Issue> {
    try {
      const issue = await this.get(issueId);
      if (!issue) {
        throw new NotFoundError('Issue', issueId);
      }

      const currentLabelIds = (await issue.labels()).nodes.map((l) => l.id);
      const newLabelIds = currentLabelIds.filter((id) => !labelIds.includes(id));

      return await this.update(issueId, { labelIds: newLabelIds });
    } catch (error) {
      logger.error(`Failed to remove labels from issue ${issueId}`, error);
      throw error;
    }
  }
}
