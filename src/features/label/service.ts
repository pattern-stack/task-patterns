import {
  IssueLabel,
  IssueLabelConnection,
  Issue,
  IssueConnection,
  LinearDocument,
} from '@linear/sdk';

type LabelCreateInput = LinearDocument.IssueLabelCreateInput;
type LabelUpdateInput = LinearDocument.IssueLabelUpdateInput;
type LinearLabelFilter = LinearDocument.IssueLabelFilter;

import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import {
  NotFoundError,
  ValidationError,
  BatchOperationResult,
  Pagination,
} from '@atoms/types/common';
import {
  LabelCreate,
  LabelUpdate,
  LabelFilter,
  LabelCreateSchema,
  LabelUpdateSchema,
  BulkLabelOperationSchema,
} from './schemas';

export class LabelService {
  private client = linearClient.getClient();

  async create(data: LabelCreate): Promise<IssueLabel> {
    try {
      // Validate input
      const validatedData = LabelCreateSchema.parse(data);

      logger.debug('Creating label', validatedData);

      const input: LabelCreateInput = {
        name: validatedData.name,
        color: validatedData.color,
        description: validatedData.description,
        teamId: validatedData.teamId,
        parentId: validatedData.parentId,
      };

      const payload = await this.client.createIssueLabel(input);

      if (!payload.success || !payload.issueLabel) {
        throw new ValidationError('Failed to create label');
      }

      const label = await payload.issueLabel;
      logger.success(`Label created: ${label.name}`);

      return label;
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Handle Zod validation errors
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        const zodError = error as unknown as { message: string };
        throw new ValidationError(`Validation failed: ${zodError.message}`);
      }
      logger.error('Failed to create label', error);
      throw error;
    }
  }

  async get(id: string): Promise<IssueLabel | null> {
    try {
      logger.debug(`Fetching label: ${id}`);
      const label = await this.client.issueLabel(id);
      return label;
    } catch (error) {
      logger.debug(`Label not found: ${id}`);
      return null;
    }
  }

  async getByName(name: string, teamId?: string): Promise<IssueLabel | null> {
    try {
      logger.debug(`Fetching label by name: ${name}`, { teamId });

      const filter: Record<string, unknown> = {
        name: { eq: name },
      };

      if (teamId === undefined) {
        // Workspace label - no team filter
        filter.team = null;
      } else {
        // Team-specific label
        filter.team = { id: { eq: teamId } };
      }

      const labels = await this.client.issueLabels({
        filter,
        first: 1,
      });

      const nodes = await labels.nodes;
      return nodes.length > 0 ? nodes[0] : null;
    } catch (error) {
      logger.debug(`Label not found: ${name}`);
      return null;
    }
  }

  async update(id: string, data: LabelUpdate): Promise<IssueLabel> {
    try {
      // Validate input
      const validatedData = LabelUpdateSchema.parse(data);

      logger.debug(`Updating label: ${id}`, validatedData);

      const label = await this.get(id);
      if (!label) {
        throw new NotFoundError('Label', id);
      }

      const input: LabelUpdateInput = {
        name: validatedData.name,
        color: validatedData.color,
        description: validatedData.description,
      };

      const payload = await this.client.updateIssueLabel(id, input);

      if (!payload.success || !payload.issueLabel) {
        throw new ValidationError('Failed to update label');
      }

      const updatedLabel = await payload.issueLabel;
      logger.success(`Label updated: ${updatedLabel.name}`);

      return updatedLabel;
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      // Handle Zod validation errors
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        const zodError = error as unknown as { message: string };
        throw new ValidationError(`Validation failed: ${zodError.message}`);
      }
      logger.error(`Failed to update label ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      logger.debug(`Deleting label: ${id}`);

      const label = await this.get(id);
      if (!label) {
        throw new NotFoundError('Label', id);
      }

      const payload = await this.client.deleteIssueLabel(id);

      if (!payload.success) {
        throw new ValidationError('Failed to delete label');
      }

      logger.success(`Label deleted: ${id}`);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to delete label ${id}`, error);
      throw error;
    }
  }

  async list(filter?: LabelFilter, pagination?: Pagination): Promise<IssueLabelConnection> {
    try {
      logger.debug('Listing labels', { filter, pagination });

      const linearFilter: LinearLabelFilter = {};

      if (filter) {
        if (filter.teamId === null) {
          // Workspace labels only
          linearFilter.team = null;
        } else if (filter.teamId) {
          // Team-specific labels
          linearFilter.team = { id: { eq: filter.teamId } };
        }

        if (filter.searchQuery) {
          linearFilter.name = { contains: filter.searchQuery };
        }
      }

      const labels = await this.client.issueLabels({
        filter: linearFilter,
        includeArchived: filter?.includeArchived,
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return labels;
    } catch (error) {
      logger.error('Failed to list labels', error);
      throw error;
    }
  }

  async listByTeam(teamId: string): Promise<IssueLabelConnection> {
    try {
      logger.debug(`Listing labels for team: ${teamId}`);

      const labels = await this.client.issueLabels({
        filter: {
          team: { id: { eq: teamId } },
        },
        includeArchived: false,
      });

      return labels;
    } catch (error) {
      logger.error(`Failed to list labels for team ${teamId}`, error);
      throw error;
    }
  }

  async addToIssue(issueId: string, labelId: string): Promise<Issue> {
    try {
      logger.debug(`Adding label ${labelId} to issue ${issueId}`);

      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new NotFoundError('Issue', issueId);
      }

      const currentLabelIds = (await issue.labels()).nodes.map((l) => l.id);
      const newLabelIds = [...new Set([...currentLabelIds, labelId])];

      const payload = await this.client.updateIssue(issueId, {
        labelIds: newLabelIds,
      });

      if (!payload.success || !payload.issue) {
        throw new ValidationError('Failed to add label to issue');
      }

      const updatedIssue = await payload.issue;
      logger.success(`Label added to issue ${issueId}`);

      return updatedIssue;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      // Handle issue not found errors from Linear client
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        (error as any).message === 'Not found'
      ) {
        throw new NotFoundError('Issue', issueId);
      }
      logger.error(`Failed to add label to issue ${issueId}`, error);
      throw error;
    }
  }

  async removeFromIssue(issueId: string, labelId: string): Promise<Issue> {
    try {
      logger.debug(`Removing label ${labelId} from issue ${issueId}`);

      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new NotFoundError('Issue', issueId);
      }

      const currentLabelIds = (await issue.labels()).nodes.map((l) => l.id);
      const newLabelIds = currentLabelIds.filter((id) => id !== labelId);

      const payload = await this.client.updateIssue(issueId, {
        labelIds: newLabelIds,
      });

      if (!payload.success || !payload.issue) {
        throw new ValidationError('Failed to remove label from issue');
      }

      const updatedIssue = await payload.issue;
      logger.success(`Label removed from issue ${issueId}`);

      return updatedIssue;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      // Handle issue not found errors from Linear client
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        (error as any).message === 'Not found'
      ) {
        throw new NotFoundError('Issue', issueId);
      }
      logger.error(`Failed to remove label from issue ${issueId}`, error);
      throw error;
    }
  }

  async getIssues(labelId: string, pagination?: Pagination): Promise<IssueConnection> {
    try {
      logger.debug(`Getting issues for label: ${labelId}`);

      const issues = await this.client.issues({
        filter: {
          labels: {
            some: {
              id: { eq: labelId },
            },
          },
        },
        first: pagination?.first,
        after: pagination?.after,
      });

      return issues;
    } catch (error) {
      logger.error(`Failed to get issues for label ${labelId}`, error);
      throw error;
    }
  }

  async bulkAddToIssues(issueIds: string[], labelId: string): Promise<BatchOperationResult<Issue>> {
    try {
      // Validate input
      const validatedData = BulkLabelOperationSchema.parse({ issueIds, labelId });

      const results: BatchOperationResult<Issue> = {
        success: false,
        succeeded: [],
        failed: [],
        totalCount: validatedData.issueIds.length,
        successCount: 0,
        failureCount: 0,
      };

      for (const issueId of validatedData.issueIds) {
        try {
          const updated = await this.addToIssue(issueId, validatedData.labelId);
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

      logger.info(
        `Bulk add label completed: ${results.successCount}/${results.totalCount} succeeded`,
      );

      return results;
    } catch (error: unknown) {
      // Handle Zod validation errors
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        const zodError = error as unknown as { message: string };
        throw new ValidationError(`Validation failed: ${zodError.message}`);
      }
      throw error;
    }
  }

  async mergeLabels(sourceId: string, targetId: string): Promise<IssueLabel> {
    try {
      logger.debug(`Merging label ${sourceId} into ${targetId}`);

      // Verify both labels exist
      const sourceLabel = await this.get(sourceId);
      if (!sourceLabel) {
        throw new NotFoundError('Label', sourceId);
      }

      const targetLabel = await this.get(targetId);
      if (!targetLabel) {
        throw new NotFoundError('Label', targetId);
      }

      // Get all issues with the source label
      const issuesWithSourceLabel = await this.getIssues(sourceId);
      const issues = await issuesWithSourceLabel.nodes;

      // Add target label to all issues that have source label
      for (const issue of issues) {
        try {
          await this.addToIssue(issue.id, targetId);
        } catch (error) {
          logger.warn(`Failed to add target label to issue ${issue.id}`, error);
        }
      }

      // Delete the source label
      await this.delete(sourceId);

      logger.success(`Labels merged: ${sourceLabel.name} -> ${targetLabel.name}`);
      return targetLabel;
    } catch (error) {
      logger.error(`Failed to merge labels ${sourceId} -> ${targetId}`, error);
      throw error;
    }
  }
}
